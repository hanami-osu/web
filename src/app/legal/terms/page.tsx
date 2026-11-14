import LegalPage from "@/client/pages/LegalPage";
import TermsOfService from "@/components/legal/tos";

import { getRouteMetadata, RouteStructuredData } from "../../seo";

export const metadata = getRouteMetadata("/legal/terms");

export default function TermsPage() {
    return (
        <>
            <RouteStructuredData pathname="/legal/terms" />
            <LegalPage>
                <TermsOfService />
            </LegalPage>
        </>
    );
}
