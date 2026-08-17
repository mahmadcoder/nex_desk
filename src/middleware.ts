import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient as createRawClient } from "@supabase/supabase-js";
import { canStaffAccess } from "@/lib/auth/staffAccess";

const ADMIN_PATH = process.env.ADMIN_PATH || "nx-control";
const STAFF_ROLES = ["owner", "admin", "staff"];

function getAdminClient() {
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

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

    if (isLoginPage && req.cookies.has("nx_admin_login_at")) {
      res.cookies.delete("nx_admin_login_at");
      res.cookies.delete("nx_admin_last_activity");
    }

    if (!user) {
      if (isLoginPage) return res;
      return NextResponse.redirect(new URL(`/${ADMIN_PATH}/login`, req.url));
    }

    // Enforce 24-hour admin session limit & 2-hour inactivity limit and then login again
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

    // Resolve the role and ensure the account is active
    let role: string | null = null;
    let isActive = true;

    if (user.id) {
      try {
        const adminDb = getAdminClient();
        const [{ data: profile }, { data: employee }] = await Promise.all([
          adminDb.from("profiles").select("role, is_active").eq("id", user.id).maybeSingle(),
          adminDb
            .from("employees")
            .select("status")
            .or(`user_id.eq.${user.id},email.ilike.${user.email}`)
            .maybeSingle(),
        ]);

        if (profile) {
          if (profile.is_active === false) isActive = false;
          if (STAFF_ROLES.includes(profile.role)) role = profile.role;
        }

        if (
          employee &&
          (String(employee.status).toLowerCase() === "terminated" ||
            String(employee.status).toLowerCase() === "inactive")
        ) {
          isActive = false;
        }

        if (!role && STAFF_ROLES.includes(user.user_metadata?.role)) {
          role = user.user_metadata.role;
        }
      } catch {
        role = STAFF_ROLES.includes(user.user_metadata?.role) ? user.user_metadata.role : null;
      }
    }

    if (!role || !isActive) {
      if (isLoginPage) return res;
      await supabase.auth.signOut();
      const redirectRes = NextResponse.redirect(new URL(`/${ADMIN_PATH}/login?deactivated=1`, req.url));
      redirectRes.cookies.delete("nx_admin_login_at");
      redirectRes.cookies.delete("nx_admin_last_activity");
      return redirectRes;
    }

    if (isLoginPage) {
      return NextResponse.redirect(new URL(`/${ADMIN_PATH}`, req.url));
    }

    if (!canStaffAccess(role, pathname, `/${ADMIN_PATH}`)) {
      return NextResponse.redirect(new URL(`/${ADMIN_PATH}`, req.url));
    }

    return res;
  }

  // ---------- CLIENT PORTAL ----------
  if (pathname === "/portal/login") {
    if (user) {
      try {
        const adminDb = getAdminClient();
        const { data: client } = await adminDb
          .from("clients")
          .select("lifecycle, is_active")
          .eq("email", user.email!)
          .maybeSingle();

        if (client && (client.lifecycle === "archived" || client.is_active === false)) {
          await supabase.auth.signOut();
          return res;
        }
      } catch {
        // ignore
      }
      return NextResponse.redirect(new URL("/portal", req.url));
    }
  } else if (pathname.startsWith("/portal")) {
    if (!user) return NextResponse.redirect(new URL("/portal/login", req.url));

    try {
      const adminDb = getAdminClient();
      const { data: client } = await adminDb
        .from("clients")
        .select("lifecycle, is_active")
        .eq("email", user.email!)
        .maybeSingle();

      if (client && (client.lifecycle === "archived" || client.is_active === false)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(new URL("/portal/login?deactivated=1", req.url));
      }
    } catch {
      // ignore
    }
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
