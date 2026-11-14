import { Github } from "lucide-react";

import { ActionLink, SectionIntro } from "@/components/marketing";
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
    productTitleClass,
    sectionBodyClass,
    sectionHeadingClass,
} from "@/components/product/product-layout";
import { getProduct } from "@/data/site-config";

const currentCapabilities = [
    ["tosu connection", "Connect to an existing tosu instance or launch and stop one owned by Companion."],
    ["Play detection", "Track selected beatmaps and detect passed, failed, retried, and quit attempts."],
    ["Game activity", "View your current osu! activity in the desktop app."],
] as const;

export default function Companion() {
    const product = getProduct("companion");

    return (
        <ProductPage>
            <ProductHero>
                <div className={productHeroCopyClass}>
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <p className={productBodyClass}>
                        Companion is an unfinished local prototype for tracking osu! activity through tosu. It supports local play
                        detection, but you need to build it from source to try it.
                    </p>
                    <ActionLink className="mt-6" href={product.links.primary} external>
                        <Github aria-hidden="true" /> View the source
                    </ActionLink>
                </div>

                <figure className="flex items-center gap-3 text-left md:block md:text-center">
                    <img
                        className="size-10 shrink-0 rounded-[26%] md:mx-auto md:h-auto md:w-[min(70%,240px)]"
                        src="/products/companion-icon.png"
                        alt="Hanami Companion application icon"
                        width="512"
                        height="512"
                    />
                    <figcaption className="text-[0.72rem] leading-[1.55] text-quiet md:mx-auto md:mt-4 md:max-w-[45ch]">
                        No installer is available yet.
                    </figcaption>
                </figure>
            </ProductHero>

            <ProductSection>
                <SectionIntro title="Current features" />
                <div className="grid grid-cols-1 md:grid-cols-3">
                    {currentCapabilities.map(([title, description]) => (
                        <article
                            className="border-t border-border py-4 md:border-t-0 md:border-r md:px-6 md:first:pl-0 md:last:border-r-0"
                            key={title}
                        >
                            <h3 className="text-base tracking-[-0.02em] text-accent-soft">{title}</h3>
                            <p className="mt-[0.35rem] max-w-[62ch] text-[0.9rem] leading-[1.65] text-muted">{description}</p>
                        </article>
                    ))}
                </div>
            </ProductSection>

            <ProductSplit>
                <div>
                    <h2 className={sectionHeadingClass}>Play data stays on your computer.</h2>
                    <p className={sectionBodyClass}>
                        Recent attempts are kept in memory while Companion is running. They are not saved to your Hanami account.
                    </p>
                </div>
                <ProductSteps>
                    <ProductStep>
                        <strong>Local osu! session</strong>
                        <p>tosu reads osu! activity on your computer.</p>
                    </ProductStep>
                    <ProductStep>
                        <strong>Play detection</strong>
                        <p>Companion detects when you start, finish, retry, or quit a play.</p>
                    </ProductStep>
                    <ProductStep>
                        <strong>Desktop display</strong>
                        <p>View the activity from your current session.</p>
                    </ProductStep>
                </ProductSteps>
            </ProductSplit>

            <ProductFootnote>
                <p>You can try Companion by building it from source. It is still under development.</p>
            </ProductFootnote>
        </ProductPage>
    );
}
