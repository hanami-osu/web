import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/web/client";

import { assertDisposableTestDatabase, parseMariaDbConnection } from "../database/config";
import { createChallengeToken, DELETION_GRACE_PERIOD_MS, hashChallengeToken, type DeletionScopes } from "./domain";
import type { OsuGuessrDeletionAction } from "./osu-guessr";
import { AccountDeletionStoreError, PrismaDeletionRequestStore, type LinkedDeletionServices } from "./store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const prisma = testDatabaseUrl ? new PrismaClient({ adapter: new PrismaMariaDb(parseMariaDbConnection(testDatabaseUrl, "web")) }) : null;
const now = new Date("2026-07-14T18:00:00.000Z");
const later = new Date(now.getTime() + 1_000);
const afterGrace = new Date(now.getTime() + DELETION_GRACE_PERIOD_MS + 1_000);
let disposableDatabaseVerified = false;

class FakeServices implements LinkedDeletionServices {
    calls: string[] = [];
    failOn: string | null = null;

    osuGuessr = async (osuId: string, action: OsuGuessrDeletionAction) => this.record(`osu:${action}:${osuId}`);
    bot = {
        pauseLink: async (discordId: string) => this.record(`bot:pause:${discordId}`),
        restoreLink: async (userId: string) => this.record(`bot:restore:${userId}`),
        deleteUser: async (discordId: string) => this.record(`bot:delete:${discordId}`),
    };

    private async record(call: string): Promise<void> {
        this.calls.push(call);
        if (this.failOn && call.startsWith(this.failOn)) throw new Error(`${call} failed`);
    }
}

describeDatabase("Prisma scheduled account deletion store", () => {
    let services: FakeServices;
    let store: PrismaDeletionRequestStore;

    beforeAll(async () => {
        if (!prisma) throw new Error("TEST_DATABASE_URL is required");
        assertDisposableTestDatabase(testDatabaseUrl, {
            webUrl: process.env.WEB_DATABASE_URL,
            botUrl: process.env.BOT_DATABASE_URL,
        });
        disposableDatabaseVerified = true;
        await deployTestMigrations(testDatabaseUrl!);
    });

    beforeEach(async () => {
        if (!prisma) throw new Error("TEST_DATABASE_URL is required");
        services = new FakeServices();
        store = new PrismaDeletionRequestStore(prisma, services);
        await prisma.oauthConsent.deleteMany({ where: { userId: "user-1" } });
        await prisma.oauthAccessToken.deleteMany({ where: { userId: "user-1" } });
        await prisma.oauthRefreshToken.deleteMany({ where: { userId: "user-1" } });
        await prisma.user.deleteMany({ where: { id: "user-1" } });
        await seedUser("user-1", { discord: "discord-1", osu: "osu-1" }, "session-1");
    });

    afterAll(async () => {
        if (disposableDatabaseVerified && prisma) await prisma.user.deleteMany({ where: { id: "user-1" } });
        await prisma?.$disconnect();
    });

    async function scheduleFor(scopes: DeletionScopes) {
        const tokenHash = await hashChallengeToken(createChallengeToken());
        await store.startReauthentication({ userId: "user-1", tokenHash, now, alreadyFresh: true });
        return store.scheduleDeletion({ userId: "user-1", tokenHash, scopes, now: later });
    }

    it("hides selected data, signs the account out, and keeps everything for the grace period", async () => {
        if (!prisma) throw new Error("Database test store is unavailable");
        await seedOAuthGrant("user-1");
        const status = await scheduleFor({ account: true, bot: true, osuGuessr: true });

        expect(status.purgeAfter).toEqual(new Date(later.getTime() + DELETION_GRACE_PERIOD_MS));
        expect(services.calls).toEqual(["osu:hide:osu-1", "bot:pause:discord-1"]);
        expect(await prisma.user.findUnique({ where: { id: "user-1" } })).not.toBeNull();
        expect(await prisma.session.count({ where: { userId: "user-1" } })).toBe(0);
        expect(await prisma.oauthRefreshToken.count({ where: { userId: "user-1" } })).toBe(0);
        expect(await prisma.oauthConsent.count({ where: { userId: "user-1" } })).toBe(0);
        expect(await store.getDeletionStatus("user-1")).toMatchObject({ scopes: { account: true, bot: true, osuGuessr: true } });
    });

    it("keeps sessions when only linked service data is selected", async () => {
        if (!prisma) throw new Error("Database test store is unavailable");
        await scheduleFor({ account: false, bot: false, osuGuessr: true });
        expect(services.calls).toEqual(["osu:hide:osu-1"]);
        expect(await prisma.session.count({ where: { userId: "user-1" } })).toBe(1);
    });

    it("refuses a reused challenge and a second schedule", async () => {
        const tokenHash = await hashChallengeToken(createChallengeToken());
        const scopes = { account: false, bot: true, osuGuessr: false };
        await store.startReauthentication({ userId: "user-1", tokenHash, now, alreadyFresh: true });
        await store.scheduleDeletion({ userId: "user-1", tokenHash, scopes, now: later });
        await expect(store.scheduleDeletion({ userId: "user-1", tokenHash, scopes, now: later })).rejects.toThrow("challenge_invalid");
        await expect(scheduleFor(scopes)).rejects.toThrow("already_scheduled");
    });

    it("rejects osu!guessr deletion for an account without osu!", async () => {
        if (!prisma) throw new Error("Database test store is unavailable");
        await prisma.account.deleteMany({ where: { userId: "user-1", providerId: "osu" } });
        await expect(scheduleFor({ account: false, bot: false, osuGuessr: true })).rejects.toEqual(
            new AccountDeletionStoreError("scope_unavailable"),
        );
        expect(services.calls).toEqual([]);
    });

    it("schedules nothing and restores osu!guessr when hiding fails", async () => {
        services.failOn = "bot:pause";
        await expect(scheduleFor({ account: true, bot: true, osuGuessr: true })).rejects.toEqual(
            new AccountDeletionStoreError("service_unavailable"),
        );
        expect(services.calls).toEqual(["osu:hide:osu-1", "bot:pause:discord-1", "osu:restore:osu-1"]);
        expect(await store.getDeletionStatus("user-1")).toBeNull();
    });

    it("restores linked data when cancelled", async () => {
        await scheduleFor({ account: false, bot: true, osuGuessr: true });
        services.calls = [];
        await store.cancelDeletion("user-1");
        expect(services.calls).toEqual(["osu:restore:osu-1", "bot:restore:user-1"]);
        expect(await store.getDeletionStatus("user-1")).toBeNull();
        await expect(store.cancelDeletion("user-1")).rejects.toThrow("not_scheduled");
    });

    it("waits for the grace period, then purges every selected service", async () => {
        if (!prisma) throw new Error("Database test store is unavailable");
        await seedOAuthGrant("user-1");
        await scheduleFor({ account: true, bot: true, osuGuessr: true });
        services.calls = [];

        expect(await store.purgeDue(new Date(later.getTime() + DELETION_GRACE_PERIOD_MS - 1))).toEqual({ purged: 0, failed: 0 });
        expect(await store.purgeDue(afterGrace)).toEqual({ purged: 1, failed: 0 });

        expect(services.calls).toEqual(["osu:purge:osu-1", "bot:delete:discord-1"]);
        expect(await prisma.user.findUnique({ where: { id: "user-1" } })).toBeNull();
        expect(await prisma.oauthConsent.count({ where: { clientId: "deletion-test-client" } })).toBe(0);
        expect(await prisma.accountDeletionSchedule.count({ where: { userId: "user-1" } })).toBe(0);
    });

    it("keeps the account but removes the schedule when only linked data was selected", async () => {
        if (!prisma) throw new Error("Database test store is unavailable");
        await scheduleFor({ account: false, bot: false, osuGuessr: true });
        expect(await store.purgeDue(afterGrace)).toEqual({ purged: 1, failed: 0 });
        expect(await prisma.user.findUnique({ where: { id: "user-1" } })).not.toBeNull();
        expect(await prisma.accountDeletionSchedule.count({ where: { userId: "user-1" } })).toBe(0);
    });

    it("records a failed purge and retries it on the next run", async () => {
        if (!prisma) throw new Error("Database test store is unavailable");
        await scheduleFor({ account: true, bot: true, osuGuessr: true });
        services.failOn = "osu:purge";

        expect(await store.purgeDue(afterGrace)).toEqual({ purged: 0, failed: 1 });
        const failed = await prisma.accountDeletionSchedule.findUnique({ where: { userId: "user-1" } });
        expect(failed?.lastError).toBe("osu_guessr_failed");
        expect(await prisma.user.findUnique({ where: { id: "user-1" } })).not.toBeNull();

        services.failOn = null;
        expect(await store.purgeDue(afterGrace)).toEqual({ purged: 1, failed: 0 });
        expect(await prisma.user.findUnique({ where: { id: "user-1" } })).toBeNull();
    });
});

