import { ArrowRight } from "lucide-react";

import Footer from "@/components/footer";
import Header from "@/components/header";
import { displayClass, sectionHeadingClass, sectionSpacingClass, siteContainerClass, sitePageClass } from "@/components/layout/styles";
import { ActionLink, Eyebrow, TextLink } from "@/components/marketing";
import { PrefetchLink } from "@/components/navigation/prefetch-link";
import { primaryActionClass, secondaryActionClass } from "@/components/ui/action-styles";
import { products, siteConfig } from "@/data/site-config";
import { cn } from "@/lib/utils";

export default function Home() {
    return (
        <div className={sitePageClass}>
            <Header />
            <main>
                <section className="relative overflow-hidden border-b border-border">
                    <img
                        className="absolute inset-0 size-full object-cover opacity-40"
                        src="/background.webp"
                        alt=""
                        width="2560"
                        height="1709"
                        fetchPriority="high"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/65 to-bg/25" aria-hidden="true" />
                    <div
                        className={cn(
                            siteContainerClass,
                            "relative grid items-center gap-10 py-14 md:min-h-120 md:grid-cols-[1fr_0.65fr] md:py-16",
                        )}
                    >
                        <div className="max-w-170">
                            <h1 className={displayClass}>More ways to enjoy osu!</h1>
                            <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted">
                                Look up scores in Discord, test your beatmap knowledge, or explore our desktop app. Find the Hanami project
                                for you.
                            </p>
                            <div className="mt-7 flex flex-wrap gap-3 max-xs:flex-col">
                                <ActionLink href="#projects">Explore projects</ActionLink>
                                <ActionLink href={siteConfig.links.community} variant="secondary" external>
                                    Join the community
                                </ActionLink>
                            </div>
                        </div>
                        <img
                            className="mx-auto hidden w-full max-w-85 md:block"
                            src="/hanami-transparent.png"
                            alt=""
                            width="565"
                            height="542"
                        />
                    </div>
                </section>

                <section className={cn(siteContainerClass, sectionSpacingClass)} id="projects" aria-labelledby="projects-title">
                    <header className="mb-8">
                        <h2 className={sectionHeadingClass} id="projects-title">
                            Choose a project
                        </h2>
                        <p className="mt-3 text-base leading-relaxed text-muted">Each project has its own place to play or get started.</p>
                    </header>
                    <div className="grid gap-4 md:grid-cols-3">
                        {products.map((product) => (
                            <PrefetchLink
                                className="group flex flex-col rounded-md border border-border bg-surface p-6 no-underline transition-colors duration-150 hover:border-border-strong focus-visible:outline-offset-4"
                                key={product.key}
                                to={product.route}
                                prefetch="intent-and-viewport"
                            >
                                <p className="text-sm text-accent-soft">
                                    {product.category}
                                    {product.key === "companion" && " · In development"}
                                </p>
                                <h3 className="mt-3 text-2xl font-semibold tracking-[-0.02em] text-white">{product.name}</h3>
                                <p className="mt-3 mb-6 text-[0.95rem] leading-relaxed text-muted">{product.description}</p>
                                <span
                                    className={cn(primaryActionClass, secondaryActionClass, "mt-auto w-full group-hover:border-white/40")}
                                >
                                    <span>{product.action}</span>
                                    <ArrowRight
                                        aria-hidden="true"
                                        className="transition-transform duration-150 group-hover:translate-x-0.5"
                                    />
                                </span>
                            </PrefetchLink>
                        ))}
                    </div>
                </section>

                <section className="border-t border-border bg-surface/50">
                    <div className={cn(siteContainerClass, sectionSpacingClass, "grid gap-10 md:grid-cols-2 md:gap-16")}>
                        <div>
                            <Eyebrow>Open source</Eyebrow>
                            <h2 className={sectionHeadingClass}>Built in the open</h2>
                            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-muted">
                                Read the code, report a bug, or contribute to the projects on GitHub.
                            </p>
                            <TextLink className="mt-5" href={siteConfig.links.organization} external>
                                Browse repositories
                            </TextLink>
                        </div>
                        <div>
                            <Eyebrow>Support the project</Eyebrow>
                            <h2 className={sectionHeadingClass}>Support Hanami</h2>
                            <p className="mt-3 max-w-[52ch] text-base leading-relaxed text-muted">
                                Enjoy using Hanami? Contributions through GitHub Sponsors help cover hosting and maintenance.
                            </p>
                            <TextLink className="mt-5" href={siteConfig.links.support} external>
                                Sponsor on GitHub
                            </TextLink>
                        </div>
                    </div>
                </section>
            </main>
            <Footer />
        </div>
    );
}
