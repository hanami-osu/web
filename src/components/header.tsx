"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

import { routes } from "@/client/routes/paths";
import { siteContainerClass } from "@/components/layout/styles";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import ProfileAction from "@/components/navigation/profile-action";
import { navigation, siteConfig } from "@/data/site-config";
import { navIn } from "@/lib/motion";
import { cn } from "@/lib/utils";

export default function Header() {
    const [menuOpen, setMenuOpen] = useState(false);
    const headerRef = useRef<HTMLElement>(null);
    const menuButtonRef = useRef<HTMLButtonElement>(null);
    const pathname = usePathname();

    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!menuOpen) return;
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setMenuOpen(false);
                menuButtonRef.current?.focus();
            }
        };
        const closeOnOutsideClick = (event: PointerEvent) => {
            if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
        };

        document.addEventListener("keydown", closeOnEscape);
        document.addEventListener("pointerdown", closeOnOutsideClick);
        return () => {
            document.removeEventListener("keydown", closeOnEscape);
            document.removeEventListener("pointerdown", closeOnOutsideClick);
        };
    }, [menuOpen]);

    return (
        <header ref={headerRef} className="sticky top-0 isolate z-50 h-[65px] border-b border-border bg-bg print:hidden">
            <div className={cn(siteContainerClass, "flex h-full items-center gap-6")}>
                <PrefetchLink
                    href={routes.home}
                    prefetch="none"
                    className="inline-flex shrink-0 items-center gap-2 font-display text-xl font-bold tracking-[-0.03em] text-accent no-underline transition-colors hover:text-accent-soft sm:text-2xl"
                    aria-label="Hanami home"
                >
                    <img className="size-8 object-contain" src="/hanami-transparent.png" alt="" width="42" height="42" />
                    <span>Hanami</span>
                </PrefetchLink>

                <nav className="hidden h-full items-center gap-7 md:flex" aria-label="Primary navigation">
                    {navigation.map((item) => (
                        <PrefetchLink
                            key={item.to}
                            href={item.to}
                            prefetch="intent"
                            aria-current={pathname === item.to ? "page" : undefined}
                            className="relative inline-flex h-full items-center text-[0.95rem] font-medium whitespace-nowrap text-body no-underline transition-colors duration-150 after:absolute after:inset-x-0 after:bottom-3 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform after:duration-150 hover:text-accent-soft hover:after:scale-x-100 aria-[current=page]:text-accent-soft aria-[current=page]:after:scale-x-100"
                        >
                            {item.label}
                        </PrefetchLink>
                    ))}
                </nav>

                <div className="ml-auto flex items-center gap-1.5">
                    <ProfileAction mobileNavigationOpen={menuOpen} onMenuOpen={() => setMenuOpen(false)} />
                    <button
                        ref={menuButtonRef}
                        className="inline-flex size-11 items-center justify-center rounded-sm border border-border bg-transparent text-white hover:bg-surface md:hidden [&_svg]:size-5"
                        type="button"
                        aria-expanded={menuOpen}
                        aria-controls="mobile-navigation"
                        aria-label={menuOpen ? "Close navigation" : "Open navigation"}
                        onClick={() => setMenuOpen((open) => !open)}
                    >
                        {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                    </button>
                </div>
            </div>

            <nav
                id="mobile-navigation"
                className={cn(
                    "absolute inset-x-0 top-full max-h-[calc(100dvh-65px)] overflow-y-auto border-b border-border bg-bg px-4 py-4 md:hidden",
                    navIn,
                )}
                aria-label="Mobile navigation"
                hidden={!menuOpen}
            >
                <div className="mx-auto max-w-180">
                    <PrefetchLink
                        className="flex min-h-12 items-center rounded-sm px-3 text-base font-medium text-muted no-underline hover:bg-surface hover:text-white aria-[current=page]:bg-surface aria-[current=page]:text-accent-soft"
                        href={routes.home}
                        prefetch="none"
                        aria-current={pathname === routes.home ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                    >
                        Home
                    </PrefetchLink>
                </div>
                <div className="mx-auto grid max-w-180">
                    {navigation.map((item) => (
                        <PrefetchLink
                            className="flex min-h-12 items-center rounded-sm px-3 text-base font-medium text-muted no-underline hover:bg-surface hover:text-white aria-[current=page]:bg-surface aria-[current=page]:text-accent-soft"
                            key={item.to}
                            href={item.to}
                            prefetch="intent"
                            aria-current={pathname === item.to ? "page" : undefined}
                            onClick={() => setMenuOpen(false)}
                        >
                            {item.label}
                        </PrefetchLink>
                    ))}
                </div>
                <div className="mx-auto mt-3 flex max-w-180 flex-wrap gap-x-6 border-t border-border px-3 pt-3 [&_a]:inline-flex [&_a]:min-h-11 [&_a]:items-center [&_a]:text-sm [&_a]:text-muted">
                    <a href={siteConfig.links.community} target="_blank" rel="noreferrer">
                        Community
                    </a>
                    <a href={siteConfig.links.organization} target="_blank" rel="noreferrer">
                        GitHub
                    </a>
                </div>
            </nav>
        </header>
    );
}
