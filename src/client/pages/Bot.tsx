import { Bot as BotIcon, Github, Link2, SlidersHorizontal } from "lucide-react";

import { ActionLink, Eyebrow, SectionIntro, TextLink } from "@/components/marketing";
import {
    HeroActions,
    ProductFootnote,
    ProductHero,
    ProductPage,
    ProductSection,
    ProductSplit,
    ProductStep,
    ProductSteps,
    productBodyClass,
    productHeroCopyClass,
    productSubtitleClass,
    productTitleClass,
    sectionBodyClass,
    sectionHeadingClass,
} from "@/components/product/product-layout";
import { getProduct } from "@/data/site-config";
import { revealUpLate } from "@/lib/motion";
import { cn } from "@/lib/utils";

const commands = [
    ["/profile", "Player profiles", "Rank, accuracy, play count, country, and account details."],
    ["/recent", "Recent plays", "The latest score with mods, combo, hit results, and performance data."],
    ["/top", "Top scores", "Best plays for a linked user or an osu! username."],
    ["/beatmap", "Beatmap details", "Difficulty, BPM, length, object counts, estimates, and map links."],
    ["/compare", "Score comparison", "Compare a player on a beatmap already shared in the conversation."],
    ["/whatif", "Performance scenarios", "Explore performance-point requirements for different score outcomes."],
] as const;

export default function Bot() {
    const product = getProduct("bot");

    return (
        <ProductPage>
            <ProductHero tone="rose">
                <div className={productHeroCopyClass}>
                    <Eyebrow>Discord bot</Eyebrow>
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <p className={productSubtitleClass}>Your osu! scores, right in Discord.</p>
                    <p className={productBodyClass}>
                        Look up players, scores, and beatmaps inside Discord. Link an osu! account once to use your own profile as the
                        default in supported commands.
                    </p>
                    <HeroActions>
                        <ActionLink href={product.links.primary} external>
                            <BotIcon aria-hidden="true" /> Add to Discord
                        </ActionLink>
                        <ActionLink href={product.links.source} variant="secondary" external>
                            <Github aria-hidden="true" /> Source
                        </ActionLink>
                    </HeroActions>
                </div>
                <figure className={cn("hidden text-center md:block", revealUpLate)}>
                    <img
                        className="mx-auto w-[min(100%,340px)]"
                        src="/hanami-transparent.png"
                        alt="Hanami mascot"
                        width="565"
                        height="542"
                    />
                </figure>
            </ProductHero>

            <ProductSection aria-labelledby="bot-commands-title">
                <SectionIntro
                    eyebrow="Commands"
                    title="Player, score, and beatmap commands"
                    body="Use these commands in your Discord server."
                />
                <div className="grid gap-x-10 md:grid-cols-2" id="bot-commands-title">
                    {commands.map(([command, title, description]) => (
                        <article
                            className="grid grid-cols-[6rem_1fr] items-start gap-4 border-t border-border py-5 max-xs:grid-cols-1 max-xs:gap-2"
                            key={command}
                        >
                            <code className="font-mono text-[0.86rem] text-accent-soft">{command}</code>
                            <div>
                                <h3 className="text-base tracking-[-0.02em]">{title}</h3>
                                <p className="mt-[0.35rem] max-w-[62ch] text-[0.9rem] leading-[1.65] text-muted">{description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </ProductSection>

            <ProductSplit>
                <div>
                    <Eyebrow>Optional account link</Eyebrow>
                    <h2 className={sectionHeadingClass}>Link your osu! account</h2>
                    <p className={sectionBodyClass}>
                        Run <code>/link</code> in your Discord server for a private, one-time link, or sign in with Discord and connect your
                        osu! account from your Hanami Web profile. You can also change the bot’s display settings there.
                    </p>
                    <TextLink className="mt-[1.8rem]" href="/profile">
                        Open account settings
                    </TextLink>
                </div>
                <ProductSteps>
                    <ProductStep icon={<Link2 aria-hidden="true" />}>
                        <strong>Connect</strong>
                        <p>
                            Link from Discord with <code>/link</code> or connect your osu! account in your web profile.
                        </p>
                    </ProductStep>
                    <ProductStep icon={<SlidersHorizontal aria-hidden="true" />}>
                        <strong>Choose defaults</strong>
                        <p>Set game mode, score source, embed size, and embed style.</p>
                    </ProductStep>
                    <ProductStep icon={<BotIcon aria-hidden="true" />}>
                        <strong>Use commands</strong>
                        <p>Player commands use your linked osu! account by default.</p>
                    </ProductStep>
                </ProductSteps>
            </ProductSplit>

            <ProductFootnote>
                <p>
                    <strong>Privacy note:</strong> unlinking osu! removes the ID link; it does not delete the web account, bot settings, or
                    other service data.
                </p>
                <TextLink href="/legal/data-deletion">Account deletion details</TextLink>
            </ProductFootnote>
        </ProductPage>
    );
}
