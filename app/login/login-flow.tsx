"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { isClerkAPIResponseError } from "@clerk/nextjs/errors";
import { useSignIn, useSignUp } from "@clerk/nextjs/legacy";

type Stage = "start" | "waiting";

// One short line for the tag; the full error goes to the console.
function shortMessage(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const first = err.errors[0];
    // Clerk calls a mistyped address an "invalid identifier".
    if (first?.code?.includes("invalid") && /identifier|email/i.test(first.meta?.paramName ?? "")) {
      return "That's not an email address";
    }
  }
  return "Couldn't send - try again";
}

function isUnknownAccount(err: unknown): boolean {
  return (
    isClerkAPIResponseError(err) &&
    err.errors.some((e) => e.code === "form_identifier_not_found")
  );
}

export function LoginFlow() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const signInHook = useSignIn();
  const signUpHook = useSignUp();
  const loaded = signInHook.isLoaded && signUpHook.isLoaded;

  const [stage, setStage] = useState<Stage>("start");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  // Stops the current link's polling (used on resend, change of email, unmount).
  const cancelFlow = useRef<(() => void) | null>(null);
  // Bumped per attempt so a cancelled attempt can't move the screen on.
  const attempt = useRef(0);

  useEffect(() => () => cancelFlow.current?.(), []);

  // Opening the link in another tab of this browser signs this one in too.
  useEffect(() => {
    if (stage === "waiting" && isSignedIn) router.push("/");
  }, [stage, isSignedIn, router]);

  // Sends the link and waits (Clerk polls) until it's opened. Returns when the
  // link is used or the flow is cancelled; throws if sending fails.
  async function sendAndWait(address: string, id: number) {
    if (!signInHook.isLoaded || !signUpHook.isLoaded) return;
    const { signIn, setActive } = signInHook;
    const { signUp } = signUpHook;
    const verifyUrl = `${window.location.origin}/login/verify`;

    let sessionId: string | null = null;
    let expired = false;
    try {
      const attemptIn = await signIn.create({ identifier: address });
      const factor = attemptIn.supportedFirstFactors?.find((f) => f.strategy === "email_link");
      if (!factor || !("emailAddressId" in factor)) {
        throw new Error("Email links aren't switched on for sign-in.");
      }
      const flow = attemptIn.createEmailLinkFlow();
      cancelFlow.current = flow.cancelEmailLinkFlow;
      const result = await flow.startEmailLinkFlow({
        emailAddressId: factor.emailAddressId,
        redirectUrl: verifyUrl,
      });
      expired = result.firstFactorVerification.status === "expired";
      if (result.status === "complete") sessionId = result.createdSessionId;
    } catch (err) {
      if (!isUnknownAccount(err)) throw err;
      // New here: same link, same screens, via sign-up.
      await signUp.create({ emailAddress: address });
      const flow = signUp.createEmailLinkFlow();
      cancelFlow.current = flow.cancelEmailLinkFlow;
      const result = await flow.startEmailLinkFlow({ redirectUrl: verifyUrl });
      expired = result.verifications.emailAddress.status === "expired";
      if (result.status === "complete") sessionId = result.createdSessionId;
    }

    if (id !== attempt.current) return; // superseded by a resend or new email
    if (expired) {
      setStage("start");
      setError("That link's expired");
      return;
    }
    // This tab moves on by itself once the link is opened anywhere.
    if (sessionId) {
      await setActive({ session: sessionId });
      router.push("/");
    }
  }

  async function begin(address: string) {
    cancelFlow.current?.();
    const id = ++attempt.current;
    try {
      await sendAndWait(address, id);
    } catch (err) {
      if (id !== attempt.current) return;
      console.error("Sending the sign-in link failed", err);
      setStage("start");
      setError(shortMessage(err));
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    const address = email.trim();
    if (!address || !loaded) return;
    setError(null);
    // Straight to the waiting screen; the link goes out in the background.
    setStage("waiting");
    void begin(address);
  }

  async function resend() {
    setResending(true);
    setError(null);
    void begin(email.trim());
    // Give the new request a moment before re-enabling the button.
    setTimeout(() => setResending(false), 2000);
  }

  function useDifferentEmail() {
    cancelFlow.current?.();
    attempt.current++;
    setError(null);
    setStage("start");
  }

  // Sized in tag units (see .gift-tag-anchor): the tag is 134 x 96.
  if (stage === "waiting") {
    return (
      <div className="flex flex-col items-start gap-[3px]">
        <h2 className="font-display text-[14px] leading-[16px] text-deep-red">Check your email</h2>
        <button type="button" onClick={resend} disabled={resending} className="text-[11px] leading-[14px] text-ink underline">
          {resending ? "Sending…" : "Send it again"}
        </button>
        <button type="button" onClick={useDifferentEmail} className="text-[11px] leading-[14px] text-ink underline">
          Use another email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-[96px] flex-col gap-[4px]">
      <h1 className="font-display text-[16px] leading-[18px] text-deep-red">Giftbook</h1>
      <label className="gift-tag-input-box block">
        <span className="sr-only">Email</span>
        <input
          type="email"
          autoComplete="email"
          required
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="gift-tag-input"
        />
      </label>
      {error && (
        <p role="alert" title={error} className="truncate text-[9px] leading-[11px] text-deep-red">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!loaded || !email.trim()}
        className="h-[22px] w-full bg-ribbon text-[11px] text-gold-light hover:bg-deep-red disabled:opacity-60"
      >
        Open
      </button>
    </form>
  );
}
