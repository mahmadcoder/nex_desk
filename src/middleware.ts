import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const ADMIN_PATH = process.env.ADMIN_PATH || "nx-control";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  let res = NextResponse.next({ request: req });

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

  const { data: { user } } = await supabase.auth.getUser();

  // ---------- ADMIN ----------
  if (pathname.startsWith(`/${ADMIN_PATH}`)) {
    const isLoginPage = pathname === `/${ADMIN_PATH}/login`;

    if (!user) {
      return isLoginPage ? res : notFound(req);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", user.id)
      .single();

    const isStaff =
      profile?.is_active && ["owner", "admin", "staff"].includes(profile.role);

    if (!isStaff) return notFound(req);

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
