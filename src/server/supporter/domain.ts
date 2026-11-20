export const supporterProviders = ["github", "bmc"] as const;
export type SupporterProvider = (typeof supporterProviders)[number];
export type LinkableSupporterProvider = Exclude<SupporterProvider, "bmc">;

/** Manual grants (past donors, contributors) are stored as payments under this provider. */
export const manualPaymentProvider = "manual";

const SECONDS_PER_DAY = 86_400;
const CLAIM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CLAIM_CODE_LENGTH = 8;
const CLAIM_CODE_PATTERN = new RegExp(`HANAMI-([${CLAIM_CODE_ALPHABET}]{${CLAIM_CODE_LENGTH}})`, "i");
export const CLAIM_CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface SupporterBank {
    badgeSince: Date | null;
    bankedSeconds: number;
    bankUpdatedAt: Date;
    membershipActive: boolean;
}

export interface SupporterStatusView {
    badge: boolean;
    active: boolean;
    membershipActive: boolean;
    /** When donated time runs out. Null while a membership is active (banked time waits) or nothing is banked. */
    activeUntil: Date | null;
    bankedDays: number;
}

export function isSupporterProvider(value: unknown): value is SupporterProvider {
    return typeof value === "string" && (supporterProviders as readonly string[]).includes(value);
}

export function isLinkableSupporterProvider(value: unknown): value is LinkableSupporterProvider {
    return value === "github";
}

/** $3 buys one month, so every whole dollar is 10 days. */
export function daysForUsdCents(amountCents: number): number {
    if (!Number.isFinite(amountCents) || amountCents <= 0) return 0;
    return Math.floor(amountCents / 10);
}

export function emptyBank(now: Date): SupporterBank {
    return { badgeSince: null, bankedSeconds: 0, bankUpdatedAt: now, membershipActive: false };
}

/** Banked time only runs down while no membership is active. */
export function settleBank(bank: SupporterBank, now: Date): SupporterBank {
    if (bank.membershipActive) return { ...bank, bankUpdatedAt: now };
    const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - bank.bankUpdatedAt.getTime()) / 1000));
    return { ...bank, bankedSeconds: Math.max(0, bank.bankedSeconds - elapsedSeconds), bankUpdatedAt: now };
}

export function addBankedDays(bank: SupporterBank, days: number, now: Date): SupporterBank {
    const bankedSeconds = Math.max(0, bank.bankedSeconds + days * SECONDS_PER_DAY);
    const badgeSince = bank.badgeSince ?? (days >= 0 ? now : null);
    return { ...bank, bankedSeconds, badgeSince };
}

export function describeBank(bank: SupporterBank | null, now: Date): SupporterStatusView {
    if (!bank) return { badge: false, active: false, membershipActive: false, activeUntil: null, bankedDays: 0 };
    const settled = settleBank(bank, now);
    const banked = settled.bankedSeconds > 0;
    return {
        badge: settled.badgeSince !== null,
        active: settled.membershipActive || banked,
        membershipActive: settled.membershipActive,
        activeUntil: !settled.membershipActive && banked ? new Date(now.getTime() + settled.bankedSeconds * 1000) : null,
        bankedDays: Math.floor(settled.bankedSeconds / SECONDS_PER_DAY),
    };
}

export function createClaimCode(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(CLAIM_CODE_LENGTH));
    const body = Array.from(bytes, (byte) => CLAIM_CODE_ALPHABET[byte % CLAIM_CODE_ALPHABET.length]).join("");
    return `HANAMI-${body}`;
}

/** Finds a claim code in free text such as a Buy Me a Coffee support note. */
export function findClaimCode(text: unknown): string | null {
    if (typeof text !== "string") return null;
    const match = CLAIM_CODE_PATTERN.exec(text);
    return match ? `HANAMI-${match[1].toUpperCase()}` : null;
}
