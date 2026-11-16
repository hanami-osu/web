import { Github } from "lucide-react";

import { ActionLink } from "@/components/marketing";
import {
    ProductFootnote,
    ProductHero,
    ProductPage,
    productBodyClass,
    productHeroCopyClass,
    productTitleClass,
} from "@/components/product/product-layout";
import { getProduct } from "@/data/site-config";

export default function Companion() {
    const product = getProduct("companion");

    return (
        <ProductPage>
            <ProductHero>
                <div className={productHeroCopyClass}>
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <p className={productBodyClass}>
                        Companion is a desktop app that will bring your osu! activity into Hanami. It is being rebuilt from scratch, and
                        there is nothing to install or try yet.
                    </p>
                    <ActionLink className="mt-6" href={product.links.primary} external>
                        <Github aria-hidden="true" /> Follow development
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
                        No release is available yet.
                    </figcaption>
                </figure>
            </ProductHero>

            <ProductFootnote>
                <p>Features will be listed here once they ship.</p>
            </ProductFootnote>
        </ProductPage>
    );
}
