"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RibbonHeader } from "@/app/ui/ribbon-header";
import { buttonClass, linkButtonClass } from "@/app/ui/styles";

// Anything that goes wrong while rendering a page: one line, a way to try
// again and a way home. Details go to the console, never the page.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <>
      <RibbonHeader />
      <main className="mx-auto flex w-full max-w-[640px] flex-1 flex-col items-start gap-5 px-4 pb-12">
        <h1 className="font-display text-3xl text-deep-red">Something went wrong</h1>
        <div className="flex flex-wrap items-center gap-5">
          <button type="button" onClick={reset} className={buttonClass}>
            Try again
          </button>
          <Link href="/" className={linkButtonClass}>
            Back to Giftbook
          </Link>
        </div>
      </main>
    </>
  );
}
