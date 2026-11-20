import type { Prisma, PrismaClient } from "../../generated/prisma/web/client";

import { safelyEqualHashes } from "../security/tokens";
import { deleteSupporterData } from "../supporter/store";
import { DELETION_GRACE_PERIOD_MS, REAUTHENTICATION_WINDOW_MS, type DeletionScopes } from "./domain";
import type { OsuGuessrDeletionClient } from "./osu-guessr";

const LINKED_DELETION_TRANSACTION_TIMEOUT_MS = 30_000;

export type AccountDeletionFailureCode =
    | "already_scheduled"
    | "challenge_invalid"
    | "challenge_stale"
    | "not_scheduled"
    | "purge_started"
    | "scope_unavailable"
    | "service_unavailable";

export class AccountDeletionStoreError extends Error {
    constructor(public readonly code: AccountDeletionFailureCode) {
        super(code);
        this.name = "AccountDeletionStoreError";
    }
}

export interface DeletionStatus {
    scopes: DeletionScopes;
    requestedAt: Date;
    purgeAfter: Date;
}

export interface AccountDeletionStore {
    startReauthentication(input: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean }): Promise<void>;
    completeReauthentication(input: { userId: string; tokenHash: string; sessionCreatedAt: Date; now: Date }): Promise<Date>;
    scheduleDeletion(input: { userId: string; tokenHash: string; scopes: DeletionScopes; now: Date }): Promise<DeletionStatus>;
    cancelDeletion(userId: string): Promise<void>;
    getDeletionStatus(userId: string): Promise<DeletionStatus | null>;
}

export interface BotDeletionService {
    /** Stops the Bot from using the linked osu! ID while keeping its preferences. */
    pauseLink(discordId: string): Promise<void>;
    /** Re-mirrors the Bot link from the user's current Hanami sign-in methods. */
    restoreLink(userId: string): Promise<void>;
    deleteUser(discordId: string): Promise<void>;
}

export interface LinkedDeletionServices {
    bot: BotDeletionService;
    osuGuessr: OsuGuessrDeletionClient;
}

export interface PurgeResult {
    purged: number;
    failed: number;
}

type ScheduleRow = {
    deleteAccount: boolean;
    deleteBot: boolean;
    deleteOsuGuessr: boolean;
    requestedAt: Date;
    purgeAfter: Date;
};

