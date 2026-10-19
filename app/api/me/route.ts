import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { supportedCurrencies } from "@/lib/currencies";
import { errorResponse, fail } from "@/lib/http";
import { saveCurrency } from "@/lib/users";

const SettingsSchema = z.object({ currency: z.string().regex(/^[A-Z]{3}$/) });

// Changes the user's currency.
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const result = SettingsSchema.safeParse(await request.json().catch(() => null));
    if (!result.success || !(await supportedCurrencies()).includes(result.data.currency)) {
      return fail("Choose a currency from the list.", 400);
    }
    await saveCurrency(userId, result.data.currency);
    return NextResponse.json({ currency: result.data.currency });
  } catch (err) {
    return errorResponse("Couldn't change your currency", err);
  }
}
