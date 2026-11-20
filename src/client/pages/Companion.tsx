import { Github } from "lucide-react";

import { ActionLink } from "@/components/marketing";
import { ProductHero, ProductPage, productBodyClass, productHeroCopyClass, productTitleClass } from "@/components/product/product-layout";
import { getProduct } from "@/data/site-config";

export default function Companion() {
    const product = getProduct("companion");

    return (
        <ProductPage>
            <ProductHero>
                <div className={productHeroCopyClass}>
                    <h1 className={productTitleClass}>{product.name}</h1>
                    <p className={productBodyClass}>
                        Hanami’s desktop app for osu! is being rebuilt from scratch. There’s nothing to install or try yet.
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
                </figure>
            </ProductHero>
        </ProductPage>
    );
}
