import { AlertCircle, Loader2 } from "lucide-react";
import type { FormEvent, ReactNode } from "react";

import type { IdentityProvider } from "@/client/lib/auth";
import type { DeletionScopes } from "@/client/lib/deletion-reauth";
import { routes } from "@/client/routes/paths";
import { AccountPanel, AuthLayout, AuthPanel } from "@/components/account/account-shell";
import type { LoginMethod } from "@/components/account/profile-sections";
import { Eyebrow } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { dangerOutlineActionClass, formMessageClass, loadingInlineClass, primaryActionClass } from "@/components/ui/action-styles";
import { legalContacts } from "@/data/legal";
import { cn } from "@/lib/utils";

const confirmationPhrase = "DELETE MY DATA";

const scopeOptions: ReadonlyArray<{
    key: keyof DeletionScopes;
    label: string;
    description: string;
    requires: IdentityProvider | null;
}> = [
    {
        key: "osuGuessr",
        label: "osu!guessr data",
        description: "Profile, games, pp, achievements, badges, API keys, and reports.",
        requires: "osu",
    },
    {
        key: "bot",
        label: "Hanami Bot data",
        description: "Bot preferences and the osu! account the Bot uses for you.",
        requires: "discord",
    },
    {
        key: "account",
        label: "Hanami account",
        description: "Your Hanami profile, sign-in methods, and sessions. Includes Hanami Bot data.",
        requires: null,
    },
];

const providerLabels: Record<IdentityProvider, string> = { discord: "Discord", osu: "osu!" };

function selectedScopeLabels(scopes: DeletionScopes): string[] {
    return scopeOptions.filter((option) => scopes[option.key]).map((option) => option.label);
}

export function DeletionScopePicker({
    scopes,
    loginMethods,
    reauthProvider,
    disabled,
    starting,
    onScopesChange,
    onReauthProviderChange,
    onContinue,
}: {
    scopes: DeletionScopes;
    loginMethods: readonly LoginMethod[];
    reauthProvider: IdentityProvider | null;
    disabled: boolean;
    starting: boolean;
    onScopesChange: (scopes: DeletionScopes) => void;
    onReauthProviderChange: (provider: IdentityProvider) => void;
    onContinue: () => void;
}) {
    const linked = new Set(loginMethods.map((method) => method.provider));
    const nothingSelected = !scopes.account && !scopes.bot && !scopes.osuGuessr;

    function toggle(key: keyof DeletionScopes, checked: boolean) {
        const next = { ...scopes, [key]: checked };
        if (key === "account" && checked && linked.has("discord")) next.bot = true;
        onScopesChange(next);
    }

    return (
        <div className="p-[clamp(1.35rem,3vw,2rem)]">
            <fieldset className="grid gap-4" disabled={disabled || starting}>
                <legend className="sr-only">Data to delete</legend>
                {scopeOptions.map((option) => {
                    const unavailable = option.requires !== null && !linked.has(option.requires);
                    const lockedByAccount = option.key === "bot" && scopes.account;
                    return (
                        <label
                            key={option.key}
                            className={cn("flex gap-3 text-[0.84rem] leading-[1.6]", unavailable ? "opacity-50" : "cursor-pointer")}
                        >
                            <input
                                className="mt-1 size-4 shrink-0 accent-danger"
                                type="checkbox"
                                checked={!unavailable && scopes[option.key]}
                                disabled={unavailable || lockedByAccount}
                                onChange={(event) => toggle(option.key, event.target.checked)}
                            />
                            <span>
                                <span className="block font-medium text-white">{option.label}</span>
                                <span className="block text-muted">
                                    {unavailable ? `Connect ${providerLabels[option.requires!]} to have this data.` : option.description}
                                </span>
                            </span>
                        </label>
                    );
                })}
            </fieldset>

            {loginMethods.length > 1 ? (
                <fieldset className="mt-6 grid gap-2 text-[0.82rem]" disabled={disabled || starting}>
                    <legend className="mb-2 text-[0.78rem] font-medium text-quiet">Confirm by signing in again with</legend>
                    {loginMethods.map((method) => (
                        <label key={method.provider} className="flex cursor-pointer items-center gap-2 text-body">
                            <input
                                className="accent-accent"
                                type="radio"
                                name="reauth-provider"
                                checked={reauthProvider === method.provider}
                                onChange={() => onReauthProviderChange(method.provider)}
                            />
                            {providerLabels[method.provider]}
                        </label>
                    ))}
                </fieldset>
            ) : (
                reauthProvider && (
                    <p className="mt-6 text-[0.78rem] leading-[1.6] text-quiet">
                        You will confirm by signing in with {providerLabels[reauthProvider]} again.
                    </p>
                )
            )}

            <button
                className={cn(primaryActionClass, dangerOutlineActionClass, "mt-6 w-full justify-center")}
                type="button"
                onClick={onContinue}
                disabled={disabled || starting || nothingSelected || !reauthProvider}
            >
                {starting ? "Preparing verification…" : "Continue"}
            </button>
            <p className="mt-5 text-[0.74rem] leading-[1.6] text-quiet">
                Selected data is hidden right away and permanently deleted after 14 days. Your Discord and osu! accounts are never deleted.
            </p>
        </div>
    );
}

