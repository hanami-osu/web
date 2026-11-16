import { routes } from "@/client/routes/paths";
import { validateReturnTo } from "./auth-navigation";

const pendingChallengeKey = "hanami.account-deletion.challenge";

export interface DeletionScopes {
    account: boolean;
    bot: boolean;
    osuGuessr: boolean;
}

const scopeKeys = ["account", "bot", "osuGuessr"] as const;

interface SessionStorageLike {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

export function prepareDeletionReauthentication(confirmationPath: string, storage?: SessionStorageLike): string {
    const safePath = validateReturnTo(confirmationPath, routes.profilePrivacyConfirm);
    const hashIndex = safePath.indexOf("#");
    const callbackURL = hashIndex === -1 ? safePath : safePath.slice(0, hashIndex);
    const challenge = hashIndex === -1 ? null : new URLSearchParams(safePath.slice(hashIndex + 1)).get("challenge");
    const queryIndex = callbackURL.indexOf("?");
    const callbackPath = queryIndex === -1 ? callbackURL : callbackURL.slice(0, queryIndex);

    if (callbackPath !== routes.profilePrivacyConfirm || !isChallenge(challenge)) {
        throw new Error("The deletion confirmation could not be prepared. Please try again.");
    }

    const target = storage ?? getBrowserSessionStorage();
    if (!target) throw new Error("This browser could not preserve the deletion confirmation. Please try again.");

    try {
        target.setItem(pendingChallengeKey, challenge);
    } catch {
        throw new Error("This browser could not preserve the deletion confirmation. Please try again.");
    }

    return callbackURL;
}

/** Carries the chosen scopes through the sign-in redirect in the query, which Better Auth preserves, unlike the fragment. */
export function withDeletionScopes(confirmationPath: string, scopes: DeletionScopes): string {
    const hashIndex = confirmationPath.indexOf("#");
    const path = hashIndex === -1 ? confirmationPath : confirmationPath.slice(0, hashIndex);
    const hash = hashIndex === -1 ? "" : confirmationPath.slice(hashIndex);
    const selected = scopeKeys.filter((key) => scopes[key]).join(",");
    return `${path}?scopes=${selected}${hash}`;
}

export function readDeletionScopes(search: string): DeletionScopes {
    const selected = new Set(new URLSearchParams(search).get("scopes")?.split(",") ?? []);
    const account = selected.has("account");
    return { account, bot: account || selected.has("bot"), osuGuessr: selected.has("osuGuessr") };
}

export function formatDeletionDate(value: string): string {
    return new Date(value).toLocaleDateString(undefined, { dateStyle: "long" });
}

export function readPendingDeletionChallenge(storage?: SessionStorageLike): string | null {
    const target = storage ?? getBrowserSessionStorage();
    if (!target) return null;

    try {
        const challenge = target.getItem(pendingChallengeKey);
        return isChallenge(challenge) ? challenge : null;
    } catch {
        return null;
    }
}

export function clearPendingDeletionChallenge(storage?: SessionStorageLike): void {
    const target = storage ?? getBrowserSessionStorage();
    if (!target) return;

    try {
        target.removeItem(pendingChallengeKey);
    } catch {
        // Storage cleanup is best-effort after a failed or cancelled redirect.
    }
}

function getBrowserSessionStorage(): SessionStorageLike | null {
    if (typeof window === "undefined") return null;
    try {
        return window.sessionStorage;
    } catch {
        return null;
    }
}

function isChallenge(value: string | null): value is string {
    return value !== null && value.length >= 32 && value.length <= 128;
}
