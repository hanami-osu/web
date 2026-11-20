import { isRecord } from "@/lib/record";
import type { Prisma, PrismaClient } from "../../generated/prisma/web/client";
import { logSafeFailure } from "../security/http";
import { hashToken } from "../security/tokens";
import {
    addBankedDays,
    CLAIM_CODE_TTL_MS,
    createClaimCode,
    daysForUsdCents,
    describeBank,
    emptyBank,
    manualPaymentProvider,
    settleBank,
    type SupporterBank,
    type SupporterProvider,
    type SupporterStatusView,
} from "./domain";

type Transaction = Prisma.TransactionClient;

export type SupporterStoreErrorCode = "linked_to_another_account" | "claim_code_invalid";

export class SupporterStoreError extends Error {
    constructor(readonly code: SupporterStoreErrorCode) {
        super(code);
        this.name = "SupporterStoreError";
    }
}

export interface SupporterLinkView {
    provider: SupporterProvider;
    displayName: string | null;
    linkedAt: Date;
}

export interface SupporterOverview {
    status: SupporterStatusView;
    links: SupporterLinkView[];
}

interface ProviderIdentity {
    provider: SupporterProvider;
    providerUserId: string;
}

export interface LinkInput extends ProviderIdentity {
    userId: string;
    displayName: string | null;
    now: Date;
    hasSupported?: boolean;
}

export interface MembershipInput extends ProviderIdentity {
    active: boolean;
    now: Date;
}

export interface PaymentInput extends ProviderIdentity {
    externalId: string;
    amountCents: number;
    receivedAt: Date;
    now: Date;
}

export type SupporterBadgeDelivery = (userId: string) => Promise<boolean>;

function isRetryableWriteConflict(error: unknown): boolean {
    if (!isRecord(error)) return false;
    if (error.code === "P2034") return true;
    if (error.code !== "P2039" || !isRecord(error.meta)) return false;
    const adapterError = error.meta.driverAdapterError;
    return isRecord(adapterError) && isRecord(adapterError.cause) && adapterError.cause.code === 1020;
}

export class PrismaSupporterStore {
    constructor(
        private readonly prisma: PrismaClient,
        private readonly deliverBadge: SupporterBadgeDelivery | null = null,
    ) {}

    private async transact<T>(operation: (transaction: Transaction, changed: Set<string>) => Promise<T>): Promise<T> {
        for (let attempt = 0; ; attempt++) {
            const changed = new Set<string>();
            let result: T;
            try {
                result = await this.prisma.$transaction((transaction) => operation(transaction, changed), {
                    isolationLevel: "Serializable",
                });
            } catch (error) {
                if (attempt < 4 && isRetryableWriteConflict(error)) continue;
                throw error;
            }
            for (const userId of changed) await this.syncBadge(userId);
            return result;
        }
    }

    private async syncBadge(userId: string): Promise<void> {
        if (!this.deliverBadge) return;
        try {
            const status = await this.prisma.supporterStatus.findUnique({ where: { userId } });
            if (!status?.badgeSince || status.osuGuessrBadgeSynced) return;
            if (await this.deliverBadge(userId)) {
                await this.prisma.supporterStatus.updateMany({ where: { userId }, data: { osuGuessrBadgeSynced: true } });
            }
        } catch (error) {
            logSafeFailure("push a supporter badge", error);
        }
    }

    async retryPendingBadgeSync(): Promise<void> {
        if (!this.deliverBadge) return;
        const pending = await this.prisma.supporterStatus.findMany({
            where: { badgeSince: { not: null }, osuGuessrBadgeSynced: false },
            select: { userId: true },
        });
        for (const { userId } of pending) await this.syncBadge(userId);
    }

    async getOverview(userId: string, now: Date): Promise<SupporterOverview> {
        const [status, links] = await Promise.all([
            this.prisma.supporterStatus.findUnique({ where: { userId } }),
            this.prisma.supporterLink.findMany({
                where: { userId },
                select: { provider: true, displayName: true, linkedAt: true },
                orderBy: { linkedAt: "asc" },
            }),
        ]);
        return {
            status: describeBank(status, now),
            links: links.map((link) => ({ ...link, provider: link.provider as SupporterProvider })),
        };
    }

    async getStatus(userId: string, now: Date): Promise<SupporterStatusView> {
        return describeBank(await this.prisma.supporterStatus.findUnique({ where: { userId } }), now);
    }

    /** Links a provider account and credits any payments it made before it was linked. */
    async link(input: LinkInput): Promise<void> {
        await this.transact(async (transaction, changed) => {
            await this.linkInTransaction(transaction, changed, input);
        });
    }

