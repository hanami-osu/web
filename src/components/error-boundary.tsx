import { Component, type ErrorInfo, type ReactNode } from "react";

import { primaryActionClass, secondaryActionClass } from "@/components/ui/action-styles";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
    children: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = {
        hasError: false,
    };

    static getDerivedStateFromError(): ErrorBoundaryState {
        return {
            hasError: true,
        };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("Unhandled React error", error, info);
    }

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <main className="grid min-h-screen place-items-center bg-bg px-6 text-text">
                <section className="max-w-xl text-center">
                    <p className="text-[0.82rem] font-medium text-accent">Something went wrong</p>

                    <h1 className="mt-4 text-4xl font-bold tracking-[-0.04em]">Hanami couldn’t load this page.</h1>

                    <p className="mt-4 leading-7 text-muted">Try reloading the page. If the problem continues, return to the homepage.</p>

                    <div className="mt-8 flex flex-wrap justify-center gap-3">
                        <button className={cn(primaryActionClass)} type="button" onClick={() => window.location.reload()}>
                            Reload page
                        </button>

                        <a className={cn(primaryActionClass, secondaryActionClass)} href="/">
                            Go home
                        </a>
                    </div>
                </section>
            </main>
        );
    }
}
