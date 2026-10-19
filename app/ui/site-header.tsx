import { Suspense } from "react";
import { supportedCurrencies } from "@/lib/currencies";
import { getUserSettings, requireUser } from "@/lib/users";
import { CurrencyPicker } from "./currency-picker";
import { RibbonHeader } from "./ribbon-header";

// The header on signed-in pages, with the user's currency.
export function SiteHeader() {
  return (
    <RibbonHeader
      right={
        <Suspense fallback={<span aria-hidden className="skeleton block h-11 w-20" />}>
          <HeaderCurrency />
        </Suspense>
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
