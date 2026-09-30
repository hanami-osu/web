import { Github } from "lucide-react";

import { ActionLink, Eyebrow, SectionIntro, TextLink } from "@/components/marketing";
import {
    HeroActions,
    ProductFootnote,
    ProductPage,
    ProductSection,
    ProductSplit,
    productBodyClass,
    productHeroCopyClass,
    productSubtitleClass,
    productTitleClass,
    sectionBodyClass,
    sectionHeadingClass,
} from "@/components/product/product-layout";
import { siteContainerClass } from "@/components/layout/styles";
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
] as const;

export default function OsuGuessr() {
    const product = getProduct("osuguessr");

    return (
        <ProductPage>
            <section className="relative min-h-130 overflow-hidden border-b border-border max-md:min-h-110">
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
                <div className={cn(siteContainerClass, "relative z-20 flex min-h-130 items-center py-12 max-md:min-h-110")}>
                    <div className={cn(productHeroCopyClass, "max-w-175")}>
                        <Eyebrow>Browser game</Eyebrow>
                        <h1 className={productTitleClass}>{product.name}</h1>
                        <p className={productSubtitleClass}>Guess osu! beatmaps from images and audio.</p>
                        <p className={productBodyClass}>
                            Sign in with osu!, choose a mode, and guess from artwork, audio, or a skin screenshot. Compare your scores and
                            streaks on the leaderboards.
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
                <SectionIntro
                    eyebrow="Three ways to play"
                    title="Backgrounds, audio, and skins"
                    body="Choose which kind of clue you want to play with."
                />
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                    {modes.map(({ title, description, image, alt }) => (
                        <article className="overflow-hidden rounded-md border border-border bg-surface" key={title}>
                            <img
                                className="aspect-video w-full object-cover"
                                src={image}
                                alt={alt}
                                width="1920"
                                height="1080"
                                loading="lazy"
                            />
                            <div className="p-5">
                                <h3 className="text-xl font-semibold tracking-[-0.02em]">{title}</h3>
                                <p className="mt-[0.35rem] text-[0.85rem] leading-[1.55] text-muted">{description}</p>
                            </div>
                        </article>
                    ))}
                </div>
            </ProductSection>

            <ProductSplit>
                <div>
                    <Eyebrow>Game variants</Eyebrow>
                    <h2 className={sectionHeadingClass}>Classic and Death mode</h2>
                    <p className={sectionBodyClass}>
                        Classic mode ends after ten rounds. Death mode continues while the guesses are correct. Completed games appear in
                        your history and count toward achievements and rankings.
                    </p>
                </div>
                <dl className="grid gap-7 [&_dd]:text-[0.88rem] [&_dd]:leading-[1.55] [&_dd]:text-muted [&_dt]:text-[0.78rem] [&_dt]:font-medium [&_dt]:text-violet-soft [&>div]:grid [&>div]:grid-cols-[5.5rem_1fr] [&>div]:gap-4 min-xs:[&>div]:grid-cols-[7rem_1fr]">
                    <div>
                        <dt>Classic</dt>
                        <dd>10 rounds with a cumulative score</dd>
                    </div>
                    <div>
                        <dt>Death</dt>
                        <dd>A streak that ends on an incorrect answer</dd>
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
