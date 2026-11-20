import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../../generated/prisma/web/client";

import { assertDisposableTestDatabase, parseMariaDbConnection } from "../database/config";
import { deleteSupporterData, PrismaSupporterStore, SupporterStoreError } from "./store";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeDatabase = testDatabaseUrl ? describe : describe.skip;
const prisma = testDatabaseUrl ? new PrismaClient({ adapter: new PrismaMariaDb(parseMariaDbConnection(testDatabaseUrl, "web")) }) : null;
const day = 86_400_000;
const start = new Date("2026-11-17T00:00:00.000Z");
const at = (days: number) => new Date(start.getTime() + days * day);
const users = ["supporter-1", "supporter-2"];
let disposableDatabaseVerified = false;

describeDatabase("Prisma supporter store", () => {
    let store: PrismaSupporterStore;

    beforeAll(async () => {
        if (!prisma) throw new Error("TEST_DATABASE_URL is required");
        assertDisposableTestDatabase(testDatabaseUrl, { webUrl: process.env.WEB_DATABASE_URL, botUrl: process.env.BOT_DATABASE_URL });
        disposableDatabaseVerified = true;
        await deployTestMigrations(testDatabaseUrl!);
    });

    beforeEach(async () => {
        if (!prisma) throw new Error("TEST_DATABASE_URL is required");
        store = new PrismaSupporterStore(prisma);
        await cleanUp();
        for (const id of users) {
            await prisma.user.create({
                data: { id, name: id, email: `${id}@example.test`, emailVerified: true, createdAt: start, updatedAt: start },
            });
        }
    });

    afterAll(async () => {
        if (disposableDatabaseVerified) await cleanUp();
        await prisma?.$disconnect();
    });

    it("credits payments made before the account was linked", async () => {
        await store.recordPayment({
            provider: "github",
            providerUserId: "gh-1",
            externalId: "one",
            amountCents: 600,
            receivedAt: start,
            now: start,
        });
        expect(await store.getStatus("supporter-1", start)).toMatchObject({ badge: false, active: false });

        await store.link({ userId: "supporter-1", provider: "github", providerUserId: "gh-1", displayName: "octocat", now: at(1) });
        expect(await store.getStatus("supporter-1", at(1))).toMatchObject({ badge: true, active: true, bankedDays: 60 });
        expect(await store.getStatus("supporter-1", at(62))).toMatchObject({ badge: true, active: false });
    });

    it("ignores replayed payments and takes refunds back", async () => {
        await store.link({ userId: "supporter-1", provider: "bmc", providerUserId: "42", displayName: null, now: start });
        const payment = {
            provider: "bmc" as const,
            providerUserId: "42",
            externalId: "p1",
            amountCents: 300,
            receivedAt: start,
            now: start,
        };
        await Promise.all([store.recordPayment(payment), store.recordPayment(payment)]);
        expect(await store.getStatus("supporter-1", start)).toMatchObject({ bankedDays: 30 });

        await store.refundPayment("bmc", "p1", at(5));
        expect(await store.getStatus("supporter-1", at(5))).toMatchObject({ badge: true, active: false, bankedDays: 0 });
    });

    it("credits both payments when they read the same starting balance", async () => {
        await store.link({ userId: "supporter-1", provider: "bmc", providerUserId: "race", displayName: null, now: start });
        await store.grant({ userId: "supporter-1", amountCents: 300, days: 30, now: start });
        let reads = 0;
        let release!: () => void;
        const barrier = new Promise<void>((resolve) => {
            release = resolve;
        });
        const database = prisma!.$extends({
            query: {
                supporterStatus: {
                    async findUnique({ args, query }) {
                        const result = await query(args);
                        if (++reads === 2) release();
                        await barrier;
                        return result;
                    },
                },
            },
        });
        const concurrent = new PrismaSupporterStore(database as unknown as PrismaClient);
        await Promise.all(
            ["first", "second"].map((externalId) =>
                concurrent.recordPayment({
                    provider: "bmc",
                    providerUserId: "race",
                    externalId,
                    amountCents: 100,
                    receivedAt: start,
                    now: start,
                }),
            ),
        );
        expect((await store.getStatus("supporter-1", start)).bankedDays).toBe(50);
        expect(await prisma!.supporterPayment.count({ where: { provider: "bmc", providerUserId: "race" } })).toBe(2);
    });

    it("retries a failed badge delivery on a replay without crediting the payment twice", async () => {
        await store.link({ userId: "supporter-1", provider: "bmc", providerUserId: "retry", displayName: null, now: start });
        let deliveries = 0;
        const notifying = new PrismaSupporterStore(prisma!, async () => {
            if (++deliveries === 1) throw new Error("osu!guessr temporarily unavailable");
            return true;
        });
        const payment = {
            provider: "bmc" as const,
            providerUserId: "retry",
            externalId: "retry-payment",
            amountCents: 300,
            receivedAt: start,
            now: start,
        };
        await notifying.recordPayment(payment);
        await notifying.recordPayment(payment);
        expect(deliveries).toBe(2);
        expect((await store.getStatus("supporter-1", start)).bankedDays).toBe(30);
    });

    it("recovers a pending badge delivery after the store is restarted", async () => {
        const unavailable = new PrismaSupporterStore(prisma!, async () => {
            throw new Error("osu!guessr unavailable");
        });
        await unavailable.grant({ userId: "supporter-1", amountCents: 300, days: 30, now: start });
        const delivered: string[] = [];
        const recovered = new PrismaSupporterStore(prisma!, async (userId) => {
            delivered.push(userId);
            return true;
        });
        await recovered.retryPendingBadgeSync();
        await recovered.retryPendingBadgeSync();
        expect(delivered).toEqual(["supporter-1"]);
        expect((await store.getStatus("supporter-1", start)).bankedDays).toBe(30);
    });

    it("pauses donated time while a membership is active", async () => {
        await store.grant({ userId: "supporter-1", amountCents: 300, days: 30, now: start });
        await store.link({ userId: "supporter-1", provider: "github", providerUserId: "g-7", displayName: "Yoru", now: at(10) });
        await store.recordMembership({ provider: "github", providerUserId: "g-7", active: true, now: at(10) });

        expect(await store.getStatus("supporter-1", at(100))).toMatchObject({ active: true, membershipActive: true, bankedDays: 20 });

        await store.recordMembership({ provider: "github", providerUserId: "g-7", active: false, now: at(100) });
        const status = await store.getStatus("supporter-1", at(100));
        expect(status).toMatchObject({ active: true, membershipActive: false, bankedDays: 20 });
        expect(status.activeUntil).toEqual(at(120));
    });

    it("gives the badge to members and keeps it after they cancel", async () => {
        await store.recordMembership({ provider: "github", providerUserId: "gh-2", active: true, now: start });
        await store.link({ userId: "supporter-1", provider: "github", providerUserId: "gh-2", displayName: null, now: start });
        await store.recordMembership({ provider: "github", providerUserId: "gh-2", active: false, now: at(30) });
        expect(await store.getStatus("supporter-1", at(31))).toMatchObject({ badge: true, active: false });
    });

    it("refuses to link a provider account that belongs to someone else", async () => {
        await store.link({ userId: "supporter-1", provider: "github", providerUserId: "gh-3", displayName: null, now: start });
        await expect(
            store.link({ userId: "supporter-2", provider: "github", providerUserId: "gh-3", displayName: null, now: start }),
        ).rejects.toBeInstanceOf(SupporterStoreError);
    });

    it("links a Buy Me a Coffee supporter with a claim code once", async () => {
        const { code } = await store.createClaimCode("supporter-1", start);
        await store.claimWithCode({ code, providerUserId: "77", displayName: "Alex", now: at(1) });
        // Later events repeat the note.
        await store.claimWithCode({ code, providerUserId: "77", displayName: "Alex", now: at(2) });
        await expect(store.claimWithCode({ code, providerUserId: "78", displayName: null, now: at(2) })).rejects.toBeInstanceOf(
            SupporterStoreError,
        );

        const overview = await store.getOverview("supporter-1", at(2));
        expect(overview.links).toEqual([{ provider: "bmc", displayName: "Alex", linkedAt: at(1) }]);
    });

    it("rejects expired claim codes", async () => {
        const { code } = await store.createClaimCode("supporter-1", start);
        await expect(store.claimWithCode({ code, providerUserId: "79", displayName: null, now: at(8) })).rejects.toBeInstanceOf(
            SupporterStoreError,
        );
    });

    it("deletes a user's supporter records", async () => {
        await store.link({ userId: "supporter-1", provider: "github", providerUserId: "gh-4", displayName: null, now: start });
        await store.recordMembership({ provider: "github", providerUserId: "gh-4", active: true, now: start });
        await store.grant({ userId: "supporter-1", amountCents: 0, days: 0, now: start });

        await prisma!.$transaction(async (transaction) => {
            await deleteSupporterData(transaction, "supporter-1");
            await transaction.user.deleteMany({ where: { id: "supporter-1" } });
        });

        expect(await prisma!.supporterMembership.count({ where: { providerUserId: "gh-4" } })).toBe(0);
        expect(await prisma!.supporterPayment.count({ where: { providerUserId: "supporter-1" } })).toBe(0);
        expect(await prisma!.supporterLink.count({ where: { userId: "supporter-1" } })).toBe(0);
    });
});

async function cleanUp(): Promise<void> {
    if (!prisma) return;
    await prisma.supporterPayment.deleteMany({});
    await prisma.supporterMembership.deleteMany({});
    await prisma.user.deleteMany({ where: { id: { in: users } } });
}

async function deployTestMigrations(databaseUrl: string): Promise<void> {
    const child = Bun.spawn([process.execPath, "src/scripts/migrate.ts"], {
        env: { ...process.env, WEB_DATABASE_URL: databaseUrl, BOT_DATABASE_URL: "" },
        stdout: "pipe",
        stderr: "pipe",
    });
    const [code, error] = await Promise.all([child.exited, new Response(child.stderr).text()]);
    if (code !== 0) throw new Error(error);
}
