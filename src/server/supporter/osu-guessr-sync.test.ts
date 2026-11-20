import { describe, expect, it, mock } from "bun:test";

import { createOsuGuessrSupporterSync } from "./osu-guessr-sync";

const config = { url: "http://guessr.test/api/internal/supporter", secret: "s".repeat(32) };

describe("osu!guessr supporter sync", () => {
    it("pushes the status for the account's osu! ID", async () => {
        const fetchMock = mock(async () => new Response("{}", { status: 200 }));
        const sync = createOsuGuessrSupporterSync({
            findOsuId: async () => "12643934",
            getConfig: () => config,
            fetch: fetchMock as never,
        });

        await sync("user-1");

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
        expect(url).toBe(config.url);
        expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${config.secret}`);
        expect(JSON.parse(init.body as string)).toEqual({
            banchoId: 12643934,
            badge: true,
        });
    });

    it("does nothing without an osu! profile or configuration", async () => {
        const fetchMock = mock(async () => new Response("{}"));
        await createOsuGuessrSupporterSync({ findOsuId: async () => null, getConfig: () => config, fetch: fetchMock as never })("u");
        await createOsuGuessrSupporterSync({ findOsuId: async () => "1", getConfig: () => null, fetch: fetchMock as never })("u");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("reports a failed push", async () => {
        const sync = createOsuGuessrSupporterSync({
            findOsuId: async () => "1",
            getConfig: () => config,
            fetch: (async () => new Response("{}", { status: 503 })) as never,
        });
        await expect(sync("u")).rejects.toThrow("503");
    });
});
