import type { ReactNode } from "react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { siteContainerClass, sitePageClass } from "@/components/layout/styles";
import { Eyebrow } from "@/components/marketing";
import { cn } from "@/lib/utils";

export const accountPageClass = sitePageClass;

export const profileLayoutClass = "py-[clamp(2.5rem,5vw,4rem)]";

export const profileHeadingClass =
    "mb-8 max-w-220 [&>h1]:font-display [&>h1]:text-2xl [&>h1]:font-semibold [&>h1]:tracking-tight sm:[&>h1]:text-3xl [&>p:not(:first-child)]:mt-3 [&>p:not(:first-child)]:max-w-[62ch] [&>p:not(:first-child)]:text-[0.92rem] [&>p:not(:first-child)]:leading-[1.6] [&>p:not(:first-child)]:text-muted";

export const accountPanelClass = "overflow-hidden rounded-md border border-border bg-surface [&_h3]:font-display [&_h3]:font-semibold";

export const accountPanelHeaderClass =
    "grid gap-1.5 border-b border-border px-[clamp(1.25rem,2.6vw,1.75rem)] py-4 [&_h2]:font-display [&_h2]:text-[1.125rem] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_p]:text-[0.78rem] [&_p]:leading-[1.55] [&_p]:text-muted";

export function AccountPage({ children }: { children: ReactNode }) {
    return (
        <div className={accountPageClass}>
            <Header />
            {children}
            <Footer />
        </div>
    );
}

export function AccountLayout({ children, className }: { children: ReactNode; className?: string }) {
    return <main className={cn(siteContainerClass, "py-[clamp(3rem,6vw,5rem)]", className)}>{children}</main>;
}

export function AccountPageIntro({
    eyebrow,
    title,
    description,
    children,
    className,
}: {
    eyebrow?: string;
    title: string;
    description?: string;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <header className={cn(profileHeadingClass, className)}>
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            <h1>{title}</h1>
            {description && <p>{description}</p>}
            {children}
        </header>
    );
}

export function AccountPanel({ children, className, ...props }: React.ComponentPropsWithoutRef<"section">) {
    return (
        <section {...props} className={cn(accountPanelClass, className)}>
            {children}
        </section>
    );
}

export function AccountPanelHeader({ title, description, id }: { title: string; description?: string; id?: string }) {
    return (
        <div className={accountPanelHeaderClass}>
            <h2 id={id}>{title}</h2>
            {description && <p>{description}</p>}
        </div>
    );
}

export function AuthLayout({ children }: { children: ReactNode }) {
    return (
        <AccountPage>
            <main className={cn(siteContainerClass, "grid min-h-155 place-items-center py-[clamp(3rem,7vw,5rem)]")}>{children}</main>
        </AccountPage>
    );
}

export function AuthPanel({
    children,
    className,
    width = "wide",
    ...props
}: React.ComponentPropsWithoutRef<"section"> & { width?: "compact" | "wide" }) {
    return (
        <section
            {...props}
            className={cn(
                "w-[min(100%,600px)] rounded-md border border-border bg-surface p-[clamp(1.5rem,4vw,2.25rem)] [&_h1]:font-display [&_h1]:font-semibold [&>h1]:text-2xl [&>h1]:tracking-tight sm:[&>h1]:text-3xl [&>p:not(:first-child)]:mt-4 [&>p:not(:first-child)]:leading-[1.65] [&>p:not(:first-child)]:text-muted",
                width === "compact" && "w-[min(100%,480px)] p-6 sm:p-8",
                className,
            )}
        >
            {children}
        </section>
    );
}
