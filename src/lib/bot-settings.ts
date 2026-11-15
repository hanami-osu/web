export interface BotSettings {
    mode: "osu" | "mania" | "taiko" | "fruits";
    score_embeds: 0 | 1;
    embed_type: "hanami" | "bathbot" | "owobot";
    // null leaves the choice to Hanami Bot, which picks stable or lazer data per score.
    score_data: 0 | 1 | null;
}

export const defaultSettings: BotSettings = {
    mode: "osu",
    score_embeds: 1,
    embed_type: "hanami",
    score_data: null,
};