export function PendingDeletionBanner({
    scopes,
    purgeAfter,
    cancelling,
    onCancel,
}: {
    scopes: DeletionScopes;
    purgeAfter: string;
    cancelling: boolean;
    onCancel: () => void;
}) {
    return (
        <AccountPanel className="mt-8 border-danger/45" aria-labelledby="pending-deletion-title" role="status">
            <div className="flex flex-col gap-5 p-[clamp(1.35rem,3vw,2rem)] sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 id="pending-deletion-title" className="text-base font-bold text-white">
                        Deletion scheduled for {purgeAfter}
                    </h2>
                    <p className="mt-2 text-[0.84rem] leading-[1.65] text-muted">
                        {selectedScopeLabels(scopes).join(", ")} will be permanently deleted then. Until that date it is hidden, and
                        cancelling restores everything.
                    </p>
                </div>
                <button
                    className={cn(primaryActionClass, "shrink-0 justify-center")}
                    type="button"
                    onClick={onCancel}
                    disabled={cancelling}
                >
                    {cancelling ? "Cancelling…" : "Cancel deletion"}
                </button>
            </div>
        </AccountPanel>
    );
}
const terminalPanelClass =
    "w-[min(100%,720px)] [&>h1]:text-[clamp(2.25rem,6vw,4rem)] [&>p]:max-w-[68ch] [&>p]:text-[0.88rem] [&_a:not(.primary-action)]:text-white [&_a:not(.primary-action)]:underline [&_a:not(.primary-action)]:decoration-white/45 [&_a:not(.primary-action)]:underline-offset-[0.25em]";

export function ConfirmationPage({
    scopes,
    ready,
    verifying,
    deleting,
    challengePresent,
    phrase,
    error,
    onPhraseChange,
    onSubmit,
}: {
    scopes: DeletionScopes;
    ready: boolean;
    verifying: boolean;
    deleting: boolean;
    challengePresent: boolean;
    phrase: string;
    error: string | null;
    onPhraseChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
    return (
        <AuthLayout>
            <AuthPanel className={terminalPanelClass} aria-labelledby="confirm-title">
                <Eyebrow>Scheduled deletion</Eyebrow>
                <h1 id="confirm-title">Confirm what to delete</h1>
                {verifying ? (
                    <p className={cn(loadingInlineClass, "justify-start")} role="status">
                        <Loader2 aria-hidden="true" /> Verifying your recent sign-in…
                    </p>
                ) : !challengePresent || !ready || selectedScopeLabels(scopes).length === 0 ? (
                    <>
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        <p>This confirmation is missing, expired, or was opened under a different account.</p>
                        <PrefetchLink className={cn(primaryActionClass, "primary-action mt-6")} href={routes.profilePrivacy}>
                            Start again
                        </PrefetchLink>
                    </>
                ) : (
                    <form className="mt-6" onSubmit={onSubmit}>
                        <ul className="list-disc pl-5 text-[0.88rem] leading-[1.7] text-white">
                            {selectedScopeLabels(scopes).map((label) => (
                                <li key={label}>{label}</li>
                            ))}
                        </ul>
                        <p className="mt-4 text-[0.88rem] leading-[1.7] text-muted">
                            The selected data is hidden now and permanently deleted after 14 days. Until then you can cancel from account
                            privacy and everything is restored.{scopes.account ? " You will be signed out everywhere." : ""} Your Discord
                            and osu! accounts are never deleted.
                        </p>
                        <p className="mt-3 text-[0.82rem] leading-[1.65] text-muted">
                            For other data, contact <a href={`mailto:${legalContacts.privacy}`}>{legalContacts.privacy}</a>.
                        </p>
                        {error && <ErrorMessage>{error}</ErrorMessage>}
                        <label className="mt-8 grid gap-[0.7rem]">
                            <span className="text-[0.82rem] font-bold text-body">
                                Type <code className="font-mono text-accent-soft">{confirmationPhrase}</code> to continue
                            </span>
                            <input
                                className="min-h-12.5 w-full rounded-sm border border-border-strong bg-surface px-[0.9rem] text-white focus-visible:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent/30"
                                type="text"
                                value={phrase}
                                onChange={(event) => onPhraseChange(event.target.value)}
                                autoComplete="off"
                                spellCheck="false"
                                aria-describedby="confirmation-help"
                            />
                        </label>
                        <p id="confirmation-help" className="mt-3 text-[0.78rem] leading-[1.6] text-muted">
                            The phrase is checked by the server. Surrounding and repeated whitespace is normalized; capitalization must
                            match.
                        </p>
                        <button
                            className={cn(primaryActionClass, dangerOutlineActionClass, "mt-6")}
                            type="submit"
                            disabled={!phrase.trim() || deleting}
                        >
                            {deleting ? "Scheduling…" : "Schedule deletion"}
                        </button>
                    </form>
                )}
            </AuthPanel>
        </AuthLayout>
    );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
    return (
        <p className={cn(formMessageClass, "text-danger")} role="alert">
            <AlertCircle aria-hidden="true" /> {children}
        </p>
    );
}
