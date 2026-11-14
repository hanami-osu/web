import LegalPage from "@/client/pages/LegalPage";
import LegalIndex from "@/components/legal/legal-index";

import { getRouteMetadata, RouteStructuredData } from "../seo";

export const metadata = getRouteMetadata("/legal");

export default function LegalIndexPage() {
    return (
        <>
            <RouteStructuredData pathname="/legal" />
            <LegalPage>
                <LegalIndex />
            </LegalPage>
        </>
    );
}
