import Bot from "@/client/pages/Bot";

import { getRouteMetadata, RouteStructuredData } from "../seo";

export const metadata = getRouteMetadata("/bot");

export default function BotPage() {
    return (
        <>
            <RouteStructuredData pathname="/bot" />
            <Bot />
        </>
    );
}
