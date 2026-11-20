import { supporterHandlers } from "@/server/supporter/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = supporterHandlers.link;
export const DELETE = supporterHandlers.unlink;