    async unlink(userId: string, provider: SupporterProvider, now: Date): Promise<boolean> {
        return this.transact(async (transaction, changed) => {
            const { count } = await transaction.supporterLink.deleteMany({ where: { userId, provider } });
            if (count > 0) await this.updateBank(transaction, changed, userId, now, (bank) => bank);
            return count > 0;
        });
    }

    async recordMembership(input: MembershipInput): Promise<void> {
        await this.transact(async (transaction, changed) => {
            await transaction.supporterMembership.upsert({
                where: { provider_providerUserId: { provider: input.provider, providerUserId: input.providerUserId } },
                update: { active: input.active, updatedAt: input.now },
                create: {
                    id: crypto.randomUUID(),
                    provider: input.provider,
                    providerUserId: input.providerUserId,
                    active: input.active,
                    updatedAt: input.now,
                },
            });
            const userId = await findLinkedUser(transaction, input);
            if (userId) await this.updateBank(transaction, changed, userId, input.now, (bank) => bank);
        });
    }

    /** Records a one-time payment. Replays of the same external ID are ignored. */
    async recordPayment(input: PaymentInput): Promise<void> {
        await this.transact(async (transaction, changed) => {
            const existing = await transaction.supporterPayment.findUnique({
                where: { provider_externalId: { provider: input.provider, externalId: input.externalId } },
                select: { creditedUserId: true },
            });
            if (existing) {
                if (existing.creditedUserId) changed.add(existing.creditedUserId);
                return;
            }

            const userId = await findLinkedUser(transaction, input);
            const days = daysForUsdCents(input.amountCents);
            await transaction.supporterPayment.create({
                data: {
                    id: crypto.randomUUID(),
                    provider: input.provider,
                    externalId: input.externalId,
                    providerUserId: input.providerUserId,
                    amountCents: input.amountCents,
                    days,
                    receivedAt: input.receivedAt,
                    creditedUserId: userId,
                },
            });
            if (userId) await this.updateBank(transaction, changed, userId, input.now, (bank) => addBankedDays(bank, days, input.now));
        });
    }

    /** Takes refunded days back. The badge stays. */
    async refundPayment(provider: SupporterProvider, externalId: string, now: Date): Promise<void> {
        await this.transact(async (transaction, changed) => {
            const payment = await transaction.supporterPayment.findUnique({
                where: { provider_externalId: { provider, externalId } },
            });
            if (!payment || payment.refundedAt) return;

            await transaction.supporterPayment.update({ where: { id: payment.id }, data: { refundedAt: now } });
            if (payment.creditedUserId) {
                await this.updateBank(transaction, changed, payment.creditedUserId, now, (bank) => ({
                    ...bank,
                    bankedSeconds: Math.max(0, bank.bankedSeconds - payment.days * 86_400),
                }));
            }
        });
    }

    /** Hand-granted supporter time or badge, for past donors and contributors. */
    async grant(input: { userId: string; amountCents: number; days: number; now: Date }): Promise<void> {
        await this.transact(async (transaction, changed) => {
            await transaction.supporterPayment.create({
                data: {
                    id: crypto.randomUUID(),
                    provider: manualPaymentProvider,
                    externalId: crypto.randomUUID(),
                    providerUserId: input.userId,
                    amountCents: input.amountCents,
                    days: input.days,
                    receivedAt: input.now,
                    creditedUserId: input.userId,
                },
            });
            await this.updateBank(transaction, changed, input.userId, input.now, (bank) => addBankedDays(bank, input.days, input.now));
        });
    }

    /** Issues a new Buy Me a Coffee claim code and retires the user's previous unused ones. */
    async createClaimCode(userId: string, now: Date): Promise<{ code: string; expiresAt: Date }> {
        const code = createClaimCode();
        const expiresAt = new Date(now.getTime() + CLAIM_CODE_TTL_MS);
        await this.prisma.$transaction(async (transaction) => {
            await transaction.supporterClaimCode.deleteMany({ where: { userId, consumedAt: null } });
            await transaction.supporterClaimCode.create({
                data: { id: crypto.randomUUID(), userId, codeHash: await hashToken(code), createdAt: now, expiresAt },
            });
        });
        return { code, expiresAt };
    }

