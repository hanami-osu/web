import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { routes } from "@/client/routes/paths";
import { PrefetchLink } from "@/components/navigation/prefetch-link";

describe("PrefetchLink", () => {
    it("keeps internal links as normal anchors without leaking prefetch attributes", () => {
        const markup = renderToStaticMarkup(
            <PrefetchLink className="test-link" aria-label="Bot route" href={routes.bot} prefetch="intent">
                Bot
            </PrefetchLink>,
        );

        expect(markup).toContain('<a class="test-link" aria-label="Bot route" href="/bot"');
        expect(markup).toContain("Bot</a>");
        expect(markup).not.toContain("prefetch=");
    });
});
