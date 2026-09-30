import { ArrowLeft, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { routes } from "@/client/routes/paths";
import { siteContainerClass } from "@/components/layout/styles";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { legalDocuments, legalMetadata } from "@/data/legal";
import { cn } from "@/lib/utils";

const legalProseClass =
    "min-w-0 [&>section]:scroll-mt-26 [&>section+section]:mt-10 [&_a]:text-white [&_a]:underline [&_a]:decoration-white/45 [&_a]:underline-offset-[0.22em] [&_code]:font-mono [&_code]:text-[0.86em] [&_code]:text-accent-soft [&_h3]:mt-6 [&_h3]:mb-3 [&_h3]:text-base [&_h3]:text-body [&_li]:text-[0.93rem] [&_li]:leading-[1.78] [&_li]:text-muted [&_li+li]:mt-[0.55rem] [&_ol]:my-[0.85rem] [&_ol]:pl-[1.4rem] [&_p]:my-[0.85rem] [&_p]:text-[0.93rem] [&_p]:leading-[1.78] [&_p]:text-muted [&_ul]:my-[0.85rem] [&_ul]:pl-[1.4rem] print:max-w-none print:[&_a]:text-[#111] print:[&_h2]:text-[#111] print:[&_h3]:text-[#111] print:[&_li]:text-[#333] print:[&_p]:text-[#333]";

export interface TocItem {
    id: string;
    label: string;
}

export function LegalDocument({
    title,
    summary,
    toc,
    atAGlance,
    children,
}: {
    title: string;
    summary: string;
    toc: readonly TocItem[];
    atAGlance: readonly string[];
    children: ReactNode;
}) {
    return (
        <main className={cn(siteContainerClass, "py-[clamp(2.5rem,5vw,4rem)] print:w-full print:py-0")}>
            <header className="max-w-225 border-b border-border-strong pb-[clamp(1.75rem,3vw,2.75rem)] print:max-w-none">
                <PrefetchLink
                    to={routes.legal}
                    prefetch="intent"
                    className="mb-6 inline-flex items-center gap-2 text-[0.78rem] text-muted no-underline transition-colors hover:text-white print:hidden"
                >
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                    Legal center
                </PrefetchLink>
                <h1 className="text-[clamp(2.7rem,6vw,5.1rem)] leading-[1.02] tracking-[-0.04em] print:text-[#111]">{title}</h1>
                <p className="mt-[1.35rem] max-w-[68ch] text-base leading-[1.7] text-muted print:text-[#333]">{summary}</p>
                <dl className="mt-8 flex flex-wrap gap-x-12 gap-y-6">
                    <div>
                        <dt className="mb-[0.3rem] text-[0.78rem] font-medium text-quiet">Effective date</dt>
                        <dd className="text-[0.8rem] text-body print:text-[#333]">{legalMetadata.effectiveDate}</dd>
                    </div>
                    <div>
                        <dt className="mb-[0.3rem] text-[0.78rem] font-medium text-quiet">Last updated</dt>
                        <dd className="text-[0.8rem] text-body print:text-[#333]">{legalMetadata.lastUpdated}</dd>
                    </div>
                </dl>
            </header>

            <div className="mt-8 grid grid-cols-1 items-start gap-8 md:grid-cols-[minmax(190px,220px)_minmax(0,760px)] md:gap-[clamp(2.5rem,5vw,4.5rem)] print:mt-6 print:block">
                <nav
                    className="order-1 hidden rounded-md border border-border bg-surface/35 p-5 md:sticky md:top-26 md:block print:hidden"
                    aria-label={`${title} contents`}
                >
                    <h2 className="mb-4 text-[0.78rem] font-semibold text-white">On this page</h2>
                    <ContentsList toc={toc} />
                </nav>
                <div className="order-2 min-w-0">
                    <details className="group mb-6 rounded-md border border-border bg-surface/35 p-5 md:hidden print:hidden">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[0.82rem] font-semibold text-white">
                            On this page
                            <span className="text-accent-soft group-open:rotate-45" aria-hidden="true">
                                +
                            </span>
                        </summary>
                        <div className="mt-5">
                            <ContentsList toc={toc} />
                        </div>
                    </details>
                    <section
                        className="mb-10 rounded-md border border-accent/25 bg-accent/6 p-5 xs:p-6 print:break-inside-avoid-page"
                        aria-labelledby="at-a-glance-title"
                    >
                        <h2 className="text-[0.78rem] font-semibold tracking-[0.02em] text-accent-soft" id="at-a-glance-title">
                            At a glance
                        </h2>
                        <ul className="mt-3 grid list-disc gap-2 pl-5 marker:text-accent-soft xs:grid-cols-2">
                            {atAGlance.map((item) => (
                                <li className="pl-1 text-[0.88rem] leading-[1.6] text-body" key={item}>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </section>
                    <article className={legalProseClass}>{children}</article>
                    <LegalRelatedActions currentTitle={title} />
                </div>
            </div>
        </main>
    );
}

function ContentsList({ toc }: { toc: readonly TocItem[] }) {
    return (
        <ol className="columns-1 xs:columns-2 md:columns-1">
            {toc.map((item) => (
                <li className="break-inside-avoid [&+li]:mt-2" key={item.id}>
                    <a className="text-[0.78rem] leading-[1.4] text-muted no-underline hover:text-white" href={`#${item.id}`}>
                        {item.label}
                    </a>
                </li>
            ))}
        </ol>
    );
}

function LegalRelatedActions({ currentTitle }: { currentTitle: string }) {
    const related = legalDocuments.filter((document) => document.title !== currentTitle);

    return (
        <aside className="mt-10 border-t border-border pt-6 print:hidden" aria-labelledby="related-documents-title">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h2 className="text-lg text-white" id="related-documents-title">
                        Related documents
                    </h2>
                    <p className="mt-1 text-[0.82rem] text-muted">Keep the policy and account actions together.</p>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                    <PrefetchLink className="inline-flex items-center gap-2 text-[0.8rem] text-white" to={routes.legal} prefetch="intent">
                        All legal documents <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </PrefetchLink>
                    <PrefetchLink
                        className="inline-flex items-center gap-2 text-[0.8rem] text-white"
                        to={routes.profilePrivacy}
                        prefetch="intent"
                    >
                        Account controls <ArrowUpRight className="size-3.5" aria-hidden="true" />
                    </PrefetchLink>
                </div>
            </div>
            <div className="mt-5 grid gap-2 xs:grid-cols-3">
                {related.slice(0, 3).map((document) => (
                    <PrefetchLink
                        className="rounded-md border border-border bg-surface/35 p-4 no-underline transition-colors hover:border-border-strong hover:bg-surface"
                        key={document.path}
                        to={document.path}
                        prefetch="intent"
                    >
                        <span className="text-[0.82rem] font-medium text-white">{document.title}</span>
                        <span className="mt-1 block text-[0.74rem] leading-[1.45] text-muted">Read this next</span>
                    </PrefetchLink>
                ))}
            </div>
        </aside>
    );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
    return (
        <section className="print:break-inside-avoid-page" id={id}>
            <h2 className="mb-5 text-[clamp(1.45rem,2.8vw,2rem)] leading-[1.2] tracking-[-0.035em] text-white">
                <a href={`#${id}`}>{title}</a>
            </h2>
            {children}
        </section>
    );
}

export function LegalTable({ children }: { children: ReactNode }) {
    return (
        <div className="my-6 max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
            <table className="w-full min-w-155 border-collapse text-[0.78rem] [&_td]:border-b [&_td]:border-border [&_td]:px-3 [&_td]:py-[0.85rem] [&_td]:text-left [&_td]:align-top [&_td]:leading-[1.55] [&_td]:text-muted print:[&_td]:text-[#333] [&_th]:border-b [&_th]:border-border [&_th]:px-3 [&_th]:py-[0.85rem] [&_th]:text-left [&_th]:align-top [&_th]:leading-[1.55] [&_th]:font-bold [&_th]:text-white print:[&_th]:text-[#111]">
                {children}
            </table>
        </div>
    );
}
