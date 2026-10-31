import { describe, expect, it } from "bun:test";

import app from "./index";

describe("Legacy legal URLs", () => {
    it("redirects old privacy URLs to the legal center", async () => {
        const response = await app.handle(new Request("http://localhost/privacy?source=footer"));
        expect(response.status).toBe(308);
        expect(response.headers.get("location")).toBe("http://localhost/legal/privacy?source=footer");
    });

    it("redirects old terms URLs to the legal center", async () => {
        const response = await app.handle(new Request("http://localhost/terms-of-service"));
        expect(response.status).toBe(308);
        expect(response.headers.get("location")).toBe("http://localhost/legal/terms");
    });
});

describe("Canonical route redirects", () => {
    it("redirects index.html and trailing-slash duplicates", async () => {
        const indexResponse = await app.handle(new Request("http://localhost/index.html?source=old"));
        expect(indexResponse.status).toBe(308);
        expect(indexResponse.headers.get("location")).toBe("http://localhost/?source=old");

        const trailingSlashResponse = await app.handle(new Request("http://localhost/bot/?source=old"));
        expect(trailingSlashResponse.status).toBe(308);
        expect(trailingSlashResponse.headers.get("location")).toBe("http://localhost/bot?source=old");
    });
});

describe("Unknown API routes", () => {
    it("returns a non-indexable JSON 404 instead of the application shell", async () => {
        const response = await app.handle(new Request("http://localhost/api/does-not-exist"));

        expect(response.status).toBe(404);
        expect(response.headers.get("content-type")).toContain("application/json");
        expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
        expect(await response.json()).toEqual({ error: "Not Found" });
    });

    it("does not expose Better Auth's unguarded unlink endpoint", async () => {
        const response = await app.handle(
            new Request("http://localhost/api/auth/unlink-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId: "account-1" }),
            }),
        );

        expect(response.status).toBe(404);
    });
});

describe("Health and security headers", () => {
    it("returns a non-cacheable liveness response with baseline security headers", async () => {
        const response = await app.handle(new Request("http://localhost/api/health"));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: "ok" });
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(response.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
        expect(response.headers.get("x-content-type-options")).toBe("nosniff");
        expect(response.headers.get("x-frame-options")).toBe("DENY");
        expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    });
});
