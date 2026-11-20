"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";

import { reauthenticate, type IdentityProvider } from "@/client/lib/auth";
import { readOAuthError } from "@/client/lib/auth-navigation";
import {
    clearPendingDeletionChallenge,
    formatDeletionDate,
    prepareDeletionReauthentication,
    readDeletionScopes,
    readPendingDeletionChallenge,
    withDeletionScopes,
    type DeletionScopes,
} from "@/client/lib/deletion-reauth";
import { fetchJson } from "@/client/lib/fetch-json";
import { routes } from "@/client/routes/paths";
import { useRawSearch } from "@/client/lib/use-raw-search";
import { AccountLayout, AccountPage, AccountPageIntro, AccountPanel, AccountPanelHeader } from "@/components/account/account-shell";
import { useAuthenticatedSession } from "@/components/account/authenticated-route";
import { ConfirmationPage, DeletionScopePicker, ErrorMessage, PendingDeletionBanner } from "@/components/account/privacy-views";
import type { LoginMethod } from "@/components/account/profile-sections";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { legalContacts } from "@/data/legal";

interface OsuLinkStatus {
    linked: boolean;
    banchoId?: string;
    username?: string;
}

interface StartResponse {
    reauthenticationRequired: boolean;
    confirmationPath: string;
}

export interface ScheduledDeletion {
    scopes: DeletionScopes;
    requestedAt: string;
    purgeAfter: string;
}

const noScopes: DeletionScopes = { account: false, bot: false, osuGuessr: false };

