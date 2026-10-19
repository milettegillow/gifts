import { Suspense } from "react";
import { headers } from "next/headers";
import { isCountryCode, listCountries } from "@/lib/countries";
import { listPeople } from "@/lib/people";
import { getUserSettings, requireUser } from "@/lib/users";
import { PeopleSkeleton } from "@/app/ui/skeletons";
import { Onboarding } from "./onboarding";
import { PeopleGrid } from "./people-grid";

export default function Home() {
  return (
    <Suspense fallback={<PeopleSkeleton />}>
      <People />
    </Suspense>
  );
}

// A first guess at the country: Vercel's IP lookup, else the browser language.
async function guessCountry(): Promise<string | null> {
  const h = await headers();
  const fromIp = h.get("x-vercel-ip-country")?.toUpperCase();
  if (isCountryCode(fromIp)) return fromIp;
  const fromLanguage = h.get("accept-language")?.match(/^[a-z]{2,3}-([a-z]{2})\b/i)?.[1]?.toUpperCase();
  return isCountryCode(fromLanguage) ? fromLanguage : null;
}

// Rendered per request for the signed-in user.
async function People() {
  const userId = await requireUser();
  const settings = await getUserSettings(userId);
  if (!settings.country) {
    return <Onboarding countries={listCountries()} initial={await guessCountry()} />;
  }
  const people = await listPeople(userId);
  return (
    <div className="flex flex-col gap-10 pt-4">
      <h1 className="sr-only">People</h1>
      <PeopleGrid people={people} />
    </div>
  );
}
