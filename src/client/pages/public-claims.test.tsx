import { describe, expect, it, mock } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

mock.module("next/navigation", () => ({
    usePathname: () => "/companion",
    useRouter: () => ({ push() {}, replace() {}, prefetch() {} }),
}));

const { default: Companion } = await import("./Companion");

describe("published product claims", () => {
    it("describes Companion as unreleased without claiming unshipped features", () => {
        const html = render(Companion);

        expect(html).toContain("being rebuilt from scratch");
        expect(html).toContain("nothing to install or try yet");
        expect(html).not.toContain("tosu");
        expect(html).not.toContain("authentication");
        expect(html).not.toContain("Authorization Code");
        expect(html).not.toContain("PKCE");
        expect(html).not.toContain("upload");
    });
});

function render(Component: () => React.JSX.Element): string {
    return renderToStaticMarkup(<Component />);
}
