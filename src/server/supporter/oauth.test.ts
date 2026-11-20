import { describe, expect, it } from "bun:test";

import { fetchLinkedAccount } from "./oauth";

const config = { clientId: "test-client", clientSecret: "test-secret", redirectUri: "https://hanami.example.test/callback" };

describe("supporter provider lookups", () => {
    it("reads an existing GitHub sponsorship when the account is linked", async () => {
        const request = async (url: string) =>
            Response.json(
                url.includes("access_token")
                    ? { access_token: "test-token" }
                    : url.endsWith("/user")
                      ? { id: 42, login: "existing-sponsor" }
                      : {
                            data: {
                                repositoryOwner: {
                                    sponsorshipForViewerAsSponsor: { id: "S_123", isActive: true, isOneTimePayment: false },
                                },
                            },
                        },
            );
        expect(await fetchLinkedAccount("github", config, "test-code", { fetch: request })).toMatchObject({
            providerUserId: "42",
            displayName: "existing-sponsor",
            membershipActive: true,
        });
    });

    it("returns an existing GitHub one-time payment using the webhook's payment identity", async () => {
        const request = async (url: string) =>
            Response.json(
                url.includes("access_token")
                    ? { access_token: "test-token" }
                    : url.endsWith("/user")
                      ? { id: 42, login: "donor" }
                      : {
                            data: {
                                repositoryOwner: {
                                    sponsorshipForViewerAsSponsor: {
                                        id: "S_123",
                                        isActive: false,
                                        isOneTimePayment: true,
                                        createdAt: "2026-11-17T10:00:00Z",
                                        tier: { monthlyPriceInCents: 1500 },
                                    },
                                },
                            },
                        },
            );
        expect(await fetchLinkedAccount("github", config, "test-code", { fetch: request })).toMatchObject({
            membershipActive: false,
            hasSupported: true,
            payment: { externalId: "S_123:2026-11-17T10:00:00.000Z", amountCents: 1500, receivedAt: new Date("2026-11-17T10:00:00Z") },
        });
    });

    it("distinguishes an absent GitHub sponsorship from a failed lookup", async () => {
        for (const failed of [false, true]) {
            const request = async (url: string) =>
                Response.json(
                    url.includes("access_token")
                        ? { access_token: "test-token" }
                        : url.endsWith("/user")
                          ? { id: 42, login: "user" }
                          : failed
                            ? { errors: [{ message: "Forbidden" }] }
                            : { data: { repositoryOwner: { sponsorshipForViewerAsSponsor: null } } },
                );
            const account = fetchLinkedAccount("github", config, "test-code", { fetch: request });
            if (failed) await expect(account).rejects.toThrow("GitHub sponsorship request failed");
            else expect(await account).toMatchObject({ membershipActive: false, hasSupported: false });
        }
    });
});
