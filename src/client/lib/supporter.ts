import { useCallback, useEffect, useRef, useState } from "react";
import { fetchJson } from "./fetch-json";

export async function startSupporterLink(provider: "github") {
    const { url } = await fetchJson<{ url: string }>(`/api/supporter/link/${provider}`, undefined, { method: "POST" });
    window.location.assign(url);
}

export type SupporterProvider = "github" | "bmc";

export interface SupporterOverview {
    status: { badge: boolean; active: boolean; membershipActive: boolean; activeUntil: string | null; bankedDays: number };
    links: Array<{ provider: SupporterProvider; displayName: string | null; linkedAt: string }>;
}

export function useSupporterOverview(signedIn: boolean) {
    const [overview, setOverview] = useState<SupporterOverview | null>(null);
    const [loading, setLoading] = useState(signedIn);
    const [loadError, setLoadError] = useState(false);
    const request = useRef<AbortController | null>(null);

    const refresh = useCallback(async () => {
        request.current?.abort();
        const controller = new AbortController();
        request.current = controller;
        try {
            const data = await fetchJson<SupporterOverview>("/api/supporter", controller.signal);
            if (!controller.signal.aborted) {
                setOverview(data);
                setLoadError(false);
            }
        } catch {
            if (!controller.signal.aborted) setLoadError(true);
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!signedIn) return;
        void refresh();
        const onReturn = () => {
            if (document.visibilityState === "visible") void refresh();
        };
        document.addEventListener("visibilitychange", onReturn);
        return () => {
            request.current?.abort();
            document.removeEventListener("visibilitychange", onReturn);
        };
    }, [signedIn, refresh]);
    return { overview, loading, loadError, refresh };
}
