import { oauthProvider } from "@better-auth/oauth-provider";

import {
    buildOsuClaims,
    buildSupporterClaims,
    osuClaimNames,
    supporterClaimNames,
    type OsuClaimsDatabase,
    type SupporterClaimsDatabase,
} from "./claims";

const coreClaimNames = ["sub", "iss", "aud", "exp", "iat", "sid", "scope", "azp"] as const;
export const osuOAuthContinuationPath = "/oauth/continue/osu";
export const oauthConsentPath = "/oauth/consent";

export interface OAuthProviderDatabase extends OsuClaimsDatabase, SupporterClaimsDatabase {
    accountDeletionSchedule: {
        count(args: { where: { userId: string } }): Promise<number>;
    };
}

export function createHanamiOAuthProviderPlugin(database: OAuthProviderDatabase) {
    const customClaims = async ({ user, scopes }: { user?: { id: string } | null; scopes: readonly string[] }) => {
        if (!user) return {};
        const claims: Record<string, string | boolean> = await buildOsuClaims(user.id, scopes, database);
        delete claims.sub;
        return { ...claims, ...(await buildSupporterClaims(user.id, scopes, database)) };
    };

    return oauthProvider({
        scopes: ["openid", "osu", "supporter", "offline_access"],
        grantTypes: ["authorization_code", "refresh_token"],
        loginPage: "/login",
        consentPage: oauthConsentPath,
        postLogin: {
            page: osuOAuthContinuationPath,
            consentReferenceId: async () => undefined,
            shouldRedirect: async ({ user, scopes }) => {
                // Accounts with a scheduled deletion must cancel it before signing in to an app.
                if (await database.accountDeletionSchedule.count({ where: { userId: user.id } })) return true;
                if (!scopes.includes("osu")) return false;
                const profile = await database.osuProfile.findUnique({
                    where: { userId: user.id },
                    select: { osuId: true, username: true, avatarUrl: true },
                });
                return profile === null;
            },
        },
        allowDynamicClientRegistration: false,
        allowUnauthenticatedClientRegistration: false,
        refreshTokenReuseInterval: 0,
        advertisedMetadata: {
            claims_supported: [...coreClaimNames, ...osuClaimNames, ...supporterClaimNames],
        },
        customAccessTokenClaims: customClaims,
        customIdTokenClaims: customClaims,
        customUserInfoClaims: customClaims,
    });
}
