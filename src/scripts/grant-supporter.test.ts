import { describe, expect, test } from "bun:test";

import { parseGrantArguments } from "./grant-supporter";

describe("grant-supporter arguments", () => {
    test("reads a dollar amount for an osu! user", () => {
        expect(parseGrantArguments(["--osu", "12643934", "--usd", "5"])).toEqual({ osuId: "12643934", userId: null, amountCents: 500 });
    });

    test("reads a badge-only grant for a Hanami user", () => {
        expect(parseGrantArguments(["--user", "abc", "--badge-only"])).toEqual({ osuId: null, userId: "abc", amountCents: 0 });
    });

    test("rejects ambiguous or incomplete arguments", () => {
        expect(parseGrantArguments(["--osu", "1"])).toBeNull();
        expect(parseGrantArguments(["--osu", "1", "--user", "abc", "--usd", "5"])).toBeNull();
        expect(parseGrantArguments(["--osu", "1", "--usd", "-3"])).toBeNull();
        expect(parseGrantArguments(["--osu", "1", "--usd", "5", "--badge-only"])).toBeNull();
    });
});
