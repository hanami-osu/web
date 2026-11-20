import { discordLinkTicketStore } from "../auth";

import { jsonResponse, logSafeFailure, readJson } from "../security/http";
import { createSecureToken, hashToken } from "../security/tokens";
import { getBotLinkSecret, hasValidBotAuthorization } from "./bot-auth";
import type { DiscordLinkTicketStore } from "./tickets";
import { parseDiscordLinkRequest } from "./validation";

interface DiscordLinkRouteDependencies {
    ticketStore: DiscordLinkTicketStore;
    getSecret(): string;
    getBaseUrl(): string;
    now(): Date;
}

export function createDiscordLinkHandler(dependencies: DiscordLinkRouteDependencies) {
    return async function POST(request: Request): Promise<Response> {
        let expectedSecret: string;
        try {
            expectedSecret = dependencies.getSecret();
        } catch (error) {
            logSafeFailure("load Discord bot link configuration", error);
            return jsonResponse({ error: "Server configuration error" }, 500);
        }

        if (!hasValidBotAuthorization(request.headers.get("authorization"), expectedSecret)) {
            return jsonResponse({ error: "Unauthorized" }, 401);
        }

        const input = parseDiscordLinkRequest(await readJson(request));
        if (!input) {
            return jsonResponse({ error: "Invalid Discord link request" }, 400);
        }

        let baseUrl: string;
        try {
            baseUrl = dependencies.getBaseUrl();
        } catch (error) {
            logSafeFailure("load Discord bot link URL configuration", error);
            return jsonResponse({ error: "Server configuration error" }, 500);
        }

        try {
            const token = createSecureToken();
            const ticket = await dependencies.ticketStore.issue({ ...input, tokenHash: await hashToken(token), now: dependencies.now() });
            const url = new URL("/api/auth/bot-link/consume", baseUrl);
            url.searchParams.set("token", token);
            return jsonResponse({ url: url.toString(), expiresAt: ticket.expiresAt.toISOString() });
        } catch (error) {
            logSafeFailure("issue a Discord link ticket", error);
            return jsonResponse({ error: "The link could not be created" }, 500);
        }
    };
}

export function getBetterAuthBaseUrl(): string {
    const value = process.env.BETTER_AUTH_URL;
    if (!value) throw new Error("BETTER_AUTH_URL environment variable is not set.");
    return new URL(value).toString();
}

export const productionDiscordLinkRouteDependencies = {
    getSecret: getBotLinkSecret,
    getBaseUrl: getBetterAuthBaseUrl,
    now: () => new Date(),
};

export const discordLinkHandler = createDiscordLinkHandler({
    ...productionDiscordLinkRouteDependencies,
    ticketStore: discordLinkTicketStore,
});
