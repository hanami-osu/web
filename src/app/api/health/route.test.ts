import { describe, expect, it } from "bun:test";

import { GET } from "./route";

describe("health route", () => {
    it("returns a non-cacheable health response", async () => {
        const response = await GET();

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ status: "ok" });
        expect(response.headers.get("cache-control")).toBe("no-store");
    });
});
