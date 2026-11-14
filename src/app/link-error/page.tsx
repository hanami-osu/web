import LinkError from "@/client/pages/LinkError";

import { getRouteMetadata } from "../seo";

export const metadata = getRouteMetadata("/link-error");

export default function LinkErrorPage() {
    return <LinkError />;
}