export class PrismaDeletionRequestStore implements AccountDeletionStore {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly services: LinkedDeletionServices,
    ) {}

    async startReauthentication(input: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean }): Promise<void> {
        const expiresAt = new Date(input.now.getTime() + REAUTHENTICATION_WINDOW_MS);
        const reauthenticatedAt = input.alreadyFresh ? input.now : null;

        await this.prisma.accountDeletionReauthChallenge.upsert({
            where: { userId: input.userId },
            create: {
                id: crypto.randomUUID(),
                userId: input.userId,
                tokenHash: input.tokenHash,
                createdAt: input.now,
                expiresAt,
                reauthenticatedAt,
            },
            update: {
                tokenHash: input.tokenHash,
                createdAt: input.now,
                expiresAt,
                reauthenticatedAt,
                consumedAt: null,
            },
        });
    }

    async completeReauthentication(input: { userId: string; tokenHash: string; sessionCreatedAt: Date; now: Date }): Promise<Date> {
        return this.prisma.$transaction(async (transaction) => {
            const challenge = await getChallenge(transaction, input.userId, input.tokenHash);
            assertChallengeUsable(challenge, input.now);

            if (challenge.reauthenticatedAt) return challenge.reauthenticatedAt;
            if (input.sessionCreatedAt.getTime() < challenge.createdAt.getTime() - 5_000) {
                throw new AccountDeletionStoreError("challenge_stale");
            }

            const result = await transaction.accountDeletionReauthChallenge.updateMany({
                where: { id: challenge.id, reauthenticatedAt: null, consumedAt: null },
                data: { reauthenticatedAt: input.now },
            });
            if (result.count !== 1) throw new AccountDeletionStoreError("challenge_invalid");
            return input.now;
        });
    }

    async scheduleDeletion(input: { userId: string; tokenHash: string; scopes: DeletionScopes; now: Date }): Promise<DeletionStatus> {
        await assertReauthenticated(this.prisma, input.userId, input.tokenHash, input.now);
        if (await this.prisma.accountDeletionSchedule.count({ where: { userId: input.userId } })) {
            throw new AccountDeletionStoreError("already_scheduled");
        }

        const { discordId, osuId } = await this.getProviderIds(input.userId);
        const scopes = resolveScopes(input.scopes, { discordId, osuId });

        await this.hideLinkedData(scopes, { discordId, osuId });

        const purgeAfter = new Date(input.now.getTime() + DELETION_GRACE_PERIOD_MS);
        try {
            await this.prisma.$transaction(async (transaction) => {
                const challenge = await getChallenge(transaction, input.userId, input.tokenHash);
                assertChallengeUsable(challenge, input.now);
                const consumed = await transaction.accountDeletionReauthChallenge.updateMany({
                    where: { id: challenge.id, consumedAt: null },
                    data: { consumedAt: input.now },
                });
                if (consumed.count !== 1) throw new AccountDeletionStoreError("challenge_invalid");

                await transaction.accountDeletionSchedule.create({
                    data: {
                        id: crypto.randomUUID(),
                        userId: input.userId,
                        deleteAccount: scopes.account,
                        deleteBot: scopes.bot,
                        deleteOsuGuessr: scopes.osuGuessr,
                        discordId,
                        osuId,
                        requestedAt: input.now,
                        purgeAfter,
                    },
                });

                if (scopes.account) {
                    // Sign the account out everywhere, including apps signed in through Hanami, until it is restored.
                    await transaction.oauthAccessToken.deleteMany({ where: { userId: input.userId } });
                    await transaction.oauthRefreshToken.deleteMany({ where: { userId: input.userId } });
                    await transaction.oauthConsent.deleteMany({ where: { userId: input.userId } });
                    await transaction.session.deleteMany({ where: { userId: input.userId } });
                }
            });
        } catch (error) {
            await this.restoreLinkedData(input.userId, scopes, osuId).catch(() => undefined);
            throw error;
        }

        return { scopes, requestedAt: input.now, purgeAfter };
    }

    async cancelDeletion(userId: string): Promise<void> {
        const schedule = await this.prisma.accountDeletionSchedule.findUnique({ where: { userId } });
        if (!schedule) throw new AccountDeletionStoreError("not_scheduled");
        if (schedule.lastAttemptAt) throw new AccountDeletionStoreError("purge_started");

        const cancelled = await this.prisma.$transaction(
            async (transaction) => {
                // Claim cancellation before touching linked data. A failed restore rolls the deletion back.
                const removed = await transaction.accountDeletionSchedule.deleteMany({ where: { id: schedule.id, lastAttemptAt: null } });
                if (removed.count === 0) return false;

                await this.restoreLinkedData(userId, toScopes(schedule), schedule.osuId).catch(() => {
                    throw new AccountDeletionStoreError("service_unavailable");
                });
                return true;
            },
            { timeout: LINKED_DELETION_TRANSACTION_TIMEOUT_MS },
        );

        if (!cancelled) {
            const stillScheduled = await this.prisma.accountDeletionSchedule.count({ where: { id: schedule.id } });
            throw new AccountDeletionStoreError(stillScheduled ? "purge_started" : "not_scheduled");
        }
    }

    async getDeletionStatus(userId: string): Promise<DeletionStatus | null> {
        const schedule = await this.prisma.accountDeletionSchedule.findUnique({ where: { userId } });
        return schedule ? toStatus(schedule) : null;
    }

    /** Permanently deletes every schedule whose grace period has ended. Failed rows are retried on the next run. */
    async purgeDue(now: Date, limit = 25): Promise<PurgeResult> {
        const due = await this.prisma.accountDeletionSchedule.findMany({
            where: { purgeAfter: { lte: now } },
            orderBy: { purgeAfter: "asc" },
            take: limit,
        });

        const result: PurgeResult = { purged: 0, failed: 0 };
        for (const schedule of due) {
            let stage = "web";
            try {
                // Commit this before any permanent deletion so a partial purge or crash cannot reopen cancellation.
                const claimed = await this.prisma.accountDeletionSchedule.updateMany({
                    where: { id: schedule.id },
                    data: { lastAttemptAt: now },
                });
                if (claimed.count === 0) continue;

                const purged = await this.prisma.$transaction(
                    async (transaction) => {
                        // Only one worker may run the linked purge for this schedule at a time.
                        const locked = await transaction.$queryRaw<{ id: string }[]>`
                            SELECT id FROM accountDeletionSchedule WHERE id = ${schedule.id} FOR UPDATE
                        `;
                        if (locked.length === 0) return false;

                        stage = "osu_guessr";
                        if (schedule.deleteOsuGuessr && schedule.osuId) await this.services.osuGuessr(schedule.osuId, "purge");
                        stage = "bot";
                        if (schedule.deleteBot && schedule.discordId) await this.services.bot.deleteUser(schedule.discordId);
                        stage = "web";
                        if (schedule.deleteAccount) {
                            // Refresh tokens block user deletion (ON DELETE RESTRICT); access tokens and consents would otherwise
                            // survive with their user link cleared. Deleting the user cascades to the schedule row.
                            await transaction.oauthAccessToken.deleteMany({ where: { userId: schedule.userId } });
                            await transaction.oauthRefreshToken.deleteMany({ where: { userId: schedule.userId } });
                            await transaction.oauthConsent.deleteMany({ where: { userId: schedule.userId } });
                            await deleteSupporterData(transaction, schedule.userId);
                            await transaction.user.deleteMany({ where: { id: schedule.userId } });
                        } else {
                            await transaction.accountDeletionSchedule.deleteMany({ where: { id: schedule.id } });
                        }
                        return true;
                    },
                    { timeout: LINKED_DELETION_TRANSACTION_TIMEOUT_MS },
                );
                if (purged) result.purged += 1;
            } catch {
                result.failed += 1;
                await this.prisma.accountDeletionSchedule
                    .updateMany({ where: { id: schedule.id, lastAttemptAt: now }, data: { lastError: `${stage}_failed` } })
                    .catch(() => undefined);
            }
        }
        return result;
    }

    private async getProviderIds(userId: string): Promise<{ discordId: string | null; osuId: string | null }> {
        const accounts = await this.prisma.account.findMany({
            where: { userId, providerId: { in: ["discord", "osu"] } },
            select: { providerId: true, accountId: true },
        });
        return {
            discordId: accounts.find((account) => account.providerId === "discord")?.accountId ?? null,
            osuId: accounts.find((account) => account.providerId === "osu")?.accountId ?? null,
        };
    }

    private async hideLinkedData(scopes: DeletionScopes, ids: { discordId: string | null; osuId: string | null }): Promise<void> {
        try {
            if (scopes.osuGuessr && ids.osuId) await this.services.osuGuessr(ids.osuId, "hide");
            if (scopes.bot && ids.discordId) await this.services.bot.pauseLink(ids.discordId);
        } catch {
            if (scopes.osuGuessr && ids.osuId) await this.services.osuGuessr(ids.osuId, "restore").catch(() => undefined);
            throw new AccountDeletionStoreError("service_unavailable");
        }
    }

    private async restoreLinkedData(userId: string, scopes: DeletionScopes, osuId: string | null): Promise<void> {
        if (scopes.osuGuessr && osuId) await this.services.osuGuessr(osuId, "restore");
        if (scopes.bot) await this.services.bot.restoreLink(userId);
    }
}

