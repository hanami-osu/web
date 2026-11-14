import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import ErrorBoundary from "@/components/error-boundary";
import { siteConfig } from "@/data/site-config";

import CanonicalizeDevelopmentOrigin from "./canonicalize-development-origin";
import "../client/globals.css";

export const metadata: Metadata = {
    metadataBase: new URL(siteConfig.url),
    applicationName: siteConfig.name,
    title: siteConfig.name,
    icons: {
        icon: [{ url: "/favicon.ico", sizes: "any" }],
        apple: "/hanami.webp",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    themeColor: "#09080b",
};

export default function RootLayout({ children }: { children: ReactNode }) {
    return (
        <html lang="en" className="dark">
            <body>
                <CanonicalizeDevelopmentOrigin isDevelopment={process.env.NODE_ENV === "development"} />
                <ErrorBoundary>
                    <div className="min-h-screen">{children}</div>
                </ErrorBoundary>
            </body>
        </html>
    );
}
