import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { sectionBodyClass, sectionHeadingClass } from "@/components/layout/styles";
import { PrefetchLink, type PrefetchMode } from "@/components/navigation/prefetch-link";
import { primaryActionClass, secondaryActionClass } from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";

const actionVariants = {
    primary: "",
    secondary: secondaryActionClass,
} as const;

interface ActionLinkProps {
    children: ReactNode;
    className?: string;
    href: string;
    variant?: "primary" | "secondary";
    external?: boolean;
    prefetch?: PrefetchMode;
}

export function ActionLink({ children, className, href, variant = "primary", external = false, prefetch = "intent" }: ActionLinkProps) {
    const classes = cn(primaryActionClass, actionVariants[variant], className);
    const content = (
        <>
            <span>{children}</span>
            {external ? <ArrowUpRight aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </>
    );

    if (external) {
        return (
            <a className={classes} href={href} target="_blank" rel="noreferrer">
                {content}
            </a>
        );
    }

    if (href.startsWith("#")) {
        return (
            <a className={classes} href={href}>
                {content}
            </a>
        );
    }

    return (
        <PrefetchLink className={classes} to={href} prefetch={prefetch}>
            {content}
        </PrefetchLink>
    );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
    return <p className={cn("mb-3 text-[0.82rem] leading-normal font-medium text-accent-soft", className)}>{children}</p>;
}

export function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body?: string }) {
    return (
        <header className="mb-8 max-w-180">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h2 className={sectionHeadingClass}>{title}</h2>
            {body && <p className={cn("mt-5", sectionBodyClass)}>{body}</p>}
        </header>
    );
}

export function TextLink({
    children,
    className,
    href,
    external = false,
    prefetch = "intent",
}: {
    children: ReactNode;
    className?: string;
    href: string;
    external?: boolean;
    prefetch?: PrefetchMode;
}) {
    const classes = cn(
        "inline-flex min-h-11 w-fit items-center gap-[0.55rem] text-[0.86rem] font-semibold text-accent-soft no-underline transition-colors duration-150 hover:text-white [&_svg]:size-4",
        className,
    );
    const content = (
        <>
            <span>{children}</span>
            {external ? <ArrowUpRight aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
        </>
    );

    if (external) {
        return (
            <a className={classes} href={href} target="_blank" rel="noreferrer">
                {content}
            </a>
        );
    }

    return (
        <PrefetchLink className={classes} to={href} prefetch={prefetch}>
            {content}
        </PrefetchLink>
    );
}
