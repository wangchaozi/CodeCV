// @ts-check
import eslint from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist"],
  },
  eslint.configs.recommended,
  // 使用带类型检查的推荐配置
  ...tseslint.configs.recommendedTypeChecked,
  reactRefresh.configs.vite,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
      },
      parserOptions: {
        // 关键配置：明确 tsconfigRootDir，避免多 tsconfig 根目录报错
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
