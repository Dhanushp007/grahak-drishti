import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import react from "eslint-plugin-react";

export default defineConfig([
  globalIgnores([".next/**", "out/**", "build/**"]),
  js.configs.recommended,
  {
    files: ["app/**/*.js", "components/**/*.js", "lib/**/*.js", "tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        alert: "readonly",
        atob: "readonly",
        AudioContext: "readonly",
        btoa: "readonly",
        document: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        navigator: "readonly",
        setTimeout: "readonly",
        URLSearchParams: "readonly",
        window: "readonly",
      },
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
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
  {
    files: ["playwright.config.js", "e2e/**/*.js"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        process: "readonly",
      },
    },
  },
]);