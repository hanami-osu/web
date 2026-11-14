import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import Footer from "@/components/footer";
import Header from "@/components/header";
import {
    heroMinHeightClass,
    sectionBodyClass,
    sectionHeadingClass,
    siteContainerClass,
    sitePageClass,
    titleClass,
} from "@/components/layout/styles";

export { sectionBodyClass, sectionHeadingClass };

export const productHeroCopyClass = "relative z-20 max-w-180";
export const productTitleClass = cn(titleClass, "text-accent");
export const productBodyClass = "mt-3 max-w-[62ch] text-base leading-relaxed text-muted";

export function ProductPage({ children }: { children: ReactNode }) {
    return (
        <div className={sitePageClass}>
            <Header />
            <main>{children}</main>
            <Footer />
        </div>
    );
}

export function ProductHero({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <section className={cn("border-b border-border", className)}>
            <div
                className={cn(
                    siteContainerClass,
                    heroMinHeightClass,
                    "grid grid-cols-1 items-center gap-4 py-10 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.65fr)] md:gap-12 md:py-12",
                )}
            >
                {children}
            </div>
        </section>
    );
}

export function HeroActions({ children }: { children: ReactNode }) {
    return <div className="mt-6 flex flex-wrap gap-3 max-xs:flex-col max-xs:items-stretch">{children}</div>;
}

export function ProductSection({ children, className, ...props }: React.ComponentPropsWithoutRef<"section">) {
    return (
        <section {...props} className={cn(siteContainerClass, "py-6 md:py-8 [&>header]:mb-5", className)}>
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
                    "grid grid-cols-[minmax(0,0.78fr)_minmax(320px,0.7fr)] items-start gap-6 py-6 max-md:grid-cols-1 md:gap-12 md:py-8",
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
                "flex items-center justify-between gap-8 py-6 max-xs:flex-col max-xs:items-start max-xs:gap-4 md:py-8 [&>a]:shrink-0 [&>p]:max-w-[70ch] [&>p]:text-[0.85rem] [&>p]:leading-[1.65] [&>p]:text-muted [&>p>strong]:text-white [&>svg]:size-5.5 [&>svg]:shrink-0",
                className,
            )}
        >
            {children}
        </aside>
    );
}

export function ProductSteps({ children }: { children: ReactNode }) {
    return <ol className="grid gap-4 [counter-reset:step]">{children}</ol>;
}

export function ProductStep({ children }: { children: ReactNode }) {
    return (
        <li className="grid grid-cols-[1.25rem_1fr] gap-3 [counter-increment:step] before:font-display before:font-semibold before:text-accent before:content-[counter(step)] [&_p]:mt-1 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted [&_strong]:text-sm [&_strong]:font-semibold">
            <div>{children}</div>
        </li>
    );
}
