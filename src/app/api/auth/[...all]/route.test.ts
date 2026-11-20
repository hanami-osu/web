import { describe, expect, it } from "bun:test";

import { POST } from "./route";

describe("authentication route", () => {
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
});
