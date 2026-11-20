import Supporter from "@/client/pages/Supporter";

import { getRouteMetadata, RouteStructuredData } from "../seo";

export const metadata = getRouteMetadata("/supporter");

export default function SupporterPage() {
    return (
        <>
            <RouteStructuredData pathname="/supporter" />
            <Supporter />
        </>
    );
}