    /** Links a Buy Me a Coffee supporter to the account that issued the claim code. */
    async claimWithCode(input: { code: string; providerUserId: string; displayName: string | null; now: Date }): Promise<void> {
        const codeHash = await hashToken(input.code);
        await this.transact(async (transaction, changed) => {
            const claim = await transaction.supporterClaimCode.findUnique({ where: { codeHash } });
            if (claim?.consumedAt) {
                // Later events for the same membership repeat the note; they're fine if this supporter is already linked.
                const linked = await findLinkedUser(transaction, { provider: "bmc", providerUserId: input.providerUserId });
                if (linked === claim.userId) return;
            }
            if (!claim || claim.consumedAt || claim.expiresAt <= input.now) throw new SupporterStoreError("claim_code_invalid");

            await transaction.supporterClaimCode.update({ where: { id: claim.id }, data: { consumedAt: input.now } });
            await this.linkInTransaction(transaction, changed, {
                userId: claim.userId,
                provider: "bmc",
                providerUserId: input.providerUserId,
                displayName: input.displayName,
                now: input.now,
            });
        });
    }

    private async linkInTransaction(transaction: Transaction, changed: Set<string>, input: LinkInput): Promise<void> {
        const existing = await transaction.supporterLink.findUnique({
            where: { provider_providerUserId: { provider: input.provider, providerUserId: input.providerUserId } },
        });
        if (existing && existing.userId !== input.userId) throw new SupporterStoreError("linked_to_another_account");

        if (existing) {
            await transaction.supporterLink.update({ where: { id: existing.id }, data: { displayName: input.displayName } });
        } else {
            await transaction.supporterLink.deleteMany({ where: { userId: input.userId, provider: input.provider } });
            await transaction.supporterLink.create({
                data: {
                    id: crypto.randomUUID(),
                    userId: input.userId,
                    provider: input.provider,
                    providerUserId: input.providerUserId,
                    displayName: input.displayName,
                    linkedAt: input.now,
                },
            });
        }

        const pending = await transaction.supporterPayment.findMany({
            where: { provider: input.provider, providerUserId: input.providerUserId, creditedUserId: null, refundedAt: null },
            select: { id: true, days: true },
        });
        if (pending.length > 0) {
            await transaction.supporterPayment.updateMany({
                where: { id: { in: pending.map((payment) => payment.id) } },
                data: { creditedUserId: input.userId },
            });
        }
        const days = pending.reduce((total, payment) => total + payment.days, 0);
        await this.updateBank(transaction, changed, input.userId, input.now, (bank) => {
            const credited = pending.length > 0 ? addBankedDays(bank, days, input.now) : bank;
            return input.hasSupported ? { ...credited, badgeSince: credited.badgeSince ?? input.now } : credited;
        });
    }

    /** Settles banked time under the old membership state, applies the change, then recomputes the membership state. */
    private async updateBank(
        transaction: Transaction,
        changed: Set<string>,
        userId: string,
        now: Date,
        change: (bank: SupporterBank) => SupporterBank,
    ): Promise<void> {
        const stored = await transaction.supporterStatus.findUnique({ where: { userId } });
        const updated = change(settleBank(stored ?? emptyBank(now), now));
        const membershipActive = await hasActiveMembership(transaction, userId);
        const next: SupporterBank = {
            ...updated,
            membershipActive,
            badgeSince: updated.badgeSince ?? (membershipActive ? now : null),
        };
        if (!stored && next.badgeSince === null && next.bankedSeconds === 0 && !membershipActive) return;
        changed.add(userId);

        await transaction.supporterStatus.upsert({
            where: { userId },
            update: next,
            create: { userId, ...next },
        });
    }
}

async function findLinkedUser(transaction: Transaction, identity: ProviderIdentity): Promise<string | null> {
    const link = await transaction.supporterLink.findUnique({
        where: { provider_providerUserId: { provider: identity.provider, providerUserId: identity.providerUserId } },
        select: { userId: true },
    });
    return link?.userId ?? null;
}

async function hasActiveMembership(transaction: Transaction, userId: string): Promise<boolean> {
    const links = await transaction.supporterLink.findMany({ where: { userId }, select: { provider: true, providerUserId: true } });
    if (links.length === 0) return false;
    const active = await transaction.supporterMembership.count({
        where: { active: true, OR: links.map((link) => ({ provider: link.provider, providerUserId: link.providerUserId })) },
    });
    return active > 0;
}

/** Deletes supporter records tied to a user. Links, status and claim codes also cascade with the user row. */
export async function deleteSupporterData(transaction: Transaction, userId: string): Promise<void> {
    const links = await transaction.supporterLink.findMany({ where: { userId }, select: { provider: true, providerUserId: true } });
    const identities = links.map((link) => ({ provider: link.provider, providerUserId: link.providerUserId }));
    await transaction.supporterPayment.deleteMany({
        where: { OR: [{ creditedUserId: userId }, ...identities] },
    });
    if (identities.length > 0) await transaction.supporterMembership.deleteMany({ where: { OR: identities } });
}
