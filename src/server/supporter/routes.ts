import { auth, trustedOrigins } from "../auth";
import { webPrisma } from "../database/web";
import { errorResponse, jsonResponse, logSafeFailure } from "../security/http";
import { createSecureToken, hashToken, isSecureToken } from "../security/tokens";
import { isLinkableSupporterProvider, isSupporterProvider, type LinkableSupporterProvider, type SupporterProvider } from "./domain";
import { buildAuthorizationUrl, fetchLinkedAccount, readSupporterOAuthConfig, type LinkedProviderAccount } from "./oauth";
import { createSupporterStore } from "./osu-guessr-sync";
import { SupporterStoreError, type SupporterOverview } from "./store";
import { parseBmcEvent, parseGithubSponsorship, readGithubSignature, verifyHmacSignature, type SupporterWebhookEvent } from "./webhooks";

const LINK_STATE_TTL_MS = 10 * 60 * 1000;
const linkStatePrefix = "supporter-link:";

export interface SupporterStore {
    getOverview(userId: string, now: Date): Promise<SupporterOverview>;
    link(input: {
        userId: string;
        provider: SupporterProvider;
        providerUserId: string;
        displayName: string | null;
        now: Date;
        hasSupported?: boolean;
    }): Promise<void>;
    unlink(userId: string, provider: SupporterProvider, now: Date): Promise<boolean>;
    recordMembership(input: { provider: SupporterProvider; providerUserId: string; active: boolean; now: Date }): Promise<void>;
    recordPayment(input: {
        provider: SupporterProvider;
        providerUserId: string;
        externalId: string;
        amountCents: number;
        receivedAt: Date;
        now: Date;
    }): Promise<void>;
    refundPayment(provider: SupporterProvider, externalId: string, now: Date): Promise<void>;
    createClaimCode(userId: string, now: Date): Promise<{ code: string; expiresAt: Date }>;
    claimWithCode(input: { code: string; providerUserId: string; displayName: string | null; now: Date }): Promise<void>;
}

export interface LinkStateStore {
    save(stateHash: string, value: { userId: string; provider: LinkableSupporterProvider }, expiresAt: Date): Promise<void>;
    take(stateHash: string, now: Date): Promise<{ userId: string; provider: LinkableSupporterProvider } | null>;
}

export interface SupporterRouteDependencies {
    getSession(headers: Headers): Promise<{ user: { id: string } } | null>;
    store: SupporterStore;
    linkStates: LinkStateStore;
    fetchLinkedAccount(provider: LinkableSupporterProvider, code: string): Promise<LinkedProviderAccount>;
    authorizationUrl(provider: LinkableSupporterProvider, state: string): string | null;
    secrets: { github: string | null; bmc: string | null };
    now(): Date;
}

const prismaLinkStates: LinkStateStore = {
    async save(stateHash, value, expiresAt) {
        const now = new Date();
        await webPrisma.verification.create({
            data: {
                id: crypto.randomUUID(),
                identifier: `${linkStatePrefix}${stateHash}`,
                value: JSON.stringify(value),
                expiresAt,
                createdAt: now,
                updatedAt: now,
            },
        });
    },
    async take(stateHash, now) {
        const identifier = `${linkStatePrefix}${stateHash}`;
        const row = await webPrisma.verification.findFirst({ where: { identifier } });
        if (!row) return null;
        await webPrisma.verification.deleteMany({ where: { identifier } });
        if (row.expiresAt <= now) return null;
        try {
            const value: unknown = JSON.parse(row.value);
            if (typeof value !== "object" || value === null) return null;
            const { userId, provider } = value as Record<string, unknown>;
            return typeof userId === "string" && isLinkableSupporterProvider(provider) ? { userId, provider } : null;
        } catch {
            return null;
        }
    },
};

const productionDependencies: SupporterRouteDependencies = {
    getSession: (headers) => auth.api.getSession({ headers }),
    store: createSupporterStore(webPrisma),
    linkStates: prismaLinkStates,
    fetchLinkedAccount: (provider, code) => {
        const config = readSupporterOAuthConfig(provider);
        if (!config) throw new Error(`${provider} linking is not configured`);
        return fetchLinkedAccount(provider, config, code);
    },
    authorizationUrl: (provider, state) => {
        const config = readSupporterOAuthConfig(provider);
        return config ? buildAuthorizationUrl(provider, config, state) : null;
    },
    secrets: {
        github: readOptional("GITHUB_SPONSORS_WEBHOOK_SECRET"),
        bmc: readOptional("BMC_WEBHOOK_SECRET"),
    },
    now: () => new Date(),
};

