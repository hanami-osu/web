import { describe, expect, test } from "bun:test";

import { addBankedDays, createClaimCode, daysForUsdCents, describeBank, emptyBank, findClaimCode, settleBank } from "./domain";

const day = 86_400_000;
const start = new Date("2026-11-17T00:00:00Z");

describe("supporter time", () => {
    test("gives 10 days per dollar, so $3 is a month", () => {
        expect(daysForUsdCents(300)).toBe(30);
        expect(daysForUsdCents(1100)).toBe(110);
        expect(daysForUsdCents(99)).toBe(9);
        expect(daysForUsdCents(0)).toBe(0);
        expect(daysForUsdCents(-500)).toBe(0);
    });

    test("runs banked time down while no membership is active", () => {
        const bank = addBankedDays(emptyBank(start), 30, start);
        const later = new Date(start.getTime() + 10 * day);

        expect(settleBank(bank, later).bankedSeconds).toBe(20 * 86_400);
        expect(describeBank(bank, later)).toMatchObject({ badge: true, active: true, bankedDays: 20 });
        expect(describeBank(bank, later).activeUntil).toEqual(new Date(start.getTime() + 30 * day));
    });

    test("pauses banked time while a membership is active", () => {
        const bank = { ...addBankedDays(emptyBank(start), 30, start), membershipActive: true };
        const later = new Date(start.getTime() + 90 * day);

        expect(settleBank(bank, later).bankedSeconds).toBe(30 * 86_400);
        expect(describeBank(bank, later)).toMatchObject({ active: true, membershipActive: true, activeUntil: null, bankedDays: 30 });
    });

    test("keeps the badge after time runs out", () => {
        const bank = addBankedDays(emptyBank(start), 10, start);
        const later = new Date(start.getTime() + 40 * day);

        expect(describeBank(bank, later)).toEqual({
            badge: true,
            active: false,
            membershipActive: false,
            activeUntil: null,
            bankedDays: 0,
        });
    });

    test("a badge-only grant gives the badge without time", () => {
        expect(describeBank(addBankedDays(emptyBank(start), 0, start), start)).toMatchObject({ badge: true, active: false });
    });

    test("an account with no supporter record has nothing", () => {
        expect(describeBank(null, start)).toEqual({
            badge: false,
            active: false,
            membershipActive: false,
            activeUntil: null,
            bankedDays: 0,
        });
    });
});

describe("claim codes", () => {
    test("creates codes that can be found again", () => {
        const code = createClaimCode();
        expect(code).toMatch(/^HANAMI-[A-Z2-9]{8}$/);
        expect(findClaimCode(`thanks! ${code} keep it up`)).toBe(code);
    });

    test("finds codes typed in lowercase", () => {
        expect(findClaimCode("hanami-abcd2345")).toBe("HANAMI-ABCD2345");
    });

    test("ignores notes without a code", () => {
        expect(findClaimCode("keep up the great work")).toBeNull();
        expect(findClaimCode(null)).toBeNull();
    });
});
