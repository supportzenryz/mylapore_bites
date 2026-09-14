import { NextResponse, type NextRequest } from "next/server";

/**
 * ONE storefront application serves mylaporebites.com AND mylaporebites.co.uk.
 *
 * This middleware does not decide anything about the market itself — it simply
 * forwards the public hostname to the API, which resolves it against the
 * market_domains table. Keeping resolution server-side is what stops the two
 * sites drifting into two codebases.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-market-host", request.headers.get("host") ?? "");

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};
