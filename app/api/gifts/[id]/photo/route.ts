import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { getGift } from "@/lib/gifts";
import { errorResponse, fail } from "@/lib/http";
import { isStoredImage } from "@/lib/photos";

// Streams a gift's stored photo (or video still) only to its owner.
export async function GET(_req: Request, ctx: RouteContext<"/api/gifts/[id]/photo">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const gift = await getGift(id, userId);
    if (!gift || !isStoredImage(gift.imageUrl)) return fail("No photo.", 404);
    const blob = await get(gift.imageUrl, { access: "private" });
    if (!blob || blob.statusCode !== 200) return fail("No photo.", 404);
    return new Response(blob.stream, {
      headers: {
        "Content-Type": blob.blob.contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return errorResponse("Couldn't load the photo", err);
  }
}
