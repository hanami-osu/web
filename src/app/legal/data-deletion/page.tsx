import LegalPage from "@/client/pages/LegalPage";
import DataDeletion from "@/components/legal/data-deletion";

import { getRouteMetadata, RouteStructuredData } from "../../seo";

export const metadata = getRouteMetadata("/legal/data-deletion");

export default function DataDeletionPage() {
    return (
        <>
            <RouteStructuredData pathname="/legal/data-deletion" />
            <LegalPage>
                <DataDeletion />
            </LegalPage>
        </>
    );
}
