import { createHmac } from "node:crypto";
import { describe, expect, test } from "bun:test";

import { parseBmcEvent, parseGithubSponsorship, readGithubSignature, verifyHmacSignature } from "./webhooks";

const now = new Date("2026-11-17T12:00:00Z");

describe("webhook signatures", () => {
    test("accepts a matching HMAC and rejects anything else", () => {
        const body = JSON.stringify({ hello: "world" });
        const signature = createHmac("sha256", "secret").update(body).digest("hex");

        expect(verifyHmacSignature("secret", body, signature)).toBe(true);
        expect(verifyHmacSignature("secret", body, signature.toUpperCase())).toBe(true);
        expect(verifyHmacSignature("other", body, signature)).toBe(false);
        expect(verifyHmacSignature("secret", `${body} `, signature)).toBe(false);
        expect(verifyHmacSignature("", body, signature)).toBe(false);
        expect(verifyHmacSignature("secret", body, null)).toBe(false);
    });

    test("reads GitHub's prefixed signature header", () => {
        expect(readGithubSignature("sha256=abc")).toBe("abc");
        expect(readGithubSignature("sha1=abc")).toBeNull();
        expect(readGithubSignature(null)).toBeNull();
    });
});

describe("GitHub sponsorships", () => {
    const sponsorship = (action: string, tier: Record<string, unknown>) => ({
        action,
        sponsorship: {
            node_id: "S_123",
            created_at: "2026-11-17T10:00:00Z",
            sponsor: { id: 42, login: "octocat" },
            tier,
        },
    });

    test("treats a recurring sponsorship as a membership", () => {
        expect(parseGithubSponsorship(sponsorship("created", { is_one_time: false, monthly_price_in_cents: 300 }), now)).toEqual({
            kind: "membership",
            providerUserId: "42",
            displayName: "octocat",
            active: true,
            claimCode: null,
        });
        expect(parseGithubSponsorship(sponsorship("pending_cancellation", { is_one_time: false }), now)).toMatchObject({ active: true });
        expect(parseGithubSponsorship(sponsorship("cancelled", { is_one_time: false }), now)).toMatchObject({ active: false });
    });

    test("treats a one-time sponsorship as a payment", () => {
        expect(parseGithubSponsorship(sponsorship("created", { is_one_time: true, monthly_price_in_cents: 1500 }), now)).toEqual({
            kind: "payment",
            providerUserId: "42",
            displayName: "octocat",
            externalId: "S_123:2026-11-17T10:00:00.000Z",
            amountCents: 1500,
            receivedAt: new Date("2026-11-17T10:00:00Z"),
            claimCode: null,
        });
        expect(parseGithubSponsorship(sponsorship("cancelled", { is_one_time: true }), now)).toBeNull();
    });
});

describe("Buy Me a Coffee events", () => {
    test("reads a USD donation with its claim code", () => {
        const event = parseBmcEvent(
            {
                type: "donation.created",
                data: {
                    id: 98765,
                    supporter_id: 42,
                    supporter_name: "Alex",
                    support_note: "HANAMI-ABCD2345 love the site",
                    amount: 15,
                    currency: "USD",
                    created_at: 1_719_825_600,
                },
            },
            now,
        );
        expect(event).toEqual({
            kind: "payment",
            providerUserId: "42",
            displayName: "Alex",
            externalId: "98765",
            amountCents: 1500,
            receivedAt: new Date(1_719_825_600_000),
            claimCode: "HANAMI-ABCD2345",
        });
    });

    test("skips donations in other currencies", () => {
        expect(parseBmcEvent({ type: "donation.created", data: { id: 1, supporter_id: 2, amount: 5, currency: "EUR" } }, now)).toBeNull();
    });

    test("reads refunds and memberships", () => {
        expect(parseBmcEvent({ type: "donation.refunded", data: { id: 98765 } }, now)).toEqual({ kind: "refund", externalId: "98765" });
        expect(parseBmcEvent({ type: "membership.started", data: { supporter_id: 42, status: "active" } }, now)).toMatchObject({
            kind: "membership",
            providerUserId: "42",
            active: true,
        });
        expect(parseBmcEvent({ type: "membership.cancelled", data: { supporter_id: 42, status: "canceled" } }, now)).toMatchObject({
            active: false,
        });
        expect(parseBmcEvent({ type: "recurring_donation.updated", data: { supporter_id: 42, status: "paused" } }, now)).toMatchObject({
            active: false,
        });
    });

    test("ignores shop purchases", () => {
        expect(parseBmcEvent({ type: "extra_purchase.created", data: { supporter_id: 42 } }, now)).toBeNull();
    });
});
