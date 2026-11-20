"use client";

import { ArrowRight, Coffee, ExternalLink, GitFork } from "lucide-react";
import { useEffect, useState } from "react";

import { useSession } from "@/client/lib/auth";
import { createLoginPath } from "@/client/lib/auth-navigation";
import { fetchJson } from "@/client/lib/fetch-json";
import { startSupporterLink, useSupporterOverview, type SupporterProvider, type SupporterOverview } from "@/client/lib/supporter";
import { routes } from "@/client/routes/paths";
import { StatusLine } from "./supporter-section";
import { siteConfig } from "@/data/site-config";

// Buy Me a Coffee comes first: most osu! players don't have a GitHub account.
const platforms = {
    bmc: {
        id: "bmc",
        name: "Buy Me a Coffee",
        terms: "Monthly or one-time",
        icon: Coffee,
        color: "bg-[#342d1c] text-[#f2ce76]",
        page: siteConfig.links.buyMeACoffee,
        instructions: "Get a claim code, then paste it into your payment message.",
    },
    github: {
        id: "github",
        name: "GitHub Sponsors",
        terms: "Monthly or one-time",
        icon: GitFork,
        color: "bg-[#302638] text-[#d6b7f1]",
        page: siteConfig.links.githubSponsors,
        instructions: "Link the GitHub account you’ll sponsor with. If you’ve already paid, linking checks for your badge.",
    },
} as const;

type LinkableProvider = Exclude<SupporterProvider, "bmc">;
type LinkError = { provider: LinkableProvider; message: string };

const linkErrors: Record<string, string> = {
    taken: "That account is already linked to a different Hanami account.",
    invalid: "The link request expired or didn't match this session. Try again.",
    failed: "The account could not be linked. Try again.",
};

type LinkResult = { linkError: LinkError | null; message: string | null };

/** Reads a failed link result from the callback redirect, then clears it from the address bar. */
function takeLinkResult(): LinkResult | null {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("supporter");
    if (!result) return null;
    window.history.replaceState(null, "", window.location.pathname + window.location.hash);
    const message = Object.hasOwn(linkErrors, result) ? linkErrors[result] : null;
    const provider = params.get("provider");
    if (message && provider === "github") return { linkError: { provider, message }, message: null };
    return { linkError: null, message };
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });

export function SupportPlatforms() {
    const { data: session } = useSession();
    const [linkResult, setLinkResult] = useState<LinkResult | null>(null);
    // Only store a result that was found: the URL is cleared after the first read, so a repeated run finds nothing.
    useEffect(() => {
        const result = takeLinkResult();
        if (result) setLinkResult(result);
    }, []);
    return <PlatformManager key={session?.user.id ?? "guest"} signedIn={Boolean(session)} linkResult={linkResult} />;
}

function PlatformManager({ signedIn, linkResult }: { signedIn: boolean; linkResult: LinkResult | null }) {
    const { overview, loading, loadError, refresh } = useSupporterOverview(signedIn);
    const [busy, setBusy] = useState<string | null>(null);
    const [claim, setClaim] = useState<{ code: string; expiresAt: string } | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [linkError, setLinkError] = useState<LinkError | null>(null);

    useEffect(() => {
        if (linkResult?.linkError) setLinkError(linkResult.linkError);
        if (linkResult?.message) setMessage(linkResult.message);
    }, [linkResult]);

    async function link(provider: LinkableProvider) {
        setBusy(provider);
        setMessage(null);
        setLinkError(null);
        try {
            await startSupporterLink(provider);
        } catch (error) {
            setLinkError({ provider, message: error instanceof Error ? error.message : "Linking could not be started." });
            setBusy(null);
        }
    }

    async function unlink(provider: SupporterProvider) {
        if (!window.confirm(`Unlink ${platforms[provider].name}? Time you already received stays on your account.`)) return;
        setBusy(provider);
        setMessage(null);
        setLinkError(null);
        try {
            await fetchJson(`/api/supporter/link/${provider}`, undefined, { method: "DELETE" });
            if (provider === "bmc") setClaim(null);
            await refresh();
        } catch {
            setMessage(`${platforms[provider].name} could not be unlinked.`);
        } finally {
            setBusy(null);
        }
    }

    async function createClaimCode() {
        setBusy("bmc");
        setMessage(null);
        try {
            setClaim(await fetchJson<{ code: string; expiresAt: string }>("/api/supporter/claim-code", undefined, { method: "POST" }));
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "A claim code could not be created.");
        } finally {
            setBusy(null);
        }
    }

    return (
        <SupporterPanel
            signedIn={signedIn}
            loading={loading}
            overview={overview}
            busy={busy}
            claim={claim}
            message={loadError ? "Could not refresh supporter status." : message}
            linkError={linkError}
            onLink={(provider) => void link(provider)}
            onUnlink={(provider) => void unlink(provider)}
            onCreateClaimCode={() => void createClaimCode()}
        />
    );
}

interface SupporterPanelProps {
    signedIn: boolean;
    loading: boolean;
    overview: SupporterOverview | null;
    busy: string | null;
    claim: { code: string; expiresAt: string } | null;
    message: string | null;
    linkError?: LinkError | null;
    onLink: (provider: LinkableProvider) => void;
    onUnlink: (provider: SupporterProvider) => void;
    onCreateClaimCode: () => void;
}