export function createSupporterHandlers(dependencies: SupporterRouteDependencies = productionDependencies) {
    async function applyWebhookEvent(provider: SupporterProvider, event: SupporterWebhookEvent): Promise<void> {
        const now = dependencies.now();
        if (event.kind === "refund") return dependencies.store.refundPayment(provider, event.externalId, now);

        if (event.claimCode) {
            await dependencies.store
                .claimWithCode({ code: event.claimCode, providerUserId: event.providerUserId, displayName: event.displayName, now })
                .catch((error: unknown) => {
                    if (!(error instanceof SupporterStoreError)) throw error;
                    logSafeFailure(`claim a ${provider} supporter with a code`, error);
                });
        }

        if (event.kind === "membership") {
            return dependencies.store.recordMembership({ provider, providerUserId: event.providerUserId, active: event.active, now });
        }
        return dependencies.store.recordPayment({
            provider,
            providerUserId: event.providerUserId,
            externalId: event.externalId,
            amountCents: event.amountCents,
            receivedAt: event.receivedAt,
            now,
        });
    }

    async function handleWebhook(provider: SupporterProvider, verified: boolean, parse: () => SupporterWebhookEvent | null) {
        if (!verified) return errorResponse(401, "Invalid signature.");
        const event = parse();
        if (!event) return jsonResponse({ ignored: true });
        try {
            await applyWebhookEvent(provider, event);
            return jsonResponse({ received: true });
        } catch (error) {
            logSafeFailure(`process a ${provider} supporter webhook`, error);
            return errorResponse(500, "The event could not be processed.");
        }
    }

    return {
        async getOverview(request: Request): Promise<Response> {
            const session = await dependencies.getSession(request.headers);
            if (!session) return errorResponse(401, "Sign in before continuing.");
            try {
                return jsonResponse(serializeOverview(await dependencies.store.getOverview(session.user.id, dependencies.now())));
            } catch (error) {
                logSafeFailure("read the supporter status", error);
                return errorResponse(500, "The supporter status could not be loaded.");
            }
        },
        async link(request: Request, { params }: { params: Promise<{ provider: string }> }): Promise<Response> {
            const { provider } = await params;
            const session = await dependencies.getSession(request.headers);
            if (!session) return errorResponse(401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return errorResponse(403, "This action could not be verified.");
            if (!isLinkableSupporterProvider(provider)) return errorResponse(404, "Unknown provider.");

            const state = createSecureToken();
            const url = dependencies.authorizationUrl(provider, state);
            if (!url) return errorResponse(503, "This provider is not available right now.");
            try {
                const expiresAt = new Date(dependencies.now().getTime() + LINK_STATE_TTL_MS);
                await dependencies.linkStates.save(await hashToken(state), { userId: session.user.id, provider }, expiresAt);
                return jsonResponse({ url });
            } catch (error) {
                logSafeFailure("start supporter linking", error);
                return errorResponse(500, "Linking could not be started.");
            }
        },
        async callback(request: Request, { params }: { params: Promise<{ provider: string }> }): Promise<Response> {
            const { provider } = await params;
            const url = new URL(request.url);
            const code = url.searchParams.get("code");
            const state = url.searchParams.get("state");
            if (!isLinkableSupporterProvider(provider)) return redirect("invalid");
            if (!code || !isSecureToken(state)) return redirect("invalid", provider);

            try {
                const now = dependencies.now();
                const saved = await dependencies.linkStates.take(await hashToken(state), now);
                const session = await dependencies.getSession(request.headers);
                if (!saved || saved.provider !== provider || !session || session.user.id !== saved.userId)
                    return redirect("invalid", provider);

                const account = await dependencies.fetchLinkedAccount(provider, code);
                await dependencies.store.recordMembership({
                    provider,
                    providerUserId: account.providerUserId,
                    active: account.membershipActive,
                    now,
                });
                if (account.payment) {
                    await dependencies.store.recordPayment({ provider, providerUserId: account.providerUserId, ...account.payment, now });
                }
                await dependencies.store.link({
                    userId: saved.userId,
                    provider,
                    providerUserId: account.providerUserId,
                    displayName: account.displayName,
                    now,
                    hasSupported: account.hasSupported,
                });
                return redirect("linked");
            } catch (error) {
                if (error instanceof SupporterStoreError && error.code === "linked_to_another_account") return redirect("taken", provider);
                logSafeFailure(`link a ${provider} supporter account`, error);
                return redirect("failed", provider);
            }
        },
        async unlink(request: Request, { params }: { params: Promise<{ provider: string }> }): Promise<Response> {
            const { provider } = await params;
            const session = await dependencies.getSession(request.headers);
            if (!session) return errorResponse(401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return errorResponse(403, "This action could not be verified.");
            if (!isSupporterProvider(provider)) return errorResponse(404, "Unknown provider.");
            try {
                return jsonResponse({ unlinked: await dependencies.store.unlink(session.user.id, provider, dependencies.now()) });
            } catch (error) {
                logSafeFailure("unlink a supporter account", error);
                return errorResponse(500, "The account could not be unlinked.");
            }
        },
        async createClaimCode(request: Request): Promise<Response> {
            const session = await dependencies.getSession(request.headers);
            if (!session) return errorResponse(401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return errorResponse(403, "This action could not be verified.");
            if (!dependencies.secrets.bmc) return errorResponse(503, "Buy Me a Coffee verification is currently unavailable.");
            try {
                const claim = await dependencies.store.createClaimCode(session.user.id, dependencies.now());
                return jsonResponse({ code: claim.code, expiresAt: claim.expiresAt.toISOString() });
            } catch (error) {
                logSafeFailure("create a supporter claim code", error);
                return errorResponse(500, "A claim code could not be created.");
            }
        },
        async githubWebhook(request: Request): Promise<Response> {
            const rawBody = await request.text();
            const verified = verifyHmacSignature(
                dependencies.secrets.github ?? "",
                rawBody,
                readGithubSignature(request.headers.get("x-hub-signature-256")),
            );
            // Pings carry a signature too, so a successful delivery on GitHub confirms the secret matches.
            if (verified && request.headers.get("x-github-event") === "ping") return jsonResponse({ received: true });
            return handleWebhook("github", verified, () =>
                request.headers.get("x-github-event") === "sponsorship"
                    ? parseGithubSponsorship(parseJson(rawBody), dependencies.now())
                    : null,
            );
        },
        async bmcWebhook(request: Request): Promise<Response> {
            const rawBody = await request.text();
            const verified = verifyHmacSignature(dependencies.secrets.bmc ?? "", rawBody, request.headers.get("x-signature-sha256"));
            return handleWebhook("bmc", verified, () => parseBmcEvent(parseJson(rawBody), dependencies.now()));
        },
    };
}

export const supporterHandlers = createSupporterHandlers();

function serializeOverview(overview: SupporterOverview) {
    return {
        status: { ...overview.status, activeUntil: overview.status.activeUntil?.toISOString() ?? null },
        links: overview.links.map((link) => ({ ...link, linkedAt: link.linkedAt.toISOString() })),
    };
}

/** A successful link returns to the plain page, since the card itself shows the new link. Failures say which card to explain them in. */
function redirect(result: "linked" | "taken" | "invalid" | "failed", provider?: LinkableSupporterProvider): Response {
    const query = new URLSearchParams(result === "linked" ? {} : { supporter: result, ...(provider && { provider }) }).toString();
    return new Response(null, {
        status: 302,
        headers: {
            Location: query ? `/supporter?${query}` : "/supporter",
            "Cache-Control": "no-store",
        },
    });
}

function hasValidOrigin(request: Request): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return false;
    return origin === new URL(request.url).origin || trustedOrigins.includes(origin);
}

function parseJson(rawBody: string): unknown {
    try {
        return JSON.parse(rawBody);
    } catch {
        return null;
    }
}

function readOptional(name: string): string | null {
    return process.env[name]?.trim() || null;
}
