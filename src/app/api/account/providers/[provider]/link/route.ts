import { accountHandlers } from "@/server/accounts/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = accountHandlers.linkProvider;
