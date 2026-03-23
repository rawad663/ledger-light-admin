import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_MAP } from "@/lib/api-config";

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // Refresh if token expires within 60 seconds
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

const { ACCESS_TOKEN, REFRESH_TOKEN, USER_ID } = AUTH_COOKIE_MAP;

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN)?.value;
  const refreshToken = request.cookies.get(REFRESH_TOKEN)?.value;
  const userId = request.cookies.get(USER_ID)?.value;

  if (request.url.includes("/login")) {
    return NextResponse.next();
  }

  function redirectToLogin() {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  console.log({ accessToken, isExpired: isTokenExpired(accessToken ?? "") });

  if (!refreshToken || !userId) {
    return redirectToLogin();
  }

  if (accessToken && !isTokenExpired(accessToken)) {
    return NextResponse.next();
  }

  // Token is missing or expired — refresh it
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, refreshTokenRaw: refreshToken }),
  });

  // console.log({ res });

  if (!res.ok) {
    // Refresh failed — clear stale tokens and continue
    const response = redirectToLogin();
    response.cookies.delete(ACCESS_TOKEN);
    response.cookies.delete(REFRESH_TOKEN);
    response.cookies.delete(USER_ID);

    return response;
  }

  const data = await res.json();
  const response = NextResponse.next();
  response.cookies.set(ACCESS_TOKEN, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * match only paths from my application
     */
    "/((?!_next|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
