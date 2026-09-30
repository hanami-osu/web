import type { ReactNode } from "react";

import { revealUp } from "@/lib/motion";
import { cn } from "@/lib/utils";
import Footer from "@/components/footer";
import Header from "@/components/header";
import {
    leadClass,
    sectionBodyClass,
    sectionHeadingClass,
    sectionSpacingClass,
    siteContainerClass,
    sitePageClass,
    titleClass,
} from "@/components/layout/styles";

export { sectionBodyClass, sectionHeadingClass };

export type HeroTone = "none" | "rose" | "violet" | "cyan";

const heroToneClass: Record<HeroTone, string> = {
    none: "bg-surface",
    rose: "bg-surface bg-[radial-gradient(110%_90%_at_88%_0%,rgba(235,118,170,0.10),transparent_58%)]",
    violet: "bg-surface bg-[radial-gradient(110%_90%_at_88%_0%,rgba(180,156,247,0.10),transparent_58%)]",
    cyan: "bg-surface bg-[radial-gradient(110%_90%_at_88%_0%,rgba(128,215,232,0.09),transparent_58%)]",
};

export const productHeroCopyClass = cn("relative z-20 max-w-180", revealUp);
export const productTitleClass = titleClass;
export const productSubtitleClass = cn("mt-4 max-w-[42ch]", leadClass);
export const productBodyClass = "mt-[1.2rem] max-w-[62ch] text-[1rem] leading-7 text-muted";

export function ProductPage({ children }: { children: ReactNode }) {
    return (
        <div className={sitePageClass}>
            <Header />
            <main>{children}</main>
            <Footer />
        </div>
    );
}

export function ProductHero({ children, className, tone = "none" }: { children: ReactNode; className?: string; tone?: HeroTone }) {
    return (
        <section className={cn("relative overflow-hidden border-b border-border", heroToneClass[tone], className)}>
            <div
                className={cn(
                    siteContainerClass,
                    "grid grid-cols-1 items-center gap-8 py-12 md:min-h-125 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.65fr)] md:gap-12 md:py-16",
                )}
            >
                {children}
            </div>
        </section>
    );
}

export function HeroActions({ children }: { children: ReactNode }) {
    return <div className="mt-8 flex flex-wrap gap-3 max-xs:flex-col max-xs:items-stretch">{children}</div>;
}

export function ProductSection({ children, className, ...props }: React.ComponentPropsWithoutRef<"section">) {
    return (
        <section {...props} className={cn(siteContainerClass, sectionSpacingClass, className)}>
            {children}
        </section>
    );
}

export function ProductSplit({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <section className={cn("border-y border-border bg-surface", className)}>
            <div
                className={cn(
                    siteContainerClass,
                    sectionSpacingClass,
                    "grid grid-cols-[minmax(0,0.78fr)_minmax(320px,0.7fr)] items-start gap-[clamp(3rem,9vw,9rem)] max-md:grid-cols-1 max-md:gap-6",
                )}
            >
                {children}
            </div>
        </section>
    );
}

export function ProductFootnote({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <aside
            className={cn(
                siteContainerClass,
                "flex items-center justify-between gap-8 py-10 max-xs:flex-col max-xs:items-start max-xs:gap-4 [&>a]:shrink-0 [&>p]:max-w-[70ch] [&>p]:text-[0.85rem] [&>p]:leading-[1.65] [&>p]:text-muted [&>p>strong]:text-white [&>svg]:size-5.5 [&>svg]:shrink-0",
                className,
            )}
        >
            {children}
        </aside>
    );
}

export function ProductSteps({ children, className }: { children: ReactNode; className?: string }) {
    return <ol className={cn("grid gap-5", className)}>{children}</ol>;
}

export function ProductStep({ children, icon }: { children: ReactNode; icon: ReactNode }) {
    return (
        <li className="grid grid-cols-[2rem_1fr] gap-4 py-2 [&_p]:mt-1.5 [&_p]:text-[0.86rem] [&_p]:leading-[1.6] [&_strong]:text-[0.95rem] [&_svg]:size-5 [&_svg]:text-accent-soft">
            {icon}
            <div>{children}</div>
        </li>
    );
}
