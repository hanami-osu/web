import LegalPage from "@/client/pages/LegalPage";
import CookiePolicy from "@/components/legal/cookie-policy";

import { getRouteMetadata, RouteStructuredData } from "../../seo";

export const metadata = getRouteMetadata("/legal/cookies");

export default function CookiesPage() {
    return (
        <>
            <RouteStructuredData pathname="/legal/cookies" />
            <LegalPage>
                <CookiePolicy />
            </LegalPage>
        </>
    );
}
