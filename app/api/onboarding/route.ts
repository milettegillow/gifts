import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { currencyForCountry, isCountryCode } from "@/lib/countries";
import { pickCurrency, supportedCurrencies } from "@/lib/currencies";
import { errorResponse, fail } from "@/lib/http";
import { saveCountry } from "@/lib/users";

const OnboardingSchema = z.object({ country: z.string().refine(isCountryCode) });

// Saves the user's country and the currency that goes with it.
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const result = OnboardingSchema.safeParse(await request.json().catch(() => null));
    if (!result.success) return fail("Choose a country from the list.", 400);
    const { country } = result.data;
    const currency = pickCurrency(currencyForCountry(country), await supportedCurrencies());
    await saveCountry(userId, country, currency);
    return NextResponse.json({ country, currency });
  } catch (err) {
    return errorResponse("Couldn't save your country", err);
  }
}
