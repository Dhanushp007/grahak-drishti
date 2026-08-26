import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import react from "eslint-plugin-react";

export default defineConfig([
  globalIgnores([".next/**", "out/**", "build/**"]),
  js.configs.recommended,
  {
    files: ["app/**/*.js", "lib/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { document: "readonly", fetch: "readonly", window: "readonly" },
    },
    plugins: { react },
    settings: { react: { version: "detect" } },
    rules: {
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
    },
  },
  {
    files: ["*.config.mjs", "next.config.mjs", "postcss.config.mjs"],
    languageOptions: { globals: { process: "readonly" } },
  },
]);