import { getBotSettings, updateBotSettings } from "@/server/api/osu-link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = getBotSettings;
export const POST = updateBotSettings;
