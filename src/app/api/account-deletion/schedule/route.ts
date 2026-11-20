import { accountDeletionHandlers } from "@/server/deletion-requests/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = accountDeletionHandlers.schedule;
export const DELETE = accountDeletionHandlers.cancel;
