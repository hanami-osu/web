import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["dist/**", ".next/**", "node_modules/**", "src/generated/**"],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.{ts,tsx}", "next.config.ts"],
        rules: {
            "no-undef": "off",
        },
    },
);
