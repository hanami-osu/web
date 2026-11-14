import { Suspense } from "react";

import OsuOAuthContinuation from "@/client/pages/OsuOAuthContinuation";
import RouteLoadingFallback from "@/client/routes/route-loading-fallback";

import { getRouteMetadata } from "../../../../seo";

export const metadata = getRouteMetadata("/oauth/continue/osu");

export default function OsuOAuthContinuationPage() {
    return (
        <Suspense fallback={<RouteLoadingFallback />}>
            <OsuOAuthContinuation />
        </Suspense>
    );
}
