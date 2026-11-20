import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SupporterPanel } from "./support-platforms";
import type { SupporterOverview } from "@/client/lib/supporter";

const noop = () => {};

function render(overview: SupporterOverview, extra: Partial<Parameters<typeof SupporterPanel>[0]> = {}) {
    return renderToStaticMarkup(
        <SupporterPanel
            signedIn
            loading={false}
            overview={overview}
            busy={null}
            claim={null}
            message={null}
            onLink={noop}
            onUnlink={noop}
            onCreateClaimCode={noop}
            {...extra}
        />,
    );
}

const none: SupporterOverview = {
    status: { badge: false, active: false, membershipActive: false, activeUntil: null, bankedDays: 0 },
    links: [],
};

describe("supporter panel", () => {
    it("offers every platform to someone who has not supported yet", () => {
        const markup = render(none);
        expect(markup).toContain('id="supporter"');
        expect(markup).toContain("Not a supporter yet");
        expect(markup).toContain("Link GitHub");
        expect(markup).toContain("Get a claim code");
    });

    it("shows linked accounts with an unlink control", () => {
        const markup = render({
            status: { badge: true, active: true, membershipActive: true, activeUntil: null, bankedDays: 20 },
            links: [{ provider: "github", displayName: "Yoru", linkedAt: "2026-11-17T00:00:00.000Z" }],
        });
        expect(markup).toContain("Linked as Yoru");
        expect(markup).toContain("Unlink");
        expect(markup).not.toContain("Link GitHub");
        expect(markup).toContain("20 donated days are saved for after your membership");
    });

    it("shows when donated time runs out", () => {
        const markup = render({
            status: { badge: true, active: true, membershipActive: false, activeUntil: "2026-12-17T00:00:00.000Z", bankedDays: 30 },
            links: [],
        });
        expect(markup).toContain("Active supporter until");
    });

    it("keeps the badge message after support ends", () => {
        const markup = render({ ...none, status: { ...none.status, badge: true } });
        expect(markup).toContain("You have the supporter badge");
    });

    it("shows a claim code with instructions", () => {
        const markup = render(none, { claim: { code: "HANAMI-ABCD2345", expiresAt: "2026-11-24T00:00:00.000Z" } });
        expect(markup).toContain("HANAMI-ABCD2345");
        expect(markup).toContain("Paste this code into the message");
        expect(markup).toContain("New claim code");
    });
});
