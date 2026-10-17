import { Suspense } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { requireUser } from "@/lib/users";

export default function Home() {
  return (
    <div className="flex flex-col items-center gap-8 pt-6">
      <Suspense>
        <SignedIn />
      </Suspense>
    </div>
  );
}

// Rendered per request; creates the user's row on their first visit.
async function SignedIn() {
  await requireUser();
  return (
    <SignOutButton>
      <button type="button" className="text-ink underline">
        Log out
      </button>
    </SignOutButton>
  );
}
