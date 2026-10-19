import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { errorResponse, fail } from "@/lib/http";
import { generateInsights, getInsights } from "@/lib/insights";
import { getPerson } from "@/lib/people";

// The hash the stored insights were made from, so the page can tell when a
// background refresh has finished.
export async function GET(_req: Request, ctx: RouteContext<"/api/people/[id]/insights">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    if (!(await getPerson(id, userId))) return fail("Person not found.", 404);
    const insights = await getInsights(id, userId);
    return NextResponse.json({ hash: insights?.sourceHash ?? null });
  } catch (err) {
    return errorResponse("Couldn't check", err);
  }
}

// "Refresh": work them out again now.
export async function POST(_req: Request, ctx: RouteContext<"/api/people/[id]/insights">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    if (!(await getPerson(id, userId))) return fail("Person not found.", 404);
    const result = await generateInsights(id, userId);
    if (result === "capped") return fail("Try again tomorrow", 429);
    if (result === "failed") return fail("Couldn't refresh. Try again.", 502);
    return NextResponse.json({ result });
  } catch (err) {
    return errorResponse("Couldn't refresh", err);
  }
}
