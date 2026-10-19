import { Suspense } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { supportedCurrencies } from "@/lib/currencies";
import { getUserSettings, requireUser } from "@/lib/users";
import { CurrencyPicker } from "./currency-picker";
import { RibbonHeader } from "./ribbon-header";
import { linkButtonClass } from "./styles";

// The header on signed-in pages: the user's currency, and Log out.
export function SiteHeader() {
  return (
    <RibbonHeader
      right={
        <div className="flex items-center gap-4">
          <Suspense fallback={<span aria-hidden className="skeleton block h-11 w-20 rounded-full" />}>
            <HeaderCurrency />
          </Suspense>
          <SignOutButton>
            <button type="button" className={linkButtonClass}>
              Log out
            </button>
          </SignOutButton>
        </div>
      }
    />
  );
}

// The user's currency, once onboarding has set it.
async function HeaderCurrency() {
  const userId = await requireUser();
  const { currency } = await getUserSettings(userId);
  if (!currency) return null;
  const options = await supportedCurrencies();
  return <CurrencyPicker value={currency} options={options.includes(currency) ? options : [...options, currency].sort()} />;
}
