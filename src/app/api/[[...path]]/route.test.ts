import { describe, expect, it } from "bun:test";

import { GET } from "./route";

describe("unknown API routes", () => {
    it("returns a non-indexable JSON 404 for unknown API routes", async () => {
        const response = await GET();

        expect(response.status).toBe(404);
        expect(response.headers.get("content-type")).toContain("application/json");
        expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
        expect(await response.json()).toEqual({ error: "Not Found" });
    });
});
