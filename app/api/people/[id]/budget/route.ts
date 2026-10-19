import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { errorResponse, fail } from "@/lib/http";
import { setBudget } from "@/lib/people";

// In the user's currency; null clears it.
const BudgetSchema = z.object({ amount: z.number().min(0).max(10_000_000).nullable() });

export async function PATCH(request: Request, ctx: RouteContext<"/api/people/[id]/budget">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const parsed = BudgetSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return fail("That budget doesn't look right.", 400);
    if (!(await setBudget(id, userId, parsed.data.amount))) return fail("Person not found.", 404);
    return NextResponse.json({ id, budget: parsed.data.amount });
  } catch (err) {
    return errorResponse("Couldn't save the budget", err);
  }
}
