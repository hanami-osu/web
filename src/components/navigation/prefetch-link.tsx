"use client";

import Link from "next/link";
import { forwardRef, type ComponentPropsWithoutRef } from "react";

export type PrefetchMode = "none" | "intent" | "viewport" | "intent-and-viewport";

export interface PrefetchLinkProps extends Omit<ComponentPropsWithoutRef<typeof Link>, "prefetch"> {
    prefetch?: PrefetchMode;
}

export const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(function PrefetchLink(
    { prefetch = "none", href, ...props },
    ref,
) {
    return <Link {...props} href={href} prefetch={prefetch === "none" ? false : true} ref={ref} />;
});
