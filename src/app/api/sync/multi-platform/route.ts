import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {},
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json().catch(() => ({}));
    const { platforms } = body;

    if (!platforms || typeof platforms !== "object") {
      return NextResponse.json({ error: "Invalid platform sync payload" }, { status: 400 });
    }

    const connectedPlatforms = Object.keys(platforms).filter((k) => platforms[k]?.connected);

    // If authenticated, save platform session credentials to user's profile metadata
    if (user) {
      await supabase
        .from("profiles")
        .update({
          leetcode_session: platforms.leetcode?.value || undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
    }

    return NextResponse.json({
      success: true,
      authenticated: !!user,
      connectedCount: connectedPlatforms.length,
      connectedPlatforms,
      message: `Successfully received session tokens for ${connectedPlatforms.length} active platforms.`,
    });
  } catch (err: any) {
    console.error("[multi-platform-sync API error]:", err);
    return NextResponse.json({ error: err.message || "Failed to process platform sync" }, { status: 500 });
  }
}
