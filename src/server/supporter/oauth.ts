import { isRecord } from "@/lib/record";
import { siteConfig } from "@/data/site-config";

import type { LinkableSupporterProvider } from "./domain";

export interface SupporterOAuthConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

export interface LinkedProviderAccount {
    providerUserId: string;
    displayName: string | null;
    membershipActive: boolean;
    hasSupported: boolean;
    payment?: { externalId: string; amountCents: number; receivedAt: Date };
}

type FetchFunction = (input: string, init?: RequestInit) => Promise<Response>;

const userAgent = "Hanami Web (+https://hanami.yorunoken.com)";

export function readSupporterOAuthConfig(
    provider: LinkableSupporterProvider,
    environment: NodeJS.ProcessEnv = process.env,
): SupporterOAuthConfig | null {
    const clientId = environment.GITHUB_CLIENT_ID?.trim();
    const clientSecret = environment.GITHUB_CLIENT_SECRET?.trim();
    if (!clientId || !clientSecret) return null;
    const baseUrl = environment.BETTER_AUTH_URL || "http://localhost:3000";
    return { clientId, clientSecret, redirectUri: new URL(`/api/supporter/link/${provider}/callback`, baseUrl).toString() };
}

export function buildAuthorizationUrl(provider: LinkableSupporterProvider, config: SupporterOAuthConfig, state: string): string {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", config.clientId);
    url.searchParams.set("redirect_uri", config.redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("scope", "read:user");
    url.searchParams.set("allow_signup", "false");
    return url.toString();
}

/** Exchanges the authorization code and reads the provider account. The access token is not stored. */
export async function fetchLinkedAccount(
    provider: LinkableSupporterProvider,
    config: SupporterOAuthConfig,
    code: string,
    options: { fetch?: FetchFunction } = {},
): Promise<LinkedProviderAccount> {
    const request = options.fetch ?? fetch;
    const accessToken = await exchangeCode(provider, config, code, request);
    return readGithubUser(accessToken, request);
}

async function exchangeCode(provider: LinkableSupporterProvider, config: SupporterOAuthConfig, code: string, request: FetchFunction) {
    const response = await request("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded", "User-Agent": userAgent },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            client_id: config.clientId,
            client_secret: config.clientSecret,
            redirect_uri: config.redirectUri,
        }),
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(data) || typeof data.access_token !== "string") throw new Error(`${provider} token exchange failed`);
    return data.access_token;
}

async function readGithubUser(accessToken: string, request: FetchFunction): Promise<LinkedProviderAccount> {
    const response = await request("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json", "User-Agent": userAgent },
    });
    const user: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(user) || typeof user.id !== "number") throw new Error("GitHub user request failed");

    const sponsorshipResponse = await request("https://api.github.com/graphql", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "User-Agent": userAgent },
        body: JSON.stringify({
            query: `query($login: String!) {
                repositoryOwner(login: $login) {
                    ... on Sponsorable {
                        sponsorshipForViewerAsSponsor(activeOnly: false) {
                            id createdAt isActive isOneTimePayment tier { monthlyPriceInCents }
                        }
                    }
                }
            }`,
            variables: { login: new URL(siteConfig.links.githubSponsors).pathname.split("/").filter(Boolean).at(-1) },
        }),
    });
    const result: unknown = await sponsorshipResponse.json().catch(() => null);
    if (!sponsorshipResponse.ok || !isRecord(result) || result.errors || !isRecord(result.data) || !isRecord(result.data.repositoryOwner)) {
        throw new Error("GitHub sponsorship request failed");
    }
    const sponsorship = result.data.repositoryOwner.sponsorshipForViewerAsSponsor;
    if (
        sponsorship !== null &&
        (!isRecord(sponsorship) || typeof sponsorship.isActive !== "boolean" || typeof sponsorship.isOneTimePayment !== "boolean")
    ) {
        throw new Error("GitHub sponsorship response is invalid");
    }
    let payment: LinkedProviderAccount["payment"];
    if (isRecord(sponsorship) && sponsorship.isOneTimePayment) {
        const receivedAt = typeof sponsorship.createdAt === "string" ? new Date(sponsorship.createdAt) : null;
        if (
            typeof sponsorship.id !== "string" ||
            !receivedAt ||
            Number.isNaN(receivedAt.getTime()) ||
            !isRecord(sponsorship.tier) ||
            typeof sponsorship.tier.monthlyPriceInCents !== "number"
        ) {
            throw new Error("GitHub payment response is invalid");
        }
        payment = {
            externalId: `${sponsorship.id}:${receivedAt.toISOString()}`,
            amountCents: sponsorship.tier.monthlyPriceInCents,
            receivedAt,
        };
    }
    return {
        providerUserId: String(user.id),
        displayName: typeof user.login === "string" ? user.login : null,
        membershipActive: isRecord(sponsorship) && sponsorship.isActive === true && !sponsorship.isOneTimePayment,
        hasSupported: sponsorship !== null,
        ...(payment ? { payment } : {}),
    };
}
