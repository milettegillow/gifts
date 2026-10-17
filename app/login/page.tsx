import { Suspense } from "react";
import { LoginFlow } from "./login-flow";

// Placeholder: one combined flow, new and returning people just enter their email.
export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-[400px] flex-col items-center gap-8 pt-10">
      <h1 className="font-display text-5xl text-deep-red">Gifts</h1>
      <div className="w-full">
        <Suspense>
          <LoginFlow />
        </Suspense>
      </div>
    </div>
  );
}
