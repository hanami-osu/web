import { Suspense } from "react";

import OAuthConsent from "@/client/pages/OAuthConsent";
import RouteLoadingFallback from "@/client/routes/route-loading-fallback";

import { getRouteMetadata } from "../../../seo";

export const metadata = getRouteMetadata("/oauth/consent");

export default function OAuthConsentPage() {
    return (
        <Suspense fallback={<RouteLoadingFallback />}>
            <OAuthConsent />
        </Suspense>
    );
}
