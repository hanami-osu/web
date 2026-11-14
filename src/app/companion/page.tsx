import Companion from "@/client/pages/Companion";

import { getRouteMetadata, RouteStructuredData } from "../seo";

export const metadata = getRouteMetadata("/companion");

export default function CompanionPage() {
    return (
        <>
            <RouteStructuredData pathname="/companion" />
            <Companion />
        </>
    );
}
