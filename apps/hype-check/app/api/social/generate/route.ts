import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSocialPost } from "@/lib/social/generate-social-post";
import { GeneratePostSchema } from "@/lib/social/validation";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!(session?.user as { isAdmin?: boolean } | null)?.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = GeneratePostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const result = await generateSocialPost({
    videoId: parsed.data.videoId,
    platform: parsed.data.platform,
    campaign: parsed.data.campaign,
    templateId: parsed.data.templateId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(result.value, { status: 201 });
}
