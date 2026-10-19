import { auth } from "@clerk/nextjs/server";
import { get } from "@vercel/blob";
import { errorResponse, fail } from "@/lib/http";
import { getPhotoUrl } from "@/lib/people";

// Streams a person's photo from the private store, only to their owner. Each
// photo has its own URL (?v=), so the browser can keep it for good.
export async function GET(_req: Request, ctx: RouteContext<"/api/people/[id]/photo">) {
  try {
    const { userId } = await auth();
    if (!userId) return fail("Log in first.", 401);
    const { id } = await ctx.params;
    const photo = await getPhotoUrl(id, userId);
    if (!photo?.url) return fail("No photo.", 404);
    const blob = await get(photo.url, { access: "private" });
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
