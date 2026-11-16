import { describe, expect, it } from "bun:test";

import {
    clearPendingDeletionChallenge,
    prepareDeletionReauthentication,
    readDeletionScopes,
    readPendingDeletionChallenge,
    withDeletionScopes,
} from "./deletion-reauth";

function createStorage() {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key),
    };
}

describe("deletion reauthentication navigation", () => {
    it("keeps the challenge in session storage and removes it from the Better Auth callback", () => {
        const storage = createStorage();
        const challenge = "a".repeat(43);

        expect(prepareDeletionReauthentication(`/profile/privacy/confirm#challenge=${challenge}`, storage)).toBe(
            "/profile/privacy/confirm",
        );
        expect(readPendingDeletionChallenge(storage)).toBe(challenge);
        expect(readPendingDeletionChallenge(storage)).toBe(challenge);

        clearPendingDeletionChallenge(storage);
        expect(readPendingDeletionChallenge(storage)).toBeNull();
    });

    it("rejects malformed confirmation destinations", () => {
        const storage = createStorage();
        expect(() => prepareDeletionReauthentication("/profile#challenge=short", storage)).toThrow(
            "The deletion confirmation could not be prepared.",
        );
    });

    it("clears a pending challenge after a failed or cancelled redirect", () => {
        const storage = createStorage();
        const challenge = "b".repeat(43);
        prepareDeletionReauthentication(`/profile/privacy/confirm#challenge=${challenge}`, storage);

        clearPendingDeletionChallenge(storage);
        expect(readPendingDeletionChallenge(storage)).toBeNull();
    });

    it("keeps the chosen scopes in the callback query and drops the challenge fragment", () => {
        const storage = createStorage();
        const challenge = "c".repeat(43);
        const path = withDeletionScopes(`/profile/privacy/confirm#challenge=${challenge}`, { account: false, bot: false, osuGuessr: true });

        expect(path).toBe(`/profile/privacy/confirm?scopes=osuGuessr#challenge=${challenge}`);
        expect(prepareDeletionReauthentication(path, storage)).toBe("/profile/privacy/confirm?scopes=osuGuessr");
        expect(readPendingDeletionChallenge(storage)).toBe(challenge);
    });

    it("reads scopes and always includes Bot data with the account", () => {
        expect(readDeletionScopes("?scopes=account")).toEqual({ account: true, bot: true, osuGuessr: false });
        expect(readDeletionScopes("?scopes=bot,osuGuessr")).toEqual({ account: false, bot: true, osuGuessr: true });
        expect(readDeletionScopes("")).toEqual({ account: false, bot: false, osuGuessr: false });
    });
});