async function deployTestMigrations(databaseUrl: string): Promise<void> {
    const child = Bun.spawn([process.execPath, "src/scripts/migrate.ts"], {
        env: { ...process.env, WEB_DATABASE_URL: databaseUrl, BOT_DATABASE_URL: "" },
        stdout: "pipe",
        stderr: "pipe",
    });
    const [code, error] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    if (code !== 0) throw new Error(error);
}

async function seedOAuthGrant(userId: string): Promise<void> {
    if (!prisma) throw new Error("TEST_DATABASE_URL is required");
    await prisma.oauthClient.upsert({
        where: { clientId: "deletion-test-client" },
        update: {},
        create: { clientId: "deletion-test-client", redirectUris: ["http://localhost/callback"] },
    });
    const refresh = await prisma.oauthRefreshToken.create({
        data: {
            token: `refresh-${userId}`,
            clientId: "deletion-test-client",
            userId,
            scopes: ["openid", "offline_access"],
            expiresAt: new Date(now.getTime() + 86_400_000),
        },
    });
    await prisma.oauthAccessToken.create({
        data: {
            token: `access-${userId}`,
            clientId: "deletion-test-client",
            userId,
            refreshId: refresh.id,
            scopes: ["openid"],
            expiresAt: new Date(now.getTime() + 3_600_000),
        },
    });
    await prisma.oauthConsent.create({ data: { clientId: "deletion-test-client", userId, scopes: ["openid"] } });
}

async function seedUser(userId: string, ids: { discord: string; osu: string }, sessionId: string): Promise<void> {
    if (!prisma) throw new Error("TEST_DATABASE_URL is required");
    await prisma.user.create({
        data: {
            id: userId,
            name: userId,
            email: `${userId}@example.test`,
            emailVerified: true,
            createdAt: now,
            updatedAt: now,
            accounts: {
                create: [
                    { id: `account-${userId}`, accountId: ids.discord, providerId: "discord", createdAt: now, updatedAt: now },
                    { id: `account-osu-${userId}`, accountId: ids.osu, providerId: "osu", createdAt: now, updatedAt: now },
                ],
            },
            sessions: {
                create: {
                    id: sessionId,
                    token: `token-${userId}`,
                    expiresAt: new Date(now.getTime() + 86_400_000),
                    createdAt: now,
                    updatedAt: now,
                },
            },
        },
    });
}
