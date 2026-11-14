import { Suspense } from "react";
import { connection } from "next/server";

import Login from "@/client/pages/Login";
import RouteLoadingFallback from "@/client/routes/route-loading-fallback";

import { getRouteMetadata } from "../seo";

export const metadata = getRouteMetadata("/login");

export default async function LoginPage() {
    await connection();
    return (
        <Suspense fallback={<RouteLoadingFallback />}>
            <Login osuGuessrClientId={process.env.OSU_GUESSR_CLIENT_ID ?? ""} />
        </Suspense>
    );
}
