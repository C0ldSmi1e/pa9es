import nextConfig from "eslint-config-next";
import tseslint from "typescript-eslint";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";

const eslintConfig = [
  {
    ignores: ["public/monaco/**", "public/monaco-vim/**"],
  },
  ...nextConfig,
  eslintPluginPrettier,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      indent: "off",
      "linebreak-style": ["error", "unix"],
      quotes: "off",
      semi: "off",
      "no-console": 0,
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
];

export default eslintConfig;
