"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { continueOAuthPostLogin, signOutFromHanami, useSession } from "@/client/lib/auth";
import { getSignedOAuthQuery, isOsuOAuthContinuationRequest, readOAuthError } from "@/client/lib/auth-navigation";
import { routes } from "@/client/routes/paths";
import { useRawSearch } from "@/client/lib/use-raw-search";
import { fetchJson } from "@/client/lib/fetch-json";
import { AuthLayout, AuthPanel } from "@/components/account/account-shell";
import { Eyebrow } from "@/components/marketing";
import { primaryActionClass, textButtonClass } from "@/components/ui/action-styles";

type ContinuationState = "ready" | "connecting" | "conflict" | "continuing" | "error";

export default function OsuOAuthContinuation() {
    const { data: session, isPending } = useSession();
    const rawSearch = useRawSearch();
    const search = rawSearch ?? "";
    const router = useRouter();
    const oauthQuery = useMemo(() => getSignedOAuthQuery(search), [search]);
    const linked = useMemo(() => new URLSearchParams(search).get("linked") === "1", [search]);
    const oauthErrorCode = useMemo(() => new URLSearchParams(search).get("error"), [search]);
    const continued = useRef(false);
    const [state, setState] = useState<ContinuationState>("ready");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (rawSearch === null || isPending) return;
        if (!oauthQuery || !isOsuOAuthContinuationRequest(search)) {
            setState("error");
            setError("This authorization request expired or could not be verified. Start again.");
            return;
        }
        if (!session) {
            router.replace(`${routes.login}${search}`);
            return;
        }
        if (oauthErrorCode) {
            const ownershipConflict = oauthErrorCode.toLowerCase() === "account_already_linked_to_different_user";
            setState(ownershipConflict ? "conflict" : "error");
            setError(readOAuthError(search, "osu"));
            return;
        }
        if (!linked || continued.current) return;

        continued.current = true;
        setState("continuing");
        void continueOAuthPostLogin()
            .then((redirectURI) => window.location.assign(redirectURI))
            .catch(() => {
                setState("error");
                setError("Hanami could not finish the authorization request. Start again.");
            });
    }, [isPending, linked, oauthErrorCode, oauthQuery, rawSearch, router, search, session]);

    async function connectOsu() {
        if (!oauthQuery) return;
        setState("connecting");
        setError(null);
        try {
            const result = await fetchJson<{ url?: string }>("/api/account/providers/osu/link/continuation", undefined, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ oauthQuery }),
            });
            if (!result.url) throw new Error("Missing authorization URL");
            window.location.assign(result.url);
        } catch (requestError: unknown) {
            const status = readErrorStatus(requestError);
            setState("error");
            setError(
                status === 409
                    ? "That osu! account belongs to another Hanami account. Sign in with that account first."
                    : "osu! could not be connected. Start again and try once more.",
            );
        }
    }

    async function restartOsuSignIn() {
        if (!oauthQuery) return;
        setState("continuing");
        setError(null);
        try {
            await signOutFromHanami();
            window.location.assign(`${routes.login}?${oauthQuery}`);
        } catch {
            setState("error");
            setError("Hanami could not restart the sign-in flow. Please try again.");
        }
    }

    return (
        <AuthLayout>
            <OsuOAuthContinuationPanel
                state={isPending || rawSearch === null ? "continuing" : state}
                error={error}
                onConnect={connectOsu}
                onRestart={restartOsuSignIn}
            />
        </AuthLayout>
    );
}

export function OsuOAuthContinuationPanel({
    state,
    error = null,
    onConnect,
    onRestart,
}: {
    state: ContinuationState;
    error?: string | null;
    onConnect?: () => void;
    onRestart?: () => void;
}) {
    const isBusy = state === "connecting" || state === "continuing";

    return (
        <AuthPanel>
            <Eyebrow>osu! authorization</Eyebrow>
            {state === "ready" || state === "connecting" ? (
                <>
                    <h1>Connect osu! to continue</h1>
                    <p>Hanami needs your osu! account to finish this authorization request.</p>
                    <button className={`${primaryActionClass} mt-8`} type="button" onClick={onConnect} disabled={isBusy}>
                        {state === "connecting" ? "Opening osu!…" : "Connect osu!"}
                    </button>
                </>
            ) : state === "conflict" ? (
                <>
                    <h1>Use the linked Hanami account</h1>
                    <p role="alert">That osu! account belongs to another Hanami account. Sign in with that osu! account to continue.</p>
                    <button className={`${primaryActionClass} mt-8`} type="button" onClick={onRestart} disabled={isBusy}>
                        Sign in with that osu! account
                    </button>
                </>
            ) : state === "continuing" ? (
                <>
                    <h1>Finishing authorization</h1>
                    <p>Returning you to the requesting app.</p>
                </>
            ) : (
                <>
                    <h1>Authorization could not continue</h1>
                    <p role="alert">{error ?? "This authorization request expired or could not be verified. Start again."}</p>
                    <a className={`${textButtonClass} mt-8`} href={routes.login}>
                        Return to sign in
                    </a>
                </>
            )}
        </AuthPanel>
    );
}

function readErrorStatus(error: unknown): number | null {
    if (!error || typeof error !== "object" || !("status" in error)) return null;
    const status = error.status;
    return typeof status === "number" ? status : null;
}
