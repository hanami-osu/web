import { routes } from "@/client/routes/paths";
import { AuthLayout, AuthPanel } from "@/components/account/account-shell";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { primaryActionClass } from "@/components/ui/action-styles";

export default function LinkErrorPage() {
    return (
        <AuthLayout>
            <AuthPanel>
                <h1>Link expired</h1>
                <p>
                    This one-time link expired or was already used. Return to Discord and run <code>/link</code> again.
                </p>
                <PrefetchLink className={`${primaryActionClass} mt-6 w-fit`} href={routes.home}>
                    Return to Hanami
                </PrefetchLink>
            </AuthPanel>
        </AuthLayout>
    );
}
