import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/dashboard"];
const authRoutes = ["/login"];

export default function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Check for better-auth session cookie
    const sessionCookie =
        request.cookies.get("better-auth.session_token")?.value;

    const isAuthenticated = !!sessionCookie;

    // Redirect unauthenticated users away from protected routes
    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
        if (!isAuthenticated) {
            const loginUrl = new URL("/login", request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    // Redirect authenticated users away from auth routes
    if (authRoutes.some((route) => pathname.startsWith(route))) {
        if (isAuthenticated) {
            const dashboardUrl = new URL("/dashboard", request.url);
            return NextResponse.redirect(dashboardUrl);
        }
    }

    const response = NextResponse.next();

    // Prevent browser from caching protected pages
    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
        response.headers.set(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
        );
    }

    return response;
}

export const config = {
    matcher: ["/dashboard/:path*", "/login"],
};
