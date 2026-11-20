"use client";

import { Heart } from "lucide-react";

import { routes } from "@/client/routes/paths";
import { useSupporterOverview, type SupporterOverview } from "@/client/lib/supporter";
import { TextLink } from "@/components/marketing";
import { AccountPanel } from "./account-shell";
import { formMessageClass } from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "long" });

export function SupporterSection() {
    const { overview, loading, loadError } = useSupporterOverview(true);
    return (
        <AccountPanel
            id="supporter"
            aria-labelledby="profile-supporter-title"
            className="mt-8 flex flex-wrap items-center justify-between gap-4 p-5"
        >
            <div className="grid gap-1.5">
                <h2 id="profile-supporter-title" className="font-display text-lg font-semibold">
                    Hanami supporter
                </h2>
                {overview && <StatusLine status={overview.status} />}
                {loading && <p className="text-sm text-muted">Loading supporter status…</p>}
                {loadError && <p className="text-sm text-danger">Could not refresh supporter status.</p>}
            </div>
            <TextLink href={routes.supporter}>
                {overview?.status.badge || overview?.links.length ? "Manage support" : "Support Hanami"}
            </TextLink>
        </AccountPanel>
    );
}

export function StatusLine({ status }: { status: SupporterOverview["status"] }) {
    let text: string;
    if (status.membershipActive) {
        text =
            status.bankedDays > 0
                ? `Active supporter. ${status.bankedDays} donated days are saved for after your membership.`
                : "Active membership.";
    } else if (status.activeUntil) {
        text = `Active supporter until ${dateFormatter.format(new Date(status.activeUntil))}.`;
    } else if (status.badge) {
        text = "You have the supporter badge. Thanks for supporting Hanami!";
    } else {
        text = "Not a supporter yet.";
    }
    return (
        <p className={cn(formMessageClass, "my-0", status.active && "text-white")}>
            <Heart aria-hidden="true" className={cn(status.badge && "fill-current text-accent")} />
            {text}
        </p>
    );
}
