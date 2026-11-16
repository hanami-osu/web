import { Elysia } from "elysia";

import { isRecord } from "@/lib/record";

import { auth, botAccountCompatibility, trustedOrigins } from "../auth";
import { botPrisma } from "../database/bot";
import { webPrisma } from "../database/web";
import { logSafeFailure } from "../security/http";
import {
    createChallengeToken,
    hashChallengeToken,
    isFreshAuthentication,
    isValidConfirmationPhrase,
    normalizeDeletionScopes,
    type DeletionScopes,
} from "./domain";
import { createOsuGuessrDeletionClient } from "./osu-guessr";
import {
    AccountDeletionStoreError,
    PrismaDeletionRequestStore,
    type AccountDeletionStore,
    type BotDeletionService,
    type DeletionStatus,
} from "./store";

interface AuthenticatedSession {
    session: {
        createdAt: Date;
    };
    user: {
        id: string;
    };
}

interface AccountDeletionRouteDependencies {
    getSession(headers: Headers): Promise<AuthenticatedSession | null>;
    store: AccountDeletionStore;
    now(): Date;
}

const botDeletionService: BotDeletionService = {
    pauseLink: async (discordId) => {
        await botPrisma.user.updateMany({ where: { id: discordId }, data: { banchoId: null } });
    },
    restoreLink: (userId) => botAccountCompatibility.synchronizeUser(userId),
    deleteUser: async (discordId) => {
        await botPrisma.user.deleteMany({ where: { id: discordId } });
    },
};

export const accountDeletionStore = new PrismaDeletionRequestStore(webPrisma, {
    bot: botDeletionService,
    osuGuessr: createOsuGuessrDeletionClient(),
});

const productionDependencies: AccountDeletionRouteDependencies = {
    getSession: (headers) => auth.api.getSession({ headers }),
    store: accountDeletionStore,
    now: () => new Date(),
};

export function createAccountDeletionRoutes(dependencies: AccountDeletionRouteDependencies = productionDependencies) {
    return new Elysia({ prefix: "/account-deletion" })
        .post("/reauth/start", async ({ request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This action could not be verified.");

            try {
                const now = dependencies.now();
                const challenge = createChallengeToken();
                const alreadyFresh = isFreshAuthentication(new Date(session.session.createdAt), now.getTime());
                await dependencies.store.startReauthentication({
                    userId: session.user.id,
                    tokenHash: await hashChallengeToken(challenge),
                    now,
                    alreadyFresh,
                });

                return {
                    reauthenticationRequired: !alreadyFresh,
                    confirmationPath: `/profile/privacy/confirm#challenge=${encodeURIComponent(challenge)}`,
                };
            } catch (error) {
                logSafeFailure("start account-deletion reauthentication", error);
                return fail(set, 500, "Reauthentication could not be started.");
            }
        })
        .post("/reauth/complete", async ({ request, body, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This action could not be verified.");

            const challenge = readChallenge(body);
            if (!challenge) return fail(set, 400, "The reauthentication request is invalid.");

            try {
                const now = dependencies.now();
                const reauthenticatedAt = await dependencies.store.completeReauthentication({
                    userId: session.user.id,
                    tokenHash: await hashChallengeToken(challenge),
                    sessionCreatedAt: new Date(session.session.createdAt),
                    now,
                });
                return { ready: true, reauthenticatedAt: reauthenticatedAt.toISOString() };
            } catch (error) {
                return handleStoreFailure(set, error, "Reauthentication could not be completed.");
            }
        })
        .get("/status", async ({ request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");

            try {
                const status = await dependencies.store.getDeletionStatus(session.user.id);
                return { scheduled: status ? serializeStatus(status) : null };
            } catch (error) {
                logSafeFailure("read the account-deletion status", error);
                return fail(set, 500, "The deletion status could not be loaded.");
            }
        })
        .post("/schedule", async ({ request, body, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This action could not be verified.");

            const parsed = readScheduleBody(body);
            if (!parsed.challenge) return fail(set, 400, "The reauthentication request is invalid.");
            if (!parsed.scopes) return fail(set, 400, "Choose what to delete.");
            if (!isValidConfirmationPhrase(parsed.confirmationPhrase)) {
                return fail(set, 400, "The confirmation phrase does not match.");
            }

            try {
                const status = await dependencies.store.scheduleDeletion({
                    userId: session.user.id,
                    tokenHash: await hashChallengeToken(parsed.challenge),
                    scopes: parsed.scopes,
                    now: dependencies.now(),
                });
                return { scheduled: serializeStatus(status) };
            } catch (error) {
                return handleStoreFailure(set, error, "The deletion could not be scheduled.");
            }
        })
        .delete("/schedule", async ({ request, set }) => {
            set.headers["Cache-Control"] = "no-store";
            const session = await dependencies.getSession(request.headers);
            if (!session) return fail(set, 401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return fail(set, 403, "This action could not be verified.");

            try {
                await dependencies.store.cancelDeletion(session.user.id);
                return { cancelled: true };
            } catch (error) {
                return handleStoreFailure(set, error, "The deletion could not be cancelled.");
            }
        });
}

export const accountDeletionRoutes = createAccountDeletionRoutes();

function hasValidOrigin(request: Request): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return false;
    const requestOrigin = new URL(request.url).origin;
    return origin === requestOrigin || trustedOrigins.includes(origin);
}

function readChallenge(body: unknown): string | null {
    if (!isRecord(body) || typeof body.challenge !== "string") return null;
    const challenge = body.challenge.trim();
    return challenge.length >= 32 && challenge.length <= 128 ? challenge : null;
}

function readScheduleBody(body: unknown): { challenge: string | null; scopes: DeletionScopes | null; confirmationPhrase: unknown } {
    if (!isRecord(body)) return { challenge: null, scopes: null, confirmationPhrase: null };
    return {
        challenge: readChallenge(body),
        scopes: normalizeDeletionScopes(body.scopes),
        confirmationPhrase: body.confirmationPhrase,
    };
}

function serializeStatus(status: DeletionStatus) {
    return {
        scopes: status.scopes,
        requestedAt: status.requestedAt.toISOString(),
        purgeAfter: status.purgeAfter.toISOString(),
    };
}

function handleStoreFailure(set: { status?: number | string }, error: unknown, fallbackMessage: string) {
    if (error instanceof AccountDeletionStoreError) {
        switch (error.code) {
            case "challenge_invalid":
            case "challenge_stale":
                return fail(set, 403, "Fresh sign-in is required. Please start again.");
            case "already_scheduled":
                return fail(set, 409, "A deletion is already scheduled. Cancel it before choosing again.");
            case "not_scheduled":
                return fail(set, 404, "No deletion is scheduled for this account.");
            case "scope_unavailable":
                return fail(set, 400, "This account has no data for one of the selected services.");
            case "service_unavailable":
                return fail(set, 503, "A linked service is temporarily unavailable. Nothing was changed.");
        }
    }

    logSafeFailure("change an account deletion", error);
    return fail(set, 500, fallbackMessage);
}

function fail(set: { status?: number | string }, status: number, error: string) {
    set.status = status;
    return { error };
}
