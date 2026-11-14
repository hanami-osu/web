import { describe, expect, it } from "bun:test";

import { GET, POST } from "./route";

describe("App Router API adapter", () => {
    it("returns a non-indexable JSON 404 for unknown API routes", async () => {
        const response = await GET(new Request("http://localhost/api/does-not-exist"));

        expect(response.status).toBe(404);
        expect(response.headers.get("content-type")).toContain("application/json");
        expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
        expect(await response.json()).toEqual({ error: "Not Found" });
    });

    it("keeps Better Auth's unguarded unlink endpoint disabled", async () => {
        const response = await POST(
            new Request("http://localhost/api/auth/unlink-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accountId: "account-1" }),
            }),
        );

        expect(response.status).toBe(404);
    });

    it("returns a non-cacheable health response", async () => {
        const response = await GET(new Request("http://localhost/api/health"));

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: "ok" });
        expect(response.headers.get("cache-control")).toBe("no-store");
    });
});
