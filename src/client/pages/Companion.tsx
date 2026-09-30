import { Github, HardDrive, MonitorDot, Radio } from "lucide-react";

import { ActionLink, Eyebrow, SectionIntro } from "@/components/marketing";
import {
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

const currentCapabilities = [
    ["tosu connection", "Connect to an existing tosu instance or launch and stop one owned by Companion."],
    ["Play detection", "Track selected beatmaps and detect passed, failed, retried, and quit attempts."],
    ["Game activity", "View your current osu! activity in the desktop app."],
] as const;

export default function Companion() {
    const product = getProduct("companion");

    return (
        <ProductPage>
            <ProductHero tone="cyan">
                <div className={productHeroCopyClass}>
                    <Eyebrow>Desktop prototype</Eyebrow>
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <p className={productSubtitleClass}>Track osu! activity on your desktop.</p>
                    <p className={productBodyClass}>
                        Companion is an unfinished local prototype for tracking osu! activity through tosu. It supports local play
                        detection, but you need to build it from source to try it.
                    </p>
                    <ActionLink className="mt-8" href={product.links.primary} external>
                        <Github aria-hidden="true" /> View the source
                    </ActionLink>
                </div>

                <figure className={cn("text-center", revealUpLate)}>
                    <img
                        className="mx-auto w-[min(70%,240px)] rounded-[26%]"
                        src="/products/companion-icon.png"
                        alt="Hanami Companion application icon"
                        width="512"
                        height="512"
                    />
                    <figcaption className="mx-auto mt-4 max-w-[45ch] text-[0.72rem] leading-[1.55] text-quiet max-xs:text-left">
                        No installer is available yet.
                    </figcaption>
                </figure>
            </ProductHero>

            <ProductSection>
                <SectionIntro
                    eyebrow="Features"
                    title="Current features"
                    body="The prototype can connect to tosu, detect plays, and display your current game activity."
                />
                <div className="grid grid-cols-1 md:grid-cols-3">
                    {currentCapabilities.map(([title, description]) => (
                        <article
                            className="border-t border-border py-5 md:border-t-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0"
                            key={title}
                        >
                            <h3 className="text-base tracking-[-0.02em] text-cyan-soft">{title}</h3>
                            <p className="mt-[0.35rem] max-w-[62ch] text-[0.9rem] leading-[1.65] text-muted">{description}</p>
                        </article>
                    ))}
                </div>
            </ProductSection>

            <ProductSplit>
                <div>
                    <Eyebrow>Local data</Eyebrow>
                    <h2 className={sectionHeadingClass}>Play data stays on your computer.</h2>
                    <p className={sectionBodyClass}>
                        Recent attempts are kept in memory while Companion is running. They are not saved to your Hanami account.
                    </p>
                </div>
                <ProductSteps className="[&_svg]:text-cyan">
                    <ProductStep icon={<HardDrive aria-hidden="true" />}>
                        <strong>Local osu! session</strong>
                        <p>tosu reads osu! activity on your computer.</p>
                    </ProductStep>
                    <ProductStep icon={<Radio aria-hidden="true" />}>
                        <strong>Play detection</strong>
                        <p>Companion detects when you start, finish, retry, or quit a play.</p>
                    </ProductStep>
                    <ProductStep icon={<MonitorDot aria-hidden="true" />}>
                        <strong>Desktop display</strong>
                        <p>View the activity from your current session.</p>
                    </ProductStep>
                </ProductSteps>
            </ProductSplit>

            <ProductFootnote className="[&>svg]:text-cyan">
                <MonitorDot aria-hidden="true" />
                <p>You can try Companion by building it from source. It is still under development.</p>
            </ProductFootnote>
        </ProductPage>
    );
}
