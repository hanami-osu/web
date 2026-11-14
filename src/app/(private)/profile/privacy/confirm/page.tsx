import { Suspense } from "react";

import AccountPrivacy from "@/client/pages/AccountPrivacy";
import RouteLoadingFallback from "@/client/routes/route-loading-fallback";

import { getRouteMetadata } from "../../../../seo";

export const metadata = getRouteMetadata("/profile/privacy/confirm");

export default function AccountDeletionConfirmationPage() {
    return (
        <Suspense fallback={<RouteLoadingFallback />}>
            <AccountPrivacy />
        </Suspense>
    );
}
