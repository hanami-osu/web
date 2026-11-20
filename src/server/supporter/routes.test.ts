import { createHmac } from "node:crypto";
import { describe, expect, it } from "bun:test";

import type { LinkableSupporterProvider } from "./domain";
import { createSupporterHandlers, type LinkStateStore, type SupporterRouteDependencies, type SupporterStore } from "./routes";
import { SupporterStoreError } from "./store";

const origin = "http://localhost";
const now = new Date("2026-11-17T12:00:00.000Z");
const secrets = { github: "github-secret", bmc: "bmc-secret" };

class StubStore implements SupporterStore {
    calls: Array<[string, unknown]> = [];
    claimError: Error | null = null;

    async getOverview() {
        return {
            status: {
                badge: true,
                active: true,
                membershipActive: false,
                activeUntil: new Date("2026-12-17T12:00:00.000Z"),
                bankedDays: 30,
            },
            links: [{ provider: "github" as const, displayName: "Yoru", linkedAt: now }],
        };
    }
    async link(input: unknown) {
        this.calls.push(["link", input]);
    }
    async unlink(userId: string, provider: string) {
        this.calls.push(["unlink", { userId, provider }]);
        return true;
    }
    async recordMembership(input: unknown) {
        this.calls.push(["membership", input]);
    }
    async recordPayment(input: unknown) {
        this.calls.push(["payment", input]);
    }
    async refundPayment(provider: string, externalId: string) {
        this.calls.push(["refund", { provider, externalId }]);
    }
    async createClaimCode() {
        return { code: "HANAMI-ABCD2345", expiresAt: now };
    }
    async claimWithCode(input: unknown) {
        this.calls.push(["claim", input]);
        if (this.claimError) throw this.claimError;
    }
}

class MemoryLinkStates implements LinkStateStore {
    states = new Map<string, { userId: string; provider: LinkableSupporterProvider }>();
    async save(stateHash: string, value: { userId: string; provider: LinkableSupporterProvider }) {
        this.states.set(stateHash, value);
    }
    async take(stateHash: string) {
        const value = this.states.get(stateHash) ?? null;
        this.states.delete(stateHash);
        return value;
    }
}

function makeApp(options: { userId?: string | null; store?: StubStore } = {}) {
    const store = options.store ?? new StubStore();
    const linkStates = new MemoryLinkStates();
    const userId = options.userId === undefined ? "user-1" : options.userId;
    const dependencies: SupporterRouteDependencies = {
        getSession: async () => (userId ? { user: { id: userId } } : null),
        store,
        linkStates,
        fetchLinkedAccount: async () => ({ providerUserId: "github-7", displayName: "Yoru", membershipActive: true, hasSupported: true }),
        authorizationUrl: (provider, state) => `https://example.com/${provider}?state=${state}`,
        secrets,
        now: () => now,
    };
    return { app: createSupporterHandlers(dependencies), store, linkStates };
}

