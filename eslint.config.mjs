import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Global ignores (Flat config)
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "Web3 Copilot UI_UX Guide/**",
      "setup.js",
    ],
  },
  // Next.js + TypeScript recommended rules
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // General project rules for TS/JS
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
  // Allow CommonJS in Node scripts, Hardhat config, and tests
  {
    files: [
      "scripts/**/*.js",
      "scripts/**/*.ts",
      "hardhat.config.js",
      "test/**/*.js",
      "test/**/*.ts",
    ],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
];

export default eslintConfig;
