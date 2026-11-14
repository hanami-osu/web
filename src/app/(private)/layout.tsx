import { connection } from "next/server";
import type { ReactNode } from "react";

import AuthenticatedRoute from "@/components/account/authenticated-route";

export default async function PrivateLayout({ children }: { children: ReactNode }) {
    await connection();
    return <AuthenticatedRoute>{children}</AuthenticatedRoute>;
}
