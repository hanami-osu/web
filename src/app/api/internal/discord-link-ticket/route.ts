import { discordLinkHandler } from "@/server/discord-link/routes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const POST = discordLinkHandler;