function signedRequest(path: string, body: unknown, headers: Record<string, string>) {
    return new Request(`${origin}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify(body),
    });
}

function hmac(secret: string, body: unknown) {
    return createHmac("sha256", secret).update(JSON.stringify(body)).digest("hex");
}

describe("supporter routes", () => {
    it("returns the signed-in user's status", async () => {
        const { app } = makeApp();
        const response = await app.getOverview(new Request(`${origin}/supporter`));
        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            status: { badge: true, active: true, activeUntil: "2026-12-17T12:00:00.000Z", bankedDays: 30 },
            links: [{ provider: "github", displayName: "Yoru", linkedAt: now.toISOString() }],
        });
    });

    it("requires a session", async () => {
        const { app } = makeApp({ userId: null });
        expect((await app.getOverview(new Request(`${origin}/supporter`))).status).toBe(401);
    });

    it("starts linking only from a trusted origin", async () => {
        const { app, linkStates } = makeApp();
        const rejected = await app.link(new Request(`${origin}/supporter/link/github`, { method: "POST" }), {
            params: Promise.resolve({ provider: "github" }),
        });
        expect(rejected.status).toBe(403);

        const response = await app.link(new Request(`${origin}/supporter/link/github`, { method: "POST", headers: { Origin: origin } }), {
            params: Promise.resolve({ provider: "github" }),
        });
        expect(response.status).toBe(200);
        expect(((await response.json()) as { url: string }).url).toStartWith("https://example.com/github?state=");
        expect(linkStates.states.size).toBe(1);
    });

    it("refuses to link Buy Me a Coffee through OAuth", async () => {
        const { app } = makeApp();
        const response = await app.link(new Request(`${origin}/supporter/link/bmc`, { method: "POST", headers: { Origin: origin } }), {
            params: Promise.resolve({ provider: "bmc" }),
        });
        expect(response.status).toBe(404);
    });

    it("links the account that started the flow and records its pledge", async () => {
        const { app, store } = makeApp();
        const start = await app.link(new Request(`${origin}/supporter/link/github`, { method: "POST", headers: { Origin: origin } }), {
            params: Promise.resolve({ provider: "github" }),
        });
        const state = new URL(((await start.json()) as { url: string }).url).searchParams.get("state");

        const callback = await app.callback(new Request(`${origin}/supporter/link/github/callback?code=abc&state=${state}`), {
            params: Promise.resolve({ provider: "github" }),
        });
        expect(callback.status).toBe(302);
        expect(callback.headers.get("location")).toBe("/supporter");
        expect(store.calls).toEqual([
            ["membership", { provider: "github", providerUserId: "github-7", active: true, now }],
            ["link", { userId: "user-1", provider: "github", providerUserId: "github-7", displayName: "Yoru", now, hasSupported: true }],
        ]);
    });

    it("rejects a callback with an unknown state", async () => {
        const { app, store } = makeApp();
        const callback = await app.callback(new Request(`${origin}/supporter/link/github/callback?code=abc&state=${"a".repeat(43)}`), {
            params: Promise.resolve({ provider: "github" }),
        });
        expect(callback.headers.get("location")).toBe("/supporter?supporter=invalid&provider=github");
        expect(store.calls).toEqual([]);
    });

    it("reports when the provider account belongs to someone else", async () => {
        const store = new StubStore();
        store.link = async () => {
            throw new SupporterStoreError("linked_to_another_account");
        };
        const { app } = makeApp({ store });
        const start = await app.link(new Request(`${origin}/supporter/link/github`, { method: "POST", headers: { Origin: origin } }), {
            params: Promise.resolve({ provider: "github" }),
        });
        const state = new URL(((await start.json()) as { url: string }).url).searchParams.get("state");
        const callback = await app.callback(new Request(`${origin}/supporter/link/github/callback?code=abc&state=${state}`), {
            params: Promise.resolve({ provider: "github" }),
        });
        expect(callback.headers.get("location")).toBe("/supporter?supporter=taken&provider=github");
    });
});

describe("supporter webhooks", () => {
    const donation = {
        type: "donation.created",
        data: {
            id: 1,
            supporter_id: 42,
            supporter_name: "Alex",
            support_note: "HANAMI-ABCD2345",
            amount: 6,
            currency: "USD",
            created_at: 1,
        },
    };

    it("rejects an unsigned Buy Me a Coffee event", async () => {
        const { app, store } = makeApp();
        const response = await app.bmcWebhook(signedRequest("/supporter/webhooks/bmc", donation, { "x-signature-sha256": "bad" }));
        expect(response.status).toBe(401);
        expect(store.calls).toEqual([]);
    });

    it("claims with the note's code, then records the donation", async () => {
        const { app, store } = makeApp();
        const rawBody = `${JSON.stringify(donation, null, 2)}\n`;
        const response = await app.bmcWebhook(
            new Request(`${origin}/api/supporter/webhooks/bmc`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-signature-sha256": createHmac("sha256", secrets.bmc).update(rawBody).digest("hex"),
                },
                body: rawBody,
            }),
        );
        expect(response.status).toBe(200);
        expect(store.calls).toEqual([
            ["claim", { code: "HANAMI-ABCD2345", providerUserId: "42", displayName: "Alex", now }],
            ["payment", { provider: "bmc", providerUserId: "42", externalId: "1", amountCents: 600, receivedAt: new Date(1000), now }],
        ]);
    });

    it("still records the donation when the code is invalid", async () => {
        const store = new StubStore();
        store.claimError = new SupporterStoreError("claim_code_invalid");
        const { app } = makeApp({ store });
        const response = await app.bmcWebhook(
            signedRequest("/supporter/webhooks/bmc", donation, { "x-signature-sha256": hmac(secrets.bmc, donation) }),
        );
        expect(response.status).toBe(200);
        expect(store.calls.map(([kind]) => kind)).toEqual(["claim", "payment"]);
    });

    it("records GitHub sponsorships and answers signed pings", async () => {
        const { app, store } = makeApp();
        const pingBody = { zen: "hi" };
        const unsignedPing = await app.githubWebhook(signedRequest("/supporter/webhooks/github", pingBody, { "x-github-event": "ping" }));
        expect(unsignedPing.status).toBe(401);
        const ping = await app.githubWebhook(
            signedRequest("/supporter/webhooks/github", pingBody, {
                "x-github-event": "ping",
                "x-hub-signature-256": `sha256=${hmac(secrets.github, pingBody)}`,
            }),
        );
        expect(ping.status).toBe(200);

        const event = {
            action: "cancelled",
            sponsorship: { node_id: "S_1", sponsor: { id: 9, login: "octocat" }, tier: { is_one_time: false } },
        };
        const response = await app.githubWebhook(
            signedRequest("/supporter/webhooks/github", event, {
                "x-github-event": "sponsorship",
                "x-hub-signature-256": `sha256=${hmac(secrets.github, event)}`,
            }),
        );
        expect(response.status).toBe(200);
        expect(store.calls).toEqual([["membership", { provider: "github", providerUserId: "9", active: false, now }]]);
    });
});
