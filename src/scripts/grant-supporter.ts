import { webPrisma } from "../server/database/web";
import { daysForUsdCents } from "../server/supporter/domain";
import { createSupporterStore } from "../server/supporter/osu-guessr-sync";

const usage = `Grants supporter time or the badge by hand (past donors, contributors).

  bun run supporter:grant -- --osu <osu user id> --usd <amount>    $1 = 10 days, plus the badge
  bun run supporter:grant -- --osu <osu user id> --badge-only      badge only (contributors)

Use --user <Hanami user id> instead of --osu to pick the account directly.`;

export function parseGrantArguments(args: readonly string[]): { osuId: string | null; userId: string | null; amountCents: number } | null {
    const value = (flag: string) => {
        const index = args.indexOf(flag);
        return index >= 0 ? (args[index + 1] ?? null) : null;
    };
    const osuId = value("--osu");
    const userId = value("--user");
    if ((osuId === null) === (userId === null)) return null;

    if (args.includes("--badge-only")) return args.includes("--usd") ? null : { osuId, userId, amountCents: 0 };
    const usd = Number(value("--usd"));
    if (!Number.isFinite(usd) || usd <= 0) return null;
    return { osuId, userId, amountCents: Math.round(usd * 100) };
}

async function grantSupporter(args: readonly string[]): Promise<void> {
    const parsed = parseGrantArguments(args);
    if (!parsed) throw new Error(usage);

    const userId =
        parsed.userId ??
        (await webPrisma.osuProfile.findUnique({ where: { osuId: parsed.osuId! }, select: { userId: true } }))?.userId ??
        null;
    if (!userId || !(await webPrisma.user.findUnique({ where: { id: userId }, select: { id: true } }))) {
        throw new Error("No Hanami account matches that ID. The person has to sign in to Hanami once first.");
    }

    const now = new Date();
    const days = daysForUsdCents(parsed.amountCents);
    const store = createSupporterStore(webPrisma);
    await store.grant({ userId, amountCents: parsed.amountCents, days, now });
    const status = await store.getStatus(userId, now);
    console.log(
        days > 0
            ? `Granted ${days} days to ${userId}.${status.activeUntil ? ` Active until ${status.activeUntil.toISOString()}.` : ""}`
            : `Granted the supporter badge to ${userId}.`,
    );
}

if (import.meta.url === `file://${process.argv[1]}`) {
    try {
        await grantSupporter(process.argv.slice(2));
    } catch (error) {
        console.error(error instanceof Error ? error.message : "Failed to grant supporter status.");
        process.exitCode = 1;
    } finally {
        await webPrisma.$disconnect();
    }
}
