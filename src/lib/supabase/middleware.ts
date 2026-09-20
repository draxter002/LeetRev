import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Defensive check: If environment variables are missing on the host environment,
  // do not throw an unhandled exception that crashes the routing middleware worker.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
      "[middleware] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables."
    );
    return NextResponse.next({ request });
  }

  try {
    // IMPORTANT: Do NOT use a variable for supabaseResponse inside setAll.
    // This must follow the exact Supabase SSR pattern to ensure cookies are
    // correctly forwarded between the middleware request and response.
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies on the request first
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Then recreate the response with the updated request headers
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          // And write them on the response too
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    // IMPORTANT: Do NOT remove auth.getUser() — it refreshes the session token
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const path = request.nextUrl.pathname;
    const isAuthPage = path === "/login";
    // Auth callback and API routes must not be blocked — the OAuth code
    // exchange happens inside /auth/callback; intercepting it here discards
    // the code before the route handler can run.
    const isAuthCallbackRoute = path.startsWith("/auth/");
    const isApiRoute = path.startsWith("/api/");

    if (!user && !isAuthPage && !isAuthCallbackRoute && !isApiRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (user && isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return response;
  } catch (err) {
    console.error("[middleware] Session update exception caught:", err);
    return NextResponse.next({ request });
  }
}
