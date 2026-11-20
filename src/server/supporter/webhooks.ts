import { createHmac, timingSafeEqual } from "node:crypto";

import { isRecord } from "@/lib/record";

import { findClaimCode } from "./domain";

export type SupporterWebhookEvent =
    | { kind: "membership"; providerUserId: string; displayName: string | null; active: boolean; claimCode: string | null }
    | {
          kind: "payment";
          providerUserId: string;
          displayName: string | null;
          externalId: string;
          amountCents: number;
          receivedAt: Date;
          claimCode: string | null;
      }
    | { kind: "refund"; externalId: string };

/** Compares a hex HMAC-SHA256 digest of the raw body in constant time. */
export function verifyHmacSignature(secret: string, rawBody: string, signature: string | null): boolean {
    if (!secret || !signature) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const expectedBuffer = Buffer.from(expected, "utf8");
    const actualBuffer = Buffer.from(signature.trim().toLowerCase(), "utf8");
    return expectedBuffer.byteLength === actualBuffer.byteLength && timingSafeEqual(expectedBuffer, actualBuffer);
}

/** GitHub sends `sha256=<hex>` in X-Hub-Signature-256. */
export function readGithubSignature(header: string | null): string | null {
    return header?.startsWith("sha256=") ? header.slice("sha256=".length) : null;
}

/** Parses a GitHub `sponsorship` webhook. Recurring sponsorships are memberships; one-time ones are payments. */
export function parseGithubSponsorship(payload: unknown, now: Date): SupporterWebhookEvent | null {
    if (!isRecord(payload) || typeof payload.action !== "string" || !isRecord(payload.sponsorship)) return null;
    const sponsorship = payload.sponsorship;
    const sponsor = isRecord(sponsorship.sponsor) ? sponsorship.sponsor : null;
    const tier = isRecord(sponsorship.tier) ? sponsorship.tier : null;
    if (!sponsor || !tier || (typeof sponsor.id !== "number" && typeof sponsor.id !== "string")) return null;

    const providerUserId = String(sponsor.id);
    const displayName = typeof sponsor.login === "string" ? sponsor.login : null;

    if (tier.is_one_time === true) {
        if (payload.action !== "created" || typeof sponsorship.node_id !== "string") return null;
        const amountCents = typeof tier.monthly_price_in_cents === "number" ? tier.monthly_price_in_cents : 0;
        const createdAt = typeof sponsorship.created_at === "string" ? new Date(sponsorship.created_at) : now;
        const receivedAt = Number.isNaN(createdAt.getTime()) ? now : createdAt;
        return {
            kind: "payment",
            providerUserId,
            displayName,
            externalId: `${sponsorship.node_id}:${receivedAt.toISOString()}`,
            amountCents,
            receivedAt,
            claimCode: null,
        };
    }

    // `pending_cancellation` and `pending_tier_change` keep the sponsorship active until the billing period ends,
    // when GitHub sends `cancelled` or `tier_changed`.
    switch (payload.action) {
        case "created":
        case "edited":
        case "tier_changed":
        case "pending_cancellation":
        case "pending_tier_change":
            return { kind: "membership", providerUserId, displayName, active: true, claimCode: null };
        case "cancelled":
            return { kind: "membership", providerUserId, displayName, active: false, claimCode: null };
        default:
            return null;
    }
}

/**
 * Parses a Buy Me a Coffee webhook. Memberships and monthly support count as memberships; donations as payments.
 * Payments in a currency other than USD are skipped, since $1 = 10 days only makes sense in dollars.
 */
export function parseBmcEvent(payload: unknown, now: Date): SupporterWebhookEvent | null {
    if (!isRecord(payload) || typeof payload.type !== "string" || !isRecord(payload.data)) return null;
    const data = payload.data;
    const supporterId = typeof data.supporter_id === "number" || typeof data.supporter_id === "string" ? String(data.supporter_id) : null;
    const displayName = typeof data.supporter_name === "string" ? data.supporter_name : null;
    const claimCode = findClaimCode(data.support_note);

    if (payload.type.startsWith("membership.") || payload.type.startsWith("recurring_donation.")) {
        if (!supporterId) return null;
        return { kind: "membership", providerUserId: supporterId, displayName, active: data.status === "active", claimCode };
    }

    if (payload.type === "donation.refunded") {
        return typeof data.id === "number" || typeof data.id === "string" ? { kind: "refund", externalId: String(data.id) } : null;
    }

    if (payload.type === "donation.created") {
        if (!supporterId || (typeof data.id !== "number" && typeof data.id !== "string")) return null;
        if (typeof data.amount !== "number" || typeof data.currency !== "string" || data.currency.toUpperCase() !== "USD") return null;
        const receivedAt = typeof data.created_at === "number" ? new Date(data.created_at * 1000) : now;
        return {
            kind: "payment",
            providerUserId: supporterId,
            displayName,
            externalId: String(data.id),
            amountCents: Math.round(data.amount * 100),
            receivedAt,
            claimCode,
        };
    }

    return null;
}
