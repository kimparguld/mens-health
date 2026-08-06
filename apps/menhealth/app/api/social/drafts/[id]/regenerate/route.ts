import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { regenerateSocialPost } from "@/lib/social/generate-social-post";
import { ApprovePostSchema } from "@/lib/social/validation";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  // ApprovePostSchema is just `{ postId: cuid }` — reused here purely to
  // validate the id shape, same as the approve route does.
  const parsedId = ApprovePostSchema.safeParse({ postId: id });
  if (!parsedId.success) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 422 });
  }

  const result = await regenerateSocialPost(id);
  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.value);
}
