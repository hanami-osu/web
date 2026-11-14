import OsuGuessr from "@/client/pages/OsuGuessr";

import { getRouteMetadata, RouteStructuredData } from "../seo";

export const metadata = getRouteMetadata("/osuguessr");

export default function OsuGuessrPage() {
    return (
        <>
            <RouteStructuredData pathname="/osuguessr" />
            <OsuGuessr />
        </>
    );
}
