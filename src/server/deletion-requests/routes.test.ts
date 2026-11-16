import { describe, expect, it } from "bun:test";

import { DELETION_GRACE_PERIOD_MS, hashChallengeToken, type DeletionScopes } from "./domain";
import { createAccountDeletionRoutes } from "./routes";
import { AccountDeletionStoreError, type AccountDeletionStore, type DeletionStatus } from "./store";

const now = new Date("2026-07-14T18:00:00.000Z");
const osuGuessrOnly: DeletionScopes = { account: false, bot: false, osuGuessr: true };

describe("scheduled account deletion routes", () => {
    it("rejects unauthenticated scheduling", async () => {
        const { app } = makeApp({ authenticated: false });
        const response = await schedule(app, { challenge: "a".repeat(43), confirmationPhrase: "DELETE MY DATA", scopes: osuGuessrOnly });
        expect(response.status).toBe(401);
    });

    it("requires reauthentication for a stale session", async () => {
        const { app } = makeApp({ sessionAgeMinutes: 16 });
        const response = await post(app, "/account-deletion/reauth/start", {});
        expect(response.status).toBe(200);
        const data = (await response.json()) as { reauthenticationRequired: boolean; confirmationPath: string };
        expect(data.reauthenticationRequired).toBe(true);
        expect(data.confirmationPath).toStartWith("/profile/privacy/confirm#challenge=");
    });

    it("lets a freshly authenticated user reach confirmation", async () => {
        const store = new StubStore();
        const { app } = makeApp({ sessionAgeMinutes: 5, store });
        const response = await post(app, "/account-deletion/reauth/start", {});
        const data = (await response.json()) as { reauthenticationRequired: boolean; confirmationPath: string };
        expect(data.reauthenticationRequired).toBe(false);
        expect(store.lastStart?.alreadyFresh).toBe(true);
        expect(store.lastStart?.tokenHash).toMatch(/^[a-f0-9]{64}$/);
        expect(data.confirmationPath).not.toContain(store.lastStart?.tokenHash ?? "");
    });

    it("rejects an incorrect confirmation phrase before scheduling", async () => {
        const store = new StubStore();
        const { app } = makeApp({ store });
        const response = await schedule(app, { challenge: "a".repeat(43), confirmationPhrase: "DELETE ACCOUNT", scopes: osuGuessrOnly });
        expect(response.status).toBe(400);
        expect(store.scheduleCalls).toBe(0);
    });

    it("rejects an empty or malformed scope selection", async () => {
        const store = new StubStore();
        const { app } = makeApp({ store });
        for (const scopes of [{ account: false, bot: false, osuGuessr: false }, { account: true }, "account"]) {
            const response = await schedule(app, { challenge: "a".repeat(43), confirmationPhrase: "DELETE MY DATA", scopes });
            expect(response.status).toBe(400);
        }
        expect(store.scheduleCalls).toBe(0);
    });

    it("schedules the verified selection and always includes Bot data with the account", async () => {
        const store = new StubStore();
        const { app } = makeApp({ store, userId: "user-2" });
        const challenge = "a".repeat(43);
        const response = await schedule(app, {
            challenge,
            confirmationPhrase: "DELETE  MY DATA",
            scopes: { account: true, bot: false, osuGuessr: false },
        });

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            scheduled: {
                scopes: { account: true, bot: true, osuGuessr: false },
                requestedAt: now.toISOString(),
                purgeAfter: new Date(now.getTime() + DELETION_GRACE_PERIOD_MS).toISOString(),
            },
        });
        expect(store.lastSchedule).toEqual({
            userId: "user-2",
            tokenHash: await hashChallengeToken(challenge),
            scopes: { account: true, bot: true, osuGuessr: false },
            now,
        });
    });

    it("does not report success when a linked service is unavailable", async () => {
        const store = new StubStore();
        store.scheduleError = new AccountDeletionStoreError("service_unavailable");
        const { app } = makeApp({ store });
        const response = await schedule(app, { challenge: "a".repeat(43), confirmationPhrase: "DELETE MY DATA", scopes: osuGuessrOnly });
        expect(response.status).toBe(503);
        expect(await response.json()).toEqual({ error: "A linked service is temporarily unavailable. Nothing was changed." });
    });

    it("refuses a second schedule while one is pending", async () => {
        const store = new StubStore();
        store.scheduleError = new AccountDeletionStoreError("already_scheduled");
        const { app } = makeApp({ store });
        const response = await schedule(app, { challenge: "a".repeat(43), confirmationPhrase: "DELETE MY DATA", scopes: osuGuessrOnly });
        expect(response.status).toBe(409);
    });

    it("does not reflect raw internal errors", async () => {
        const store = new StubStore();
        store.scheduleError = new Error("ER_ACCESS_DENIED production-host password=secret stack");
        const { app } = makeApp({ store });
        const response = await schedule(app, { challenge: "a".repeat(43), confirmationPhrase: "DELETE MY DATA", scopes: osuGuessrOnly });
        expect(response.status).toBe(500);
        const body = JSON.stringify(await response.json());
        expect(body).not.toContain("production-host");
        expect(body).not.toContain("password");
    });

    it("rejects scheduling and cancelling without a trusted Origin", async () => {
        const store = new StubStore();
        const { app } = makeApp({ store });
        const scheduled = await app.handle(
            new Request("http://localhost/account-deletion/schedule", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ challenge: "a".repeat(43), confirmationPhrase: "DELETE MY DATA", scopes: osuGuessrOnly }),
            }),
        );
        const cancelled = await app.handle(new Request("http://localhost/account-deletion/schedule", { method: "DELETE" }));
        expect(scheduled.status).toBe(403);
        expect(cancelled.status).toBe(403);
        expect(store.cancelCalls).toBe(0);
    });

    it("cancels a pending deletion for the signed-in user", async () => {
        const store = new StubStore();
        const { app } = makeApp({ store, userId: "user-3" });
        const response = await app.handle(
            new Request("http://localhost/account-deletion/schedule", { method: "DELETE", headers: { Origin: "http://localhost" } }),
        );
        expect(response.status).toBe(200);
        expect(store.lastCancel).toBe("user-3");
    });

    it("reports when there is nothing to cancel", async () => {
        const store = new StubStore();
        store.cancelError = new AccountDeletionStoreError("not_scheduled");
        const { app } = makeApp({ store });
        const response = await app.handle(
            new Request("http://localhost/account-deletion/schedule", { method: "DELETE", headers: { Origin: "http://localhost" } }),
        );
        expect(response.status).toBe(404);
    });

    it("returns the pending deletion status", async () => {
        const store = new StubStore();
        store.status = {
            scopes: osuGuessrOnly,
            requestedAt: now,
            purgeAfter: new Date(now.getTime() + DELETION_GRACE_PERIOD_MS),
        };
        const { app } = makeApp({ store });
        const response = await app.handle(new Request("http://localhost/account-deletion/status"));
        expect(await response.json()).toEqual({
            scheduled: {
                scopes: osuGuessrOnly,
                requestedAt: now.toISOString(),
                purgeAfter: new Date(now.getTime() + DELETION_GRACE_PERIOD_MS).toISOString(),
            },
        });
    });
});

