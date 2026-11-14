import type { Metadata } from "next";

import { getPageSeo } from "@/lib/seo";

export function getRouteMetadata(pathname: string): Metadata {
    const seo = getPageSeo(pathname);

    return {
        title: seo.metadata.title,
        description: seo.metadata.description,
        alternates: { canonical: seo.canonicalUrl },
        robots: seo.robots,
        openGraph: {
            type: "website",
            siteName: "Hanami",
            locale: "en_US",
            url: seo.canonicalUrl,
            title: seo.metadata.title,
            description: seo.metadata.description,
            images: [{ url: seo.socialImageUrl, alt: "Hanami project artwork" }],
        },
        twitter: {
            card: "summary",
            title: seo.metadata.title,
            description: seo.metadata.description,
            images: [seo.socialImageUrl],
        },
    };
}

export function RouteStructuredData({ pathname }: { pathname: string }) {
    const structuredData = getPageSeo(pathname).structuredData;
    if (!structuredData) return null;

    return (
        <script
            id="hanami-structured-data"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
        />
    );
}
