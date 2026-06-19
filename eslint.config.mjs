import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "node_modules/**",
    "coverage/**",
    ".vercel/**",
    "next-env.d.ts",
  ]),

  {
    rules: {
      "no-console": "warn",
      "no-debugger": "error",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-implicit-coercion": "error",
    },
  },
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["../../modules/*/internal/*", "../modules/*/internal/*"],
        },
      ],
    },
  },
]);