/** Bot data only exists for Discord-linked accounts and osu!guessr data only for osu!-linked ones. */
function resolveScopes(requested: DeletionScopes, ids: { discordId: string | null; osuId: string | null }): DeletionScopes {
    if (requested.osuGuessr && !ids.osuId) throw new AccountDeletionStoreError("scope_unavailable");
    if (requested.bot && !ids.discordId && !requested.account) throw new AccountDeletionStoreError("scope_unavailable");
    return { ...requested, bot: requested.bot && ids.discordId !== null };
}

async function assertReauthenticated(prisma: PrismaClient, userId: string, tokenHash: string, now: Date): Promise<void> {
    const challenge = await getChallenge(prisma, userId, tokenHash);
    assertChallengeUsable(challenge, now);
    if (!challenge.reauthenticatedAt || now.getTime() - challenge.reauthenticatedAt.getTime() >= REAUTHENTICATION_WINDOW_MS) {
        throw new AccountDeletionStoreError("challenge_stale");
    }
}

async function getChallenge(prisma: Prisma.TransactionClient, userId: string, tokenHash: string) {
    const challenge = await prisma.accountDeletionReauthChallenge.findUnique({
        where: { userId },
        select: { id: true, createdAt: true, expiresAt: true, reauthenticatedAt: true, consumedAt: true, tokenHash: true },
    });
    if (!challenge || !safelyEqualHashes(challenge.tokenHash, tokenHash)) throw new AccountDeletionStoreError("challenge_invalid");
    return challenge;
}

function assertChallengeUsable(challenge: { consumedAt: Date | null; expiresAt: Date }, now: Date): void {
    if (challenge.consumedAt) throw new AccountDeletionStoreError("challenge_invalid");
    if (challenge.expiresAt.getTime() <= now.getTime()) throw new AccountDeletionStoreError("challenge_stale");
}

function toScopes(schedule: Pick<ScheduleRow, "deleteAccount" | "deleteBot" | "deleteOsuGuessr">): DeletionScopes {
    return { account: schedule.deleteAccount, bot: schedule.deleteBot, osuGuessr: schedule.deleteOsuGuessr };
}

function toStatus(schedule: ScheduleRow): DeletionStatus {
    return { scopes: toScopes(schedule), requestedAt: schedule.requestedAt, purgeAfter: schedule.purgeAfter };
}
