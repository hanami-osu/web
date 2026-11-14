import type { NextConfig } from "next";

import { legacyRedirects } from "./src/client/routes/paths";

const securityHeaders = [
    { key: "Content-Security-Policy", value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
];
const hsts = { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" };
const privateHeaders = [
    { key: "Cache-Control", value: "no-store" },
    { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
    agentRules: false,
    poweredByHeader: false,
    async redirects() {
        return [
            { source: "/index.html", destination: "/", permanent: true },
            ...Object.entries(legacyRedirects).map(([source, destination]) => ({ source, destination, permanent: true })),
        ];
    },
    async headers() {
        return [
            { source: "/:path*", headers: process.env.NODE_ENV === "production" ? [...securityHeaders, hsts] : securityHeaders },
            ...(process.env.NODE_ENV === "production"
                ? []
                : [{ source: "/:path*", has: [{ type: "header" as const, key: "x-forwarded-proto", value: "https" }], headers: [hsts] }]),
            ...["/profile/:path*", "/login", "/link-error", "/oauth/continue/osu"].map((source) => ({
                source,
                headers: privateHeaders,
            })),
        ];
    },
};

export default nextConfig;
