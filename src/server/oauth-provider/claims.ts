import { describeBank, type SupporterBank } from "../supporter/domain";

const osuClaimPrefix = "https://hanami.yorunoken.com/claims/";

export const osuClaimNames = [`${osuClaimPrefix}osu_id`, `${osuClaimPrefix}osu_username`, `${osuClaimPrefix}osu_avatar`] as const;

export interface OsuClaimsDatabase {
    osuProfile: {
        findUnique(args: { where: { userId: string }; select: { osuId: true; username: true; avatarUrl: true } }): Promise<{
            osuId: string;
            username: string;
            avatarUrl: string | null;
        } | null>;
    };
}

export async function buildOsuClaims(
    userId: string,
    scopes: readonly string[],
    database: OsuClaimsDatabase,
): Promise<Record<string, string>> {
    const claims: Record<string, string> = { sub: userId };
    if (!scopes.includes("osu")) return claims;

    const profile = await database.osuProfile.findUnique({
        where: { userId },
        select: { osuId: true, username: true, avatarUrl: true },
    });
    if (!profile) return claims;

    claims[osuClaimNames[0]] = profile.osuId;
    claims[osuClaimNames[1]] = profile.username;
    if (profile.avatarUrl) claims[osuClaimNames[2]] = profile.avatarUrl;
    return claims;
}

export const supporterClaimNames = [
    `${osuClaimPrefix}supporter_badge`,
    `${osuClaimPrefix}supporter_active`,
    `${osuClaimPrefix}supporter_until`,
] as const;

export interface SupporterClaimsDatabase {
    supporterStatus: {
        findUnique(args: { where: { userId: string } }): Promise<SupporterBank | null>;
    };
}

/** Supporter state for the `supporter` scope. `supporter_until` is only set while donated time is running down. */
export async function buildSupporterClaims(
    userId: string,
    scopes: readonly string[],
    database: SupporterClaimsDatabase,
    now: Date = new Date(),
): Promise<Record<string, string | boolean>> {
    if (!scopes.includes("supporter")) return {};
    const status = describeBank(await database.supporterStatus.findUnique({ where: { userId } }), now);
    const claims: Record<string, string | boolean> = {
        [supporterClaimNames[0]]: status.badge,
        [supporterClaimNames[1]]: status.active,
    };
    if (status.activeUntil) claims[supporterClaimNames[2]] = status.activeUntil.toISOString();
    return claims;
}