function makeApp({
    authenticated = true,
    sessionAgeMinutes = 1,
    store = new StubStore(),
    userId = "user-1",
}: {
    authenticated?: boolean;
    sessionAgeMinutes?: number;
    store?: StubStore;
    userId?: string;
}) {
    const routes = createAccountDeletionRoutes({
        getSession: async () =>
            authenticated
                ? {
                      session: { createdAt: new Date(now.getTime() - sessionAgeMinutes * 60_000) },
                      user: { id: userId },
                  }
                : null,
        store,
        now: () => now,
    });
    return { app: routes, store };
}

function post(app: ReturnType<typeof createAccountDeletionRoutes>, path: string, body: Record<string, unknown>) {
    return app.handle(
        new Request(`http://localhost${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Origin: "http://localhost" },
            body: JSON.stringify(body),
        }),
    );
}

function schedule(app: ReturnType<typeof createAccountDeletionRoutes>, body: Record<string, unknown>) {
    return post(app, "/account-deletion/schedule", body);
}

class StubStore implements AccountDeletionStore {
    lastStart: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean } | null = null;
    lastSchedule: { userId: string; tokenHash: string; scopes: DeletionScopes; now: Date } | null = null;
    lastCancel: string | null = null;
    scheduleCalls = 0;
    cancelCalls = 0;
    scheduleError: Error | null = null;
    cancelError: Error | null = null;
    status: DeletionStatus | null = null;

    async startReauthentication(input: { userId: string; tokenHash: string; now: Date; alreadyFresh: boolean }): Promise<void> {
        this.lastStart = input;
    }

    async completeReauthentication(input: { userId: string; tokenHash: string; sessionCreatedAt: Date; now: Date }): Promise<Date> {
        return input.now;
    }

    async scheduleDeletion(input: { userId: string; tokenHash: string; scopes: DeletionScopes; now: Date }): Promise<DeletionStatus> {
        this.scheduleCalls += 1;
        this.lastSchedule = input;
        if (this.scheduleError) throw this.scheduleError;
        return { scopes: input.scopes, requestedAt: input.now, purgeAfter: new Date(input.now.getTime() + DELETION_GRACE_PERIOD_MS) };
    }

    async cancelDeletion(userId: string): Promise<void> {
        this.cancelCalls += 1;
        this.lastCancel = userId;
        if (this.cancelError) throw this.cancelError;
    }

    async getDeletionStatus(): Promise<DeletionStatus | null> {
        return this.status;
    }
}