export default function AccountPrivacy() {
    const session = useAuthenticatedSession();
    const pathname = usePathname();
    const rawSearch = useRawSearch();
    const search = rawSearch ?? "";
    const router = useRouter();
    const isConfirmation = pathname.endsWith("/confirm");
    const [challenge, setChallenge] = useState<string | null>(null);
    const [osuLink, setOsuLink] = useState<OsuLinkStatus | null>(null);
    const [osuLinkUnavailable, setOsuLinkUnavailable] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loginMethods, setLoginMethods] = useState<LoginMethod[]>([]);
    const [scheduled, setScheduled] = useState<ScheduledDeletion | null>(null);
    const [scopes, setScopes] = useState<DeletionScopes>(noScopes);
    const [reauthProvider, setReauthProvider] = useState<IdentityProvider | null>(null);
    const [action, setAction] = useState<"starting" | "verifying" | "deleting" | "cancelling" | null>(null);
    const [confirmationReady, setConfirmationReady] = useState(false);
    const [typedPhrase, setTypedPhrase] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const hashChallenge = readChallengeFromHash(window.location.hash);
        const pendingChallenge = isConfirmation ? readPendingDeletionChallenge() : null;
        if (hashChallenge || pendingChallenge) setChallenge(hashChallenge ?? pendingChallenge);
        if (isConfirmation && (hashChallenge || pendingChallenge)) clearPendingDeletionChallenge();
        if (window.location.hash) window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }, [isConfirmation, pathname]);

    useEffect(() => {
        if (rawSearch === null) return;
        if (isConfirmation) {
            setLoading(false);
            return;
        }

        const controller = new AbortController();
        setLoading(true);
        const osuLinkRequest = fetchJson<OsuLinkStatus>("/api/osu-link/status", controller.signal)
            .then((result) => {
                setOsuLink(result);
                setOsuLinkUnavailable(false);
            })
            .catch(() => setOsuLinkUnavailable(true));
        const providersRequest = fetchJson<{ loginMethods: LoginMethod[] }>("/api/account/providers", controller.signal).then(
            ({ loginMethods: methods }) => {
                setLoginMethods(methods);
                setReauthProvider((current) => current ?? methods[0]?.provider ?? null);
            },
        );
        const statusRequest = fetchJson<{ scheduled: ScheduledDeletion | null }>("/api/account-deletion/status", controller.signal).then(
            (result) => setScheduled(result.scheduled),
        );
        Promise.all([osuLinkRequest, providersRequest, statusRequest])
            .catch(() => {
                if (!controller.signal.aborted) setError("Account data could not be loaded. Refresh the page to try again.");
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [isConfirmation, rawSearch, session.user.id]);

    useEffect(() => {
        if (rawSearch === null || isConfirmation) return;
        if (new URLSearchParams(rawSearch).get("delete") === "osu-guessr") setScopes((current) => ({ ...current, osuGuessr: true }));
    }, [isConfirmation, rawSearch]);

    useEffect(() => {
        if (rawSearch === null) return;
        const oauthError = readOAuthError(search);
        if (!oauthError || !new URLSearchParams(search).has("reauth")) return;

        clearPendingDeletionChallenge();
        setError(oauthError);
        router.replace(routes.profilePrivacy);
    }, [rawSearch, router, search]);

    useEffect(() => {
        if (!isConfirmation || !challenge || confirmationReady) return;
        let active = true;
        setAction("verifying");
        setError(null);
        fetchJson<{ ready: boolean }>("/api/account-deletion/reauth/complete", undefined, jsonRequest({ challenge }))
            .then(() => {
                if (active) setConfirmationReady(true);
            })
            .catch(() => {
                if (active) setError("Your recent sign-in could not be confirmed. Start again from account privacy.");
            })
            .finally(() => {
                if (active) setAction(null);
            });
        return () => {
            active = false;
        };
    }, [challenge, confirmationReady, isConfirmation, session.user.id]);

    async function startDeletion() {
        if (!reauthProvider) return;
        setAction("starting");
        setError(null);
        try {
            const result = await fetchJson<StartResponse>("/api/account-deletion/reauth/start", undefined, jsonRequest({}));
            const confirmationPath = withDeletionScopes(result.confirmationPath, scopes);
            if (result.reauthenticationRequired) {
                const callbackURL = prepareDeletionReauthentication(confirmationPath);
                try {
                    await reauthenticate(reauthProvider, callbackURL, `${routes.profilePrivacy}?reauth=1`);
                } catch (reauthenticationError) {
                    clearPendingDeletionChallenge();
                    throw reauthenticationError;
                }
                return;
            }
            router.push(confirmationPath);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Deletion could not be started.");
            setAction(null);
        }
    }

    async function scheduleDeletion(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!challenge) return;
        const confirmedScopes = readDeletionScopes(search);
        setAction("deleting");
        setError(null);
        try {
            await fetchJson<{ scheduled: ScheduledDeletion }>(
                "/api/account-deletion/schedule",
                undefined,
                jsonRequest({ challenge, confirmationPhrase: typedPhrase, scopes: confirmedScopes }),
            );
            // Scheduling the account deletion signs it out everywhere.
            if (confirmedScopes.account) window.location.replace(`${routes.login}?deletion=scheduled`);
            else window.location.replace(routes.profilePrivacy);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "The deletion could not be scheduled.");
            setAction(null);
        }
    }

    async function cancelDeletion() {
        setAction("cancelling");
        setError(null);
        try {
            await fetchJson<{ cancelled: true }>("/api/account-deletion/schedule", undefined, { method: "DELETE" });
            setScheduled(null);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "The deletion could not be cancelled.");
        } finally {
            setAction(null);
        }
    }

    if (isConfirmation) {
        return (
            <ConfirmationPage
                scopes={readDeletionScopes(search)}
                ready={confirmationReady}
                verifying={action === "verifying"}
                deleting={action === "deleting"}
                challengePresent={Boolean(challenge)}
                phrase={typedPhrase}
                error={error}
                onPhraseChange={setTypedPhrase}
                onSubmit={scheduleDeletion}
            />
        );
    }

    return (
        <AccountPage>
            <AccountLayout className="max-w-280 py-[clamp(3rem,6vw,5rem)]">
                <AccountPageIntro eyebrow="Hanami account" title="Account privacy">
                    <nav
                        className="mt-6 flex flex-wrap gap-x-6 gap-y-[0.65rem] text-[0.82rem] [&_a]:text-muted [&_a]:underline [&_a]:decoration-white/40 [&_a]:underline-offset-[0.25em]"
                        aria-label="Account sections"
                    >
                        <PrefetchLink href={routes.profile}>Account and preferences</PrefetchLink>
                        <span className="text-white" aria-current="page">
                            Privacy and deletion
                        </span>
                    </nav>
                </AccountPageIntro>

                {error && <ErrorMessage>{error}</ErrorMessage>}

                {scheduled && (
                    <PendingDeletionBanner
                        scopes={scheduled.scopes}
                        purgeAfter={formatDeletionDate(scheduled.purgeAfter)}
                        cancelling={action === "cancelling"}
                        onCancel={cancelDeletion}
                    />
                )}

                <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:grid-rows-[auto_1fr]">
                    <AccountPanel className="lg:row-span-2 lg:grid lg:grid-rows-subgrid lg:gap-0" aria-labelledby="identity-title">
                        <AccountPanelHeader id="identity-title" title="Account data" />
                        <dl className="grid gap-8 px-[clamp(1.35rem,3vw,2rem)] py-5 [&_dd]:mt-2 [&_dd]:text-base [&_dd]:font-bold [&_dd]:text-white [&_dt]:text-[0.78rem] [&_dt]:font-medium [&_dt]:text-quiet [&_small]:mt-1 [&_small]:block [&_small]:text-[0.78rem] [&_small]:leading-[1.55] [&_small]:text-muted">
                            <div>
                                <dt>Current Hanami account</dt>
                                <dd>{session.user.name || "Hanami user"}</dd>
                                <small>Your Hanami profile, linked accounts, and sign-in sessions</small>
                            </div>
                            <div>
                                <dt>osu! account used by Hanami Bot</dt>
                                <dd>
                                    {loading
                                        ? "Checking…"
                                        : osuLinkUnavailable
                                          ? "Status unavailable"
                                          : osuLink?.linked
                                            ? osuLink.username || `osu! ID ${osuLink.banchoId}`
                                            : "Not connected"}
                                </dd>
                                <small>
                                    {osuLink?.linked ? `osu! ID ${osuLink.banchoId}` : "Hanami Bot is not using an osu! account for you"}
                                </small>
                            </div>
                        </dl>
                    </AccountPanel>

                    <AccountPanel
                        className="border-danger/35 lg:row-span-2 lg:grid lg:grid-rows-subgrid lg:gap-0"
                        aria-labelledby="delete-title"
                    >
                        <AccountPanelHeader
                            id="delete-title"
                            title="Delete data"
                            description="Choose what to delete. Nothing is removed for 14 days, and you can cancel until then."
                        />
                        <DeletionScopePicker
                            scopes={scopes}
                            loginMethods={loginMethods}
                            reauthProvider={reauthProvider}
                            disabled={loading || Boolean(scheduled)}
                            starting={action === "starting"}
                            onScopesChange={setScopes}
                            onReauthProviderChange={setReauthProvider}
                            onContinue={startDeletion}
                        />
                    </AccountPanel>
                </div>

                <AccountPanel className="mt-6" aria-labelledby="requests-title">
                    <AccountPanelHeader
                        id="requests-title"
                        title="Other privacy requests"
                        description="For access, correction, restriction, objection, or an account you can no longer reach."
                    />
                    <p className="p-[clamp(1.35rem,3vw,2rem)] text-[0.84rem] leading-[1.7] text-muted [&_a]:text-white [&_a]:underline [&_a]:decoration-white/45 [&_a]:underline-offset-[0.22em]">
                        Email <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a> for help with data you cannot delete
                        here. Never send passwords, tokens, cookies, API keys, or backup codes. Read the{" "}
                        <PrefetchLink href={routes.legalDataDeletion}>data deletion details</PrefetchLink> for what is deleted from each
                        service.
                    </p>
                </AccountPanel>
            </AccountLayout>
        </AccountPage>
    );
}

function jsonRequest(body: Record<string, unknown>): RequestInit {
    return {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    };
}

function readChallengeFromHash(hash: string): string | null {
    if (!hash.startsWith("#")) return null;
    const value = new URLSearchParams(hash.slice(1)).get("challenge");
    return value && value.length >= 32 && value.length <= 128 ? value : null;
}
