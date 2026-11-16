import { describe, expect, it } from "bun:test";

import {
    createChallengeToken,
    hashChallengeToken,
    isFreshAuthentication,
    isValidConfirmationPhrase,
    normalizeDeletionScopes,
} from "./domain";

describe("account deletion domain", () => {
    it("accepts the exact confirmation phrase after whitespace normalization", () => {
        expect(isValidConfirmationPhrase("  DELETE  MY\nDATA ")).toBe(true);
        expect(isValidConfirmationPhrase("delete my data")).toBe(false);
        expect(isValidConfirmationPhrase("DELETE MY HANAMI ACCOUNT")).toBe(false);
    });

    it("requires at least one boolean scope and folds Bot data into account deletion", () => {
        expect(normalizeDeletionScopes({ account: true, bot: false, osuGuessr: false })).toEqual({
            account: true,
            bot: true,
            osuGuessr: false,
        });
        expect(normalizeDeletionScopes({ account: false, bot: false, osuGuessr: true })).toEqual({
            account: false,
            bot: false,
            osuGuessr: true,
        });
        expect(normalizeDeletionScopes({ account: false, bot: false, osuGuessr: false })).toBeNull();
        expect(normalizeDeletionScopes({ account: "yes", bot: false, osuGuessr: false })).toBeNull();
        expect(normalizeDeletionScopes(null)).toBeNull();
    });

    it("uses a 15-minute session freshness window", () => {
        const now = Date.UTC(2026, 6, 14, 18, 0, 0);
        expect(isFreshAuthentication(new Date(now - 14 * 60_000), now)).toBe(true);
        expect(isFreshAuthentication(new Date(now - 15 * 60_000), now)).toBe(false);
    });

    it("creates a random challenge and stores only its hash", async () => {
        const challenge = createChallengeToken();
        expect(challenge).toHaveLength(43);
        expect(await hashChallengeToken(challenge)).toMatch(/^[a-f0-9]{64}$/);
    });
});
