import Home from "@/client/pages/Home";

import { getRouteMetadata, RouteStructuredData } from "./seo";

export const metadata = getRouteMetadata("/");

export default function HomePage() {
    return (
        <>
            <RouteStructuredData pathname="/" />
            <Home />
        </>
    );
}
