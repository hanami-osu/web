"use client";

import { useEffect, useMemo, useState } from "react";

import { submitOAuthConsent } from "@/client/lib/auth";
import { getSignedOAuthQuery } from "@/client/lib/auth-navigation";
import { fetchJson } from "@/client/lib/fetch-json";
import { useRawSearch } from "@/client/lib/use-raw-search";
import { routes } from "@/client/routes/paths";
import { AuthLayout, AuthPanel } from "@/components/account/account-shell";
import { Eyebrow } from "@/components/marketing";
import { primaryActionClass, textButtonClass } from "@/components/ui/action-styles";

type ConsentState = "ready" | "submitting" | "error";

const scopeDescriptions: Record<string, string> = {
    openid: "Confirm who you are on Hanami",
    osu: "See your connected osu! username, ID, and avatar",
    offline_access: "Stay signed in without asking you again",
};

export default function OAuthConsent() {
    const rawSearch = useRawSearch();
    const oauthQuery = useMemo(() => (rawSearch === null ? null : getSignedOAuthQuery(rawSearch)), [rawSearch]);
    const params = useMemo(() => new URLSearchParams(oauthQuery ?? ""), [oauthQuery]);
    const clientId = params.get("client_id");
    const scopes = useMemo(() => params.get("scope")?.split(/\s+/).filter(Boolean) ?? [], [params]);
    const [clientName, setClientName] = useState<string | null>(null);
    const [state, setState] = useState<ConsentState>("ready");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (rawSearch === null) return;
        if (!oauthQuery || !clientId) {
            setState("error");
            setError("This authorization request expired or could not be verified. Start again.");
            return;
        }

        const controller = new AbortController();
        void fetchJson<{ client_name?: string }>(
            `/api/auth/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`,
            controller.signal,
        )
            .then((client) => setClientName(client.client_name ?? null))
            .catch(() => {
                if (controller.signal.aborted) return;
                setState("error");
                setError("The app requesting access could not be found.");
            });
        return () => controller.abort();
    }, [clientId, oauthQuery, rawSearch]);

    async function decide(accept: boolean) {
        setState("submitting");
        setError(null);
        try {
            window.location.assign(await submitOAuthConsent(accept));
        } catch {
            setState("error");
            setError("Hanami could not finish the authorization request. Start again.");
        }
    }

    return (
        <AuthLayout>
            <AuthPanel>
                <Eyebrow>Authorization</Eyebrow>
                {state === "error" ? (
                    <>
                        <h1>Authorization could not continue</h1>
                        <p role="alert">{error}</p>
                        <a className={`${textButtonClass} mt-8`} href={routes.profile}>
                            Return to your profile
                        </a>
                    </>
                ) : (
                    <>
                        <h1>Allow {clientName ?? "this app"} to use your Hanami account?</h1>
                        <p>It is asking to:</p>
                        <ul className="mt-3 list-disc pl-5 text-sm leading-relaxed text-muted">
                            {scopes.map((scope) => (
                                <li key={scope}>{scopeDescriptions[scope] ?? scope}</li>
                            ))}
                        </ul>
                        <div className="mt-8 flex flex-wrap items-center gap-6">
                            <button
                                className={primaryActionClass}
                                type="button"
                                onClick={() => decide(true)}
                                disabled={state === "submitting" || clientName === null}
                            >
                                Allow
                            </button>
                            <button
                                className={textButtonClass}
                                type="button"
                                onClick={() => decide(false)}
                                disabled={state === "submitting"}
                            >
                                Deny
                            </button>
                        </div>
                    </>
                )}
            </AuthPanel>
        </AuthLayout>
    );
}
