import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_PATH = process.env.ADMIN_PATH || "nx-control";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let res = NextResponse.next({ request: req });

  const isAdmin = pathname.startsWith(`/${ADMIN_PATH}`);
  const isPortal = pathname.startsWith("/portal");

  // Fast path for public marketing pages — skip Supabase auth network roundtrips
  if (!isAdmin && !isPortal) {
    return res;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user ?? null;
  } catch {
    user = null;
  }

  // ---------- ADMIN ----------
  if (pathname.startsWith(`/${ADMIN_PATH}`)) {
    const isLoginPage = pathname === `/${ADMIN_PATH}/login`;

    if (!user) {
      return isLoginPage ? res : notFound(req);
    }

    // Enforce 24-hour admin session limit & 2-hour inactivity limit
    const loginAtStr = req.cookies.get("nx_admin_login_at")?.value;
    const lastActivityStr = req.cookies.get("nx_admin_last_activity")?.value;
    const now = Date.now();

    if (!loginAtStr) {
      if (!isLoginPage) {
        // If user is authenticated but has no session clock cookie, initialize 24-hour clock now
        res.cookies.set("nx_admin_login_at", now.toString(), {
          path: "/",
          maxAge: 24 * 60 * 60,
          httpOnly: true,
          sameSite: "lax",
        });
        res.cookies.set("nx_admin_last_activity", now.toString(), {
          path: "/",
          maxAge: 24 * 60 * 60,
          httpOnly: true,
          sameSite: "lax",
        });
      }
    } else {
      const loginTime = parseInt(loginAtStr, 10);
      const lastActivityTime = lastActivityStr ? parseInt(lastActivityStr, 10) : loginTime;

      const is24hExpired = isNaN(loginTime) || now - loginTime > 24 * 60 * 60 * 1000;
      const isInactiveExpired = isNaN(lastActivityTime) || now - lastActivityTime > 2 * 60 * 60 * 1000; // 2 hours inactivity

      if ((is24hExpired || isInactiveExpired) && !isLoginPage) {
        await supabase.auth.signOut();
        const response = NextResponse.redirect(new URL(`/${ADMIN_PATH}/login?expired=1`, req.url));
        response.cookies.delete("nx_admin_login_at");
        response.cookies.delete("nx_admin_last_activity");
        return response;
      }

      if (!isLoginPage) {
        // Update activity timestamp on active navigation
        res.cookies.set("nx_admin_last_activity", now.toString(), {
          path: "/",
          maxAge: 24 * 60 * 60,
          httpOnly: true,
          sameSite: "lax",
        });
      }
    }

    const userRole = user.user_metadata?.role;
    let isStaff = ["owner", "admin", "staff"].includes(userRole);

    if (!isStaff && user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single();
      isStaff = !!(profile?.is_active && ["owner", "admin", "staff"].includes(profile.role));
    }

    if (!isStaff && !isLoginPage) return notFound(req);

    if (isLoginPage) {
      return NextResponse.redirect(new URL(`/${ADMIN_PATH}`, req.url));
    }
    return res;
  }

  // ---------- CLIENT PORTAL ----------
  if (pathname.startsWith("/portal") && pathname !== "/portal/login") {
    if (!user) return NextResponse.redirect(new URL("/portal/login", req.url));
  }

  return res;
}

function notFound(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = "/_not-found";
  return NextResponse.rewrite(url, { status: 404 });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_not-found|favicon.ico|404|.*\\.(?:svg|png|jpg|jpeg|webp|woff2)$).*)",
  ],
};
