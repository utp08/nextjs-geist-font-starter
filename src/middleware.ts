import { NextResponse, type NextRequest } from "next/server";

/**
 * Password protection for the whole dashboard (pages + /data/*.json).
 *
 * Set on the host (e.g. Vercel → Project → Settings → Environment Variables):
 *   DASHBOARD_USER       login name
 *   DASHBOARD_PASSWORD   password (long and random)
 *
 * When they are not set, the dashboard only opens in `npm run dev` (your own laptop).
 * A production build (`npm run start`, Vercel, any server) refuses with 503 instead of
 * serving the data unprotected.
 */

const REALM = "CCM R09 Sulawesi";

function safeEqual(a: string, b: string): boolean {
  // constant-time comparison so response timing does not leak the password
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const user = process.env.DASHBOARD_USER;
  const pass = process.env.DASHBOARD_PASSWORD;

  if (!user || !pass) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return new NextResponse(
      "Dashboard belum dikonfigurasi: set environment variable DASHBOARD_USER dan DASHBOARD_PASSWORD.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const i = decoded.indexOf(":");
      if (i >= 0 && safeEqual(decoded.slice(0, i), user) && safeEqual(decoded.slice(i + 1), pass)) {
        const res = NextResponse.next();
        res.headers.set("Cache-Control", "private, no-store");
        res.headers.set("X-Robots-Tag", "noindex, nofollow");
        return res;
      }
    } catch {
      // malformed header → fall through to 401
    }
  }

  return new NextResponse("Login diperlukan untuk Dashboard CCM R09 Sulawesi.", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"`,
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  // everything except Next's own static build assets (they hold no data)
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
