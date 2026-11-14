import type { Metadata } from "next";

import NotFound from "@/client/pages/NotFound";
import { notFoundMetadata, NOINDEX_ROBOTS_DIRECTIVE } from "@/lib/seo";

export const metadata: Metadata = {
    title: notFoundMetadata.title,
    description: notFoundMetadata.description,
    robots: NOINDEX_ROBOTS_DIRECTIVE,
};

export default function NotFoundPage() {
    return <NotFound />;
}
