import { ArrowLeft, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { claimPendingAttempt, signInWithDiscord, signInWithOsu, type IdentityProvider, useSession } from "@/client/lib/auth";
import {
    getAuthenticatedLoginDestination,
    isOsuGuessrOAuthContinuationRequest,
    isOsuOAuthContinuationRequest,
    readOAuthError,
    readReturnTo,
} from "@/client/lib/auth-navigation";
import { routes } from "@/client/routes/paths";
import { AuthLayout, AuthPanel } from "@/components/account/account-shell";
import { DiscordLogo, OsuLogo } from "@/components/icons/provider-icons";
import { Eyebrow } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { primaryActionClass, textButtonClass } from "@/components/ui/action-styles";
import { revealUpFast, spin } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function Login() {
    const { data: session, isPending: isSessionPending } = useSession();
    const location = useLocation();
    const navigate = useNavigate();
    const returnTo = useMemo(() => readReturnTo(location.search), [location.search]);
    const osuAuthorization = useMemo(() => isOsuOAuthContinuationRequest(location.search), [location.search]);
    const osuGuessrAuthorization = useMemo(
        () => isOsuGuessrOAuthContinuationRequest(location.search, import.meta.env.OSU_GUESSR_CLIENT_ID ?? ""),
        [location.search],
    );
    const oauthError = useMemo(
        () => readOAuthError(location.search, osuAuthorization ? "osu" : "discord"),
        [location.search, osuAuthorization],
    );
    const accountDeleted = useMemo(() => new URLSearchParams(location.search).get("deleted") === "1", [location.search]);
    const initiationPending = useRef(false);
    const [redirectingProvider, setRedirectingProvider] = useState<IdentityProvider | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);

    useEffect(() => {
        const destination = getAuthenticatedLoginDestination(isSessionPending, Boolean(session), returnTo);
        if (destination) navigate(destination, { replace: true });
    }, [isSessionPending, navigate, returnTo, session]);

    useEffect(() => {
        if (!osuAuthorization || isSessionPending || session || initiationPending.current) return;
        void handleSignIn("osu");
    }, [isSessionPending, osuAuthorization, session]);

    async function handleSignIn(provider: IdentityProvider) {
        if (!claimPendingAttempt(initiationPending)) return;
        setRedirectingProvider(provider);
        setLocalError(null);

        try {
            if (provider === "discord") await signInWithDiscord(returnTo);
            else await signInWithOsu(returnTo);
        } catch {
            initiationPending.current = false;
            setLocalError(`${provider === "osu" ? "osu!" : "Discord"} sign-in could not be started. Check your connection and try again.`);
            setRedirectingProvider(null);
        }
    }

    if (session) return null;

    if (isSessionPending) {
        return (
            <AuthLayout>
                <LoginPending />
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <AuthPanel width="compact">
                <LoginPanel
                    error={localError || oauthError}
                    status={accountDeleted ? "Your Hanami account was deleted." : null}
                    mode={osuAuthorization ? (osuGuessrAuthorization ? "osu-guessr" : "osu") : "general"}
                    redirectingProvider={redirectingProvider}
                    onSignIn={handleSignIn}
                />
            </AuthPanel>
        </AuthLayout>
    );
}

export function LoginPanel({
    error,
    status = null,
    mode = "general",
    redirectingProvider,
    onSignIn,
}: {
    error: string | null;
    status?: string | null;
    mode?: "general" | "osu" | "osu-guessr";
    redirectingProvider: IdentityProvider | null;
    onSignIn: (provider: IdentityProvider) => void;
}) {
    const osuMode = mode !== "general";

    return (
        <section className={cn("w-full", revealUpFast)} aria-labelledby="sign-in-title">
            <Eyebrow>Hanami account</Eyebrow>
            <h1 className="text-[clamp(1.875rem,5vw,2.25rem)] leading-[1.1] tracking-[-0.04em] text-white" id="sign-in-title">
                Sign in to Hanami
            </h1>
            <p className="mt-6 max-w-[54ch] text-[clamp(1rem,1.5vw,1.12rem)] leading-[1.7] text-muted">
                {osuMode
                    ? mode === "osu-guessr"
                        ? "Hanami handles sign-in for osu!guessr. New users get a Hanami account automatically, then return to osu!guessr."
                        : "Use osu! to return to the requesting app."
                    : "Sign in with Discord or osu!. If you’ve linked both accounts, you can use either one."}
            </p>

            {status && (
                <div className="mt-7 border-l-2 border-success py-1 pl-4" role="status">
                    <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-success uppercase">Account deleted</p>
                    <p className="mt-1.5 max-w-[54ch] text-[0.84rem] leading-[1.6] text-body">{status}</p>
                </div>
            )}

            {error && (
                <div className="mt-7 border-l-2 border-danger py-1 pl-4" role="alert">
                    <p className="text-[0.7rem] font-semibold tracking-[0.08em] text-danger uppercase">Sign-in paused</p>
                    <p className="mt-1.5 max-w-[54ch] text-[0.84rem] leading-[1.6] text-body">{error}</p>
                </div>
            )}

            <div className="mt-8 grid gap-3">
                {!osuMode && (
                    <button
                        className={cn(primaryActionClass, "h-12 w-full")}
                        type="button"
                        onClick={() => onSignIn("discord")}
                        disabled={redirectingProvider !== null}
                    >
                        {redirectingProvider === "discord" ? (
                            <Loader2 className={spin} aria-hidden="true" />
                        ) : (
                            <DiscordLogo aria-hidden="true" />
                        )}
                        {redirectingProvider === "discord" ? "Opening Discord…" : "Continue with Discord"}
                    </button>
                )}
                <button
                    className={cn(primaryActionClass, "h-12 w-full")}
                    type="button"
                    onClick={() => onSignIn("osu")}
                    disabled={redirectingProvider !== null}
                >
                    {redirectingProvider === "osu" ? <Loader2 className={spin} aria-hidden="true" /> : <OsuLogo aria-hidden="true" />}
                    {redirectingProvider === "osu" ? "Opening osu!…" : osuMode ? "Try osu! again" : "Continue with osu!"}
                </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
                <PrefetchLink className={textButtonClass} to={routes.home} prefetch="none">
                    <ArrowLeft aria-hidden="true" /> Back to the public site
                </PrefetchLink>
            </div>
        </section>
    );
}

function LoginPending() {
    return (
        <section className="relative z-10 max-w-155" role="status" aria-label="Checking sign-in status" aria-busy="true">
            <span className="sr-only">Checking sign-in status</span>
            <div className="h-3 w-29 animate-pulse bg-accent/25 motion-reduce:animate-none" aria-hidden="true" />
            <div className="mt-8 h-17 w-[min(100%,30rem)] animate-pulse bg-white/[0.055] motion-reduce:animate-none" aria-hidden="true" />
            <div className="mt-6 h-5 w-[min(86%,26rem)] animate-pulse bg-white/[0.04] motion-reduce:animate-none" aria-hidden="true" />
            <div className="mt-3 h-5 w-[min(70%,21rem)] animate-pulse bg-white/[0.04] motion-reduce:animate-none" aria-hidden="true" />
            <div
                className="mt-9 h-12 w-[min(100%,23rem)] animate-pulse rounded-sm bg-white/[0.07] motion-reduce:animate-none"
                aria-hidden="true"
            />
        </section>
    );
}
