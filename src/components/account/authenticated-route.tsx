"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { useSession } from "@/client/lib/auth";
import { createProtectedLoginPath } from "@/client/lib/auth-navigation";
import { AccountLayout, AccountPage, profileLayoutClass } from "@/components/account/account-shell";
import { Eyebrow } from "@/components/marketing";

type AuthenticatedSession = NonNullable<ReturnType<typeof useSession>["data"]>;
const AuthenticatedSessionContext = createContext<AuthenticatedSession | null>(null);

export default function AuthenticatedRoute({ children }: { children: ReactNode }) {
    const { data: session, isPending } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (isPending || session) return;

        router.replace(
            createProtectedLoginPath({
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash,
            }),
        );
    }, [isPending, router, session]);

    if (isPending) {
        return (
            <AccountPage>
                <AccountLayout className={`${profileLayoutClass} min-h-[calc(100svh-60px)]`}>
                    <section className="max-w-220" role="status" aria-label="Loading account" aria-busy="true">
                        <span className="sr-only">Loading account</span>
                        <Eyebrow>Account</Eyebrow>
                        <div
                            className="h-14 w-[min(100%,46rem)] animate-pulse bg-white/[0.055] motion-reduce:animate-none"
                            aria-hidden="true"
                        />
                        <div
                            className="mt-4 h-4 w-[min(68%,32rem)] animate-pulse bg-white/[0.04] motion-reduce:animate-none"
                            aria-hidden="true"
                        />
                        <div
                            className="mt-2.5 h-4 w-[min(48%,23rem)] animate-pulse bg-white/[0.04] motion-reduce:animate-none"
                            aria-hidden="true"
                        />
                    </section>
                    <div className="mt-10" aria-hidden="true">
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="min-h-64 animate-pulse bg-white/[0.018] motion-reduce:animate-none md:border-r" />
                            <div className="min-h-64 animate-pulse bg-white/[0.012] motion-reduce:animate-none" />
                        </div>
                    </div>
                </AccountLayout>
            </AccountPage>
        );
    }

    if (!session) return null;

    return <AuthenticatedSessionContext.Provider value={session}>{children}</AuthenticatedSessionContext.Provider>;
}

export function useAuthenticatedSession(): AuthenticatedSession {
    const session = useContext(AuthenticatedSessionContext);
    if (!session) throw new Error("Authenticated session is unavailable outside an authenticated route.");
    return session;
}
