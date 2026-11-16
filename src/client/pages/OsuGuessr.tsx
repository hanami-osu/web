import { Github } from "lucide-react";

import { ActionLink, SectionIntro, TextLink } from "@/components/marketing";
import {
    HeroActions,
    ProductFootnote,
    ProductPage,
    ProductSection,
    ProductSplit,
    productBodyClass,
    productHeroCopyClass,
    productTitleClass,
    sectionBodyClass,
    sectionHeadingClass,
} from "@/components/product/product-layout";
import { heroMinHeightClass, siteContainerClass } from "@/components/layout/styles";
import { getProduct } from "@/data/site-config";
import { cn } from "@/lib/utils";

const modes = [
    {
        title: "Background",
        description: "Identify a beatmap from its background artwork.",
        image: "/products/osuguessr-ghostrule.webp",
        alt: "Anime-style beatmap background used in osu!guessr",
    },
    {
        title: "Audio",
        description: "Listen to a short clip and name the beatmap.",
        image: "/products/osuguessr-audio.webp",
        alt: "Bright red and cyan beatmap artwork used in osu!guessr",
    },
    {
        title: "Skin",
        description: "Recognize an osu! skin from a screenshot.",
        image: "/products/osuguessr-skin.webp",
        alt: "Blue-toned osu! skin screenshot used in osu!guessr",
    },
    {
        title: "Score pp",
        description: "Compare two real osu! plays and pick the one worth more pp.",
        image: "/products/osuguessr-hero.webp",
        alt: "Beatmap artwork used for osu!guessr's Score pp mode",
    },
] as const;

export default function OsuGuessr() {
    const product = getProduct("osuguessr");

    return (
        <ProductPage>
            <section className="relative overflow-hidden border-b border-border">
                <img
                    className="absolute inset-0 size-full object-cover object-[55%_46%]"
                    src="/products/osuguessr-hero.webp"
                    alt=""
                    width="2048"
                    height="1317"
                    fetchPriority="high"
                />
                <div
                    className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,9,12,0.97)_0%,rgba(10,9,12,0.82)_41%,rgba(10,9,12,0.18)_75%),linear-gradient(0deg,rgba(10,9,12,0.72),transparent_42%)] max-md:bg-bg/80"
                    aria-hidden="true"
                />
                <div className={cn(siteContainerClass, heroMinHeightClass, "relative z-20 flex items-center py-8 md:py-10")}>
                    <div className={cn(productHeroCopyClass, "max-w-175")}>
                        <h1 className={productTitleClass}>{product.name}</h1>
                        <p className={productBodyClass}>
                            Sign in with osu!, choose a mode, and guess from artwork, audio, or a skin screenshot, or pick which of two
                            plays is worth more pp. Play solo or in multiplayer lobbies, and compare your scores and streaks on the
                            leaderboards.
                        </p>
                        <HeroActions>
                            <ActionLink href={product.links.primary} external>
                                Play osu!guessr
                            </ActionLink>
                            <ActionLink href={product.links.source} variant="secondary" external>
                                <Github aria-hidden="true" /> Source
                            </ActionLink>
                        </HeroActions>
                        <p className="mt-[1.2rem] text-[0.7rem] text-muted">
                            Background artwork is sourced with the game’s beatmap catalog.
                        </p>
                    </div>
                </div>
            </section>

            <ProductSection>
                <SectionIntro title="Game modes" />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                    {modes.map(({ title, description, image, alt }) => (
                        <article key={title}>
                            <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-surface">
                                <img
                                    className="size-full object-cover opacity-85"
                                    src={image}
                                    alt={alt}
                                    width="1920"
                                    height="1080"
                                    loading="lazy"
                                />
                            </div>
                            <div className="pt-3">
                                <h3 className="mb-1 text-base font-semibold tracking-tight">{title}</h3>
                                <p className="text-sm leading-relaxed text-muted">{description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </ProductSection>

            <ProductSplit>
                <div>
                    <h2 className={sectionHeadingClass}>Classic, Survival, and Death</h2>
                    <p className={sectionBodyClass}>
                        Classic ends after 15 rounds. Survival continues until all 3 lives are lost, and Death ends at the first mistake.
                        Ranked runs appear in your history and earn pp for the leaderboards.
                    </p>
                </div>
                <dl className="grid gap-7 [&_dd]:text-[0.88rem] [&_dd]:leading-[1.55] [&_dd]:text-muted [&_dt]:text-[0.78rem] [&_dt]:font-medium [&_dt]:text-accent-soft [&>div]:grid [&>div]:grid-cols-[5.5rem_1fr] [&>div]:gap-4 min-xs:[&>div]:grid-cols-[7rem_1fr]">
                    <div>
                        <dt>Classic</dt>
                        <dd>15 rounds with a cumulative score</dd>
                    </div>
                    <div>
                        <dt>Survival</dt>
                        <dd>3 lives; a wrong guess, skip, or timeout costs one</dd>
                    </div>
                    <div>
                        <dt>Death</dt>
                        <dd>1 life; the first mistake ends the run</dd>
                    </div>
                    <div>
                        <dt>Account</dt>
                        <dd>osu! sign-in is required to start a game</dd>
                    </div>
                    <div>
                        <dt>Reporting</dt>
                        <dd>Signed-in players can report catalog problems</dd>
                    </div>
                </dl>
            </ProductSplit>

            <ProductFootnote>
                <p>osu!guessr is a separate hosted service with its own authentication, browser storage, and analytics behavior.</p>
                <TextLink href="/legal/privacy">Read the privacy policy</TextLink>
            </ProductFootnote>
        </ProductPage>
    );
}
