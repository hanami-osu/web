import LegalPage from "@/client/pages/LegalPage";
import PrivacyPolicy from "@/components/legal/privacy-policy";

import { getRouteMetadata, RouteStructuredData } from "../../seo";

export const metadata = getRouteMetadata("/legal/privacy");

export default function PrivacyPage() {
    return (
        <>
            <RouteStructuredData pathname="/legal/privacy" />
            <LegalPage>
                <PrivacyPolicy />
            </LegalPage>
        </>
    );
}