export function SupporterPanel({
    signedIn,
    loading,
    overview,
    busy,
    claim,
    message,
    linkError,
    onLink,
    onUnlink,
    onCreateClaimCode,
}: SupporterPanelProps) {
    const [copyResult, setCopyResult] = useState<{ code: string; message: string } | null>(null);
    async function copyCode(code: string) {
        try {
            await navigator.clipboard.writeText(code);
            setCopyResult({ code, message: "Copied!" });
        } catch {
            setCopyResult({ code, message: "Select the code above and copy it manually." });
        }
    }

    return (
        <div id="supporter" className="grid scroll-mt-20 gap-4">
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                <h2 id="platforms-title" className="font-display text-2xl leading-tight font-semibold tracking-tight">
                    Choose a platform
                </h2>
                {overview && (
                    <div className="max-w-full rounded-lg border border-border bg-surface px-2.5 py-1.5">
                        <StatusLine status={overview.status} />
                    </div>
                )}
            </header>
            {message && (
                <p role="status" className="text-sm text-danger">
                    {message}
                </p>
            )}
            <ul className="grid gap-3">
                {Object.values(platforms).map(({ id, name, terms, icon: Icon, color, page, instructions }) => {
                    const entry = overview?.links.find((link) => link.provider === id);
                    const anchor = id === "bmc" ? "buy-me-a-coffee" : `supporter-${id}`;
                    const actionClass =
                        "mt-3 inline-flex min-h-10 max-w-full items-center gap-2 rounded-md border border-accent/25 bg-accent/5 px-3 py-2 text-sm leading-tight font-medium text-accent-soft hover:border-accent/55 hover:bg-accent/10 disabled:opacity-60 [&_svg]:size-4 [&_svg]:shrink-0";
                    const providerName = id === "github" ? "GitHub" : name;
                    return (
                        <li
                            key={id}
                            id={anchor}
                            className="grid scroll-mt-20 grid-cols-[auto_minmax(0,1fr)] items-start gap-x-3.5 rounded-xl border border-border bg-surface p-4 text-text sm:px-5"
                        >
                            <span className={`grid size-10 place-items-center rounded-xl ${color}`}>
                                <Icon aria-hidden="true" className="size-5" />
                            </span>
                            <div>
                                <div className="flex flex-col gap-y-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-3">
                                    <strong className="font-display text-base font-semibold">{name}</strong>
                                    <span className="text-xs text-muted">{terms}</span>
                                </div>
                                <p className="mt-2 text-sm leading-relaxed text-muted">
                                    {entry
                                        ? `Linked${entry.displayName ? ` as ${entry.displayName}` : " to your Hanami account"}.`
                                        : instructions}
                                </p>
                                {!signedIn ? (
                                    <a className={actionClass} href={createLoginPath(routes.supporter)}>
                                        {id === "bmc" ? "Sign in to get your code" : `Sign in to link ${providerName}`}{" "}
                                        <ArrowRight aria-hidden="true" className="size-4" />
                                    </a>
                                ) : loading ? (
                                    <span className="text-xs text-muted">Checking account…</span>
                                ) : entry ? (
                                    <>
                                        <a className={actionClass} href={page} target="_blank" rel="noreferrer">
                                            Support on {name} <ArrowRight aria-hidden="true" className="size-4" />
                                        </a>
                                        <div className="flex flex-wrap gap-x-4 text-xs text-muted">
                                            {id !== "bmc" && (
                                                <button
                                                    className="min-h-9 hover:text-text"
                                                    disabled={busy !== null}
                                                    onClick={() => onLink(id)}
                                                >
                                                    Check payment
                                                </button>
                                            )}
                                            <button
                                                className="min-h-9 hover:text-text"
                                                disabled={busy !== null}
                                                onClick={() => onUnlink(id)}
                                            >
                                                Unlink
                                            </button>
                                        </div>
                                    </>
                                ) : id === "bmc" ? (
                                    <button className={actionClass} disabled={busy !== null} onClick={onCreateClaimCode}>
                                        {busy === id ? "Creating…" : claim ? "New claim code" : "Get a claim code"}{" "}
                                        <ArrowRight aria-hidden="true" />
                                    </button>
                                ) : (
                                    <button className={actionClass} disabled={busy !== null} onClick={() => onLink(id)}>
                                        {busy === id ? "Opening…" : `Link ${providerName}`} <ArrowRight aria-hidden="true" />
                                    </button>
                                )}
                                {linkError?.provider === id && (
                                    <p role="status" className="mt-2 text-sm text-danger">
                                        {linkError.message}
                                    </p>
                                )}
                                {id === "bmc" && claim && !entry && (
                                    <div
                                        role="status"
                                        className="mt-3 grid justify-items-start gap-2 rounded-md border border-border bg-bg p-3 text-sm leading-relaxed text-muted"
                                    >
                                        <p className="font-mono font-semibold break-all text-white select-all">{claim.code}</p>
                                        <button
                                            type="button"
                                            className="min-h-9 text-sm font-medium text-accent-soft hover:underline"
                                            onClick={() => void copyCode(claim.code)}
                                        >
                                            Copy code
                                        </button>
                                        {copyResult?.code === claim.code && <span>{copyResult.message}</span>}
                                        <p>
                                            Paste this code into the message when you pay. You can keep the message private. The code
                                            expires on {dateFormatter.format(new Date(claim.expiresAt))}.
                                        </p>
                                    </div>
                                )}
                                {id === "bmc" && !entry && claim && (
                                    <a className={actionClass} href={page} target="_blank" rel="noreferrer">
                                        Open {name}
                                        <ExternalLink aria-hidden="true" />
                                    </a>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
