import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import Companion from "./Companion";

describe("published product claims", () => {
    it("describes Companion as an unfinished local-only prototype", () => {
        const html = render(Companion);

        expect(html).toContain("unfinished local prototype");
        expect(html).toContain("local play detection");
        expect(html).not.toContain("authentication");
        expect(html).not.toContain("Authorization Code");
        expect(html).not.toContain("PKCE");
        expect(html).not.toContain("upload");
    });
});

function render(Component: () => React.JSX.Element): string {
    return renderToStaticMarkup(
        <MemoryRouter>
            <Component />
        </MemoryRouter>,
    );
}
