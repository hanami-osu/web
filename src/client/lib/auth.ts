import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";

import { createLoginPath, getSignedOAuthQuery, validateReturnTo } from "./auth-navigation";

const authClient = createAuthClient({
    basePath: "/api/auth",
    plugins: [oauthProviderClient()],
});
export const { signIn, signOut, useSession } = authClient;
export type IdentityProvider = "discord" | "osu";

interface AuthOperationResult {
    error?: unknown;
}

type OAuthContinuationFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

type SocialSignInOperation = (input: {
    provider: "discord";
    callbackURL: string;
    errorCallbackURL: string;
}) => Promise<AuthOperationResult>;

type OsuSignInOperation = (input: { provider: "osu"; callbackURL: string; errorCallbackURL: string }) => Promise<AuthOperationResult>;

type SignOutOperation = () => Promise<AuthOperationResult>;

export async function signInWithDiscord(returnTo?: string, execute: SocialSignInOperation = signIn.social) {
    const callbackURL = validateReturnTo(returnTo);
    const result = await execute({
        provider: "discord",
        callbackURL,
        errorCallbackURL: createLoginPath(callbackURL),
    });

    if (result.error) throw new Error("Discord sign-in could not be started.");
    return result;
}

const signInWithOsuProvider = (
    signIn as unknown as {
        social: (input: { provider: "osu"; callbackURL: string; errorCallbackURL: string }) => Promise<AuthOperationResult>;
    }
).social;

export async function signInWithOsu(returnTo?: string, execute: OsuSignInOperation = signInWithOsuProvider) {
    const callbackURL = validateReturnTo(returnTo);
    const result = await execute({
        provider: "osu",
        callbackURL,
        errorCallbackURL: createLoginPath(callbackURL),
    });

    if (result.error) throw new Error("osu! sign-in could not be started.");
    return result;
}

export async function reauthenticate(provider: IdentityProvider, callbackURL: string, errorCallbackURL: string) {
    const urls = {
        callbackURL: validateReturnTo(callbackURL),
        errorCallbackURL: validateReturnTo(errorCallbackURL, "/profile/privacy"),
    };
    const result = provider === "osu" ? await signInWithOsuProvider({ provider, ...urls }) : await signIn.social({ provider, ...urls });

    if (result.error) throw new Error(`${provider === "osu" ? "osu!" : "Discord"} reauthentication could not be started.`);
    return result;
}

export async function signOutFromHanami(execute: SignOutOperation = signOut): Promise<void> {
    const result = await execute();
    if (result.error) throw new Error("Sign out could not be completed.");
}

export async function continueOAuthPostLogin(options: { fetch?: OAuthContinuationFetch } = {}): Promise<string> {
    return postSignedOAuthQuery("/api/auth/oauth2/continue", { postLogin: true }, options.fetch);
}

export async function submitOAuthConsent(accept: boolean, options: { fetch?: OAuthContinuationFetch } = {}): Promise<string> {
    return postSignedOAuthQuery("/api/auth/oauth2/consent", { accept }, options.fetch);
}

async function postSignedOAuthQuery(
    path: string,
    body: Record<string, unknown>,
    fetchImplementation: OAuthContinuationFetch = globalThis.fetch,
): Promise<string> {
    const search = typeof window === "undefined" ? "" : window.location.search;
    const oauthQuery = getSignedOAuthQuery(search);
    if (!oauthQuery) throw new Error("This authorization request could not be verified.");

    const response = await fetchImplementation(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, oauth_query: oauthQuery }),
    });
    const data = (await response.json().catch(() => null)) as { url?: unknown; redirect_uri?: unknown } | null;
    const redirectURI = typeof data?.url === "string" ? data.url : data?.redirect_uri;
    if (!response.ok || typeof redirectURI !== "string") {
        throw new Error("Hanami could not continue the authorization request.");
    }

    return redirectURI;
}

export function claimPendingAttempt(attempt: { current: boolean }): boolean {
    if (attempt.current) return false;
    attempt.current = true;
    return true;
}
