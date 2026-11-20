import { Github } from "lucide-react";

import { ActionLink, SectionIntro, TextLink } from "@/components/marketing";
import {
    HeroActions,
    ProductFootnote,
    ProductHero,
    ProductPage,
    ProductSection,
    productBodyClass,
    productHeroCopyClass,
    productTitleClass,
    sectionBodyClass,
    sectionHeadingClass,
} from "@/components/product/product-layout";
import { getProduct } from "@/data/site-config";

const commands = [
    ["/profile", "Player profiles", "Rank, accuracy, play count, country, and account details."],
    ["/recent", "Recent plays", "The latest score with mods, combo, hit results, and performance data."],
    ["/top", "Top scores", "Best plays for a linked user or an osu! username."],
    ["/beatmap", "Beatmap details", "Difficulty, BPM, length, object counts, estimates, and map links."],
    ["/compare", "Score comparison", "Compare a player on a beatmap already shared in the conversation."],
    ["/whatif", "What-if rank", "See the pp and rank you would reach with hypothetical plays."],
] as const;

export default function Bot() {
    const product = getProduct("bot");

    return (
        <ProductPage>
            <ProductHero>
                <div className={productHeroCopyClass}>
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <p className={productBodyClass}>Look up osu! players, scores, and beatmaps in Discord.</p>
                    <HeroActions>
                        <ActionLink href={product.links.primary} external>
                            Add to Discord
                        </ActionLink>
                        <ActionLink href={product.links.source} variant="secondary" external>
                            <Github aria-hidden="true" /> Source
                        </ActionLink>
                    </HeroActions>
                </div>
                <figure className="hidden text-center md:block">
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
                <SectionIntro title="Commands" />
                <div className="grid gap-x-6 md:grid-cols-2" id="bot-commands-title">
                    {commands.map(([command, title, description]) => (
                        <article
                            className="grid grid-cols-[6rem_1fr] items-start gap-4 border-t border-border py-4 max-xs:grid-cols-1 max-xs:gap-2"
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

            <ProductSection>
                <h2 className={sectionHeadingClass}>Link your osu! account</h2>
                <p className={sectionBodyClass}>
                    Run <code>/link</code> in Discord or link osu! from your Hanami profile. Player commands will use your account by
                    default. You can change your game mode, score source, and embed settings in your profile.
                </p>
                <TextLink className="mt-3" href="/profile">
                    Open account settings
                </TextLink>
            </ProductSection>

            <ProductFootnote>
                <p>Unlinking osu! keeps your Hanami account and bot settings.</p>
                <TextLink href="/legal/data-deletion">Account deletion details</TextLink>
            </ProductFootnote>
        </ProductPage>
    );
}
