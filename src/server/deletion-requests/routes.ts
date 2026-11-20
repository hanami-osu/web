import { isRecord } from "@/lib/record";

import { auth, botAccountCompatibility, trustedOrigins } from "../auth";
import { botPrisma } from "../database/bot";
import { webPrisma } from "../database/web";
import { errorResponse, jsonResponse, logSafeFailure, readJson } from "../security/http";
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

export function createAccountDeletionHandlers(dependencies: AccountDeletionRouteDependencies = productionDependencies) {
    return {
        async startReauthentication(request: Request): Promise<Response> {
            const session = await dependencies.getSession(request.headers);
            if (!session) return errorResponse(401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return errorResponse(403, "This action could not be verified.");

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

                return jsonResponse({
                    reauthenticationRequired: !alreadyFresh,
                    confirmationPath: `/profile/privacy/confirm#challenge=${encodeURIComponent(challenge)}`,
                });
            } catch (error) {
                logSafeFailure("start account-deletion reauthentication", error);
                return errorResponse(500, "Reauthentication could not be started.");
            }
        },
        async completeReauthentication(request: Request): Promise<Response> {
            const session = await dependencies.getSession(request.headers);
            if (!session) return errorResponse(401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return errorResponse(403, "This action could not be verified.");

            const challenge = readChallenge(await readJson(request));
            if (!challenge) return errorResponse(400, "The reauthentication request is invalid.");

            try {
                const now = dependencies.now();
                const reauthenticatedAt = await dependencies.store.completeReauthentication({
                    userId: session.user.id,
                    tokenHash: await hashChallengeToken(challenge),
                    sessionCreatedAt: new Date(session.session.createdAt),
                    now,
                });
                return jsonResponse({ ready: true, reauthenticatedAt: reauthenticatedAt.toISOString() });
            } catch (error) {
                return handleStoreFailure(error, "Reauthentication could not be completed.");
            }
        },
        async getStatus(request: Request): Promise<Response> {
            const session = await dependencies.getSession(request.headers);
            if (!session) return errorResponse(401, "Sign in before continuing.");

            try {
                const status = await dependencies.store.getDeletionStatus(session.user.id);
                return jsonResponse({ scheduled: status ? serializeStatus(status) : null });
            } catch (error) {
                logSafeFailure("read the account-deletion status", error);
                return errorResponse(500, "The deletion status could not be loaded.");
            }
        },
        async schedule(request: Request): Promise<Response> {
            const session = await dependencies.getSession(request.headers);
            if (!session) return errorResponse(401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return errorResponse(403, "This action could not be verified.");

            const parsed = readScheduleBody(await readJson(request));
            if (!parsed.challenge) return errorResponse(400, "The reauthentication request is invalid.");
            if (!parsed.scopes) return errorResponse(400, "Choose what to delete.");
            if (!isValidConfirmationPhrase(parsed.confirmationPhrase)) {
                return errorResponse(400, "The confirmation phrase does not match.");
            }

            try {
                const status = await dependencies.store.scheduleDeletion({
                    userId: session.user.id,
                    tokenHash: await hashChallengeToken(parsed.challenge),
                    scopes: parsed.scopes,
                    now: dependencies.now(),
                });
                return jsonResponse({ scheduled: serializeStatus(status) });
            } catch (error) {
                return handleStoreFailure(error, "The deletion could not be scheduled.");
            }
        },
        async cancel(request: Request): Promise<Response> {
            const session = await dependencies.getSession(request.headers);
            if (!session) return errorResponse(401, "Sign in before continuing.");
            if (!hasValidOrigin(request)) return errorResponse(403, "This action could not be verified.");

            try {
                await dependencies.store.cancelDeletion(session.user.id);
                return jsonResponse({ cancelled: true });
            } catch (error) {
                return handleStoreFailure(error, "The deletion could not be cancelled.");
            }
        },
    };
}

export const accountDeletionHandlers = createAccountDeletionHandlers();

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

function handleStoreFailure(error: unknown, fallbackMessage: string) {
    if (error instanceof AccountDeletionStoreError) {
        switch (error.code) {
            case "challenge_invalid":
            case "challenge_stale":
                return errorResponse(403, "Fresh sign-in is required. Please start again.");
            case "already_scheduled":
                return errorResponse(409, "A deletion is already scheduled. Cancel it before choosing again.");
            case "not_scheduled":
                return errorResponse(404, "No deletion is scheduled for this account.");
            case "purge_started":
                return errorResponse(409, "Permanent deletion has already started.");
            case "scope_unavailable":
                return errorResponse(400, "This account has no data for one of the selected services.");
            case "service_unavailable":
                return errorResponse(503, "A linked service is temporarily unavailable. Nothing was changed.");
        }
    }

    logSafeFailure("change an account deletion", error);
    return errorResponse(500, fallbackMessage);
}
