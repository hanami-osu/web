import { routes } from "@/client/routes/paths";
import Footer from "@/components/footer";
import Header from "@/components/header";
import {
    displayClass,
    heroMinHeightClass,
    sectionHeadingClass,
    sectionSpacingClass,
    siteContainerClass,
    sitePageClass,
} from "@/components/layout/styles";
import { ActionLink, TextLink } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { products, siteConfig } from "@/data/site-config";
import { cn } from "@/lib/utils";

const productArtwork = {
    bot: { src: "/hanami.webp", className: "object-cover object-center" },
    osuguessr: { src: "/products/osuguessr-hero.webp", className: "object-cover object-center" },
    companion: { src: "/products/companion-icon.png", className: "object-contain p-8" },
} as const;

export default function Home() {
    return (
        <div className={sitePageClass}>
            <Header />
            <main>
                <section className="relative overflow-hidden border-b border-border">
                    <img
                        className="absolute inset-0 size-full object-cover opacity-45"
                        src="/background.webp"
                        alt=""
                        width="2560"
                        height="1709"
                        fetchPriority="high"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/85 to-bg/40" aria-hidden="true" />
                    <div
                        className={cn(
                            siteContainerClass,
                            heroMinHeightClass,
                            "relative grid items-center gap-10 py-14 md:grid-cols-[1fr_0.65fr] md:py-16",
                        )}
                    >
                        <div className="relative z-10 max-w-170">
                            <h1 className={displayClass}>Hanami</h1>
                            <p className="mt-4 max-w-[48ch] text-sm leading-relaxed text-muted sm:text-base">
                                osu! projects by yorunoken: a Discord bot, a beatmap guessing game, and a desktop app in development.
                            </p>
                            <div className="mt-6 flex flex-wrap gap-3 max-xs:flex-col">
                                <ActionLink href={siteConfig.links.community} external>
                                    Discord server
                                </ActionLink>
                                <ActionLink href={siteConfig.links.organization} variant="secondary" external>
                                    GitHub
                                </ActionLink>
                            </div>
                        </div>
                        <img
                            className="mx-auto hidden w-full max-w-75 md:block"
                            src="/hanami-transparent.png"
                            alt=""
                            width="565"
                            height="542"
                        />
                    </div>
                </section>

                <section className={cn(siteContainerClass, sectionSpacingClass)} id="projects" aria-labelledby="projects-title">
                    <header className="mb-5">
                        <h2 className={sectionHeadingClass} id="projects-title">
                            Projects
                        </h2>
                    </header>
                    <div className="grid gap-6 md:grid-cols-3 md:gap-5">
                        {products.map((product) => (
                            <PrefetchLink
                                className="group flex flex-col rounded-lg no-underline focus-visible:outline-offset-4"
                                key={product.key}
                                href={product.route}
                                prefetch="intent-and-viewport"
                            >
                                <div className="aspect-video overflow-hidden rounded-lg border border-border bg-surface">
                                    <img
                                        className={cn("size-full", productArtwork[product.key].className)}
                                        src={productArtwork[product.key].src}
                                        alt=""
                                        loading="lazy"
                                    />
                                </div>
                                <h3 className="mt-3 text-base font-semibold tracking-tight text-text transition-colors group-hover:text-accent-soft">
                                    {product.name}
                                </h3>
                                <p className="mt-1 text-sm leading-relaxed text-muted">{product.description}</p>
                                <p className="mt-2 text-xs text-muted">
                                    {product.category}
                                    {product.key === "companion" && " · In development"}
                                </p>
                            </PrefetchLink>
                        ))}
                    </div>
                </section>

                <section className={cn(siteContainerClass, "pb-10")}>
                    <div className="grid overflow-hidden rounded-lg border border-border bg-surface/35 md:grid-cols-2">
                        <div className="border-b border-border p-5 md:border-r md:border-b-0">
                            <h2 className={sectionHeadingClass}>Open source</h2>
                            <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted">
                                Read the code, report a bug, or contribute to the projects on GitHub.
                            </p>
                            <TextLink className="mt-2" href={siteConfig.links.organization} external>
                                Browse repositories
                            </TextLink>
                        </div>
                        <div className="p-5" id="support">
                            <h2 className={sectionHeadingClass}>Support Hanami</h2>
                            <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted">
                                $3 a month or a one-time amount covers hosting and development, and you keep the supporter badge.
                            </p>
                            <TextLink className="mt-2" href={routes.supporter}>
                                Become a supporter
                            </TextLink>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
