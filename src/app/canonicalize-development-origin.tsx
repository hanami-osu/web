"use client";

import { useEffect } from "react";

import { getCanonicalDevelopmentAuthURL } from "@/client/lib/auth-navigation";

export default function CanonicalizeDevelopmentOrigin({ isDevelopment }: { isDevelopment: boolean }) {
    useEffect(() => {
        const canonicalURL = getCanonicalDevelopmentAuthURL(window.location.href, isDevelopment);
        if (canonicalURL) window.location.replace(canonicalURL);
    }, [isDevelopment]);

    return null;
}
