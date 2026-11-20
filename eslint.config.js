import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import { catalogueBoundaries } from "./scripts/catalogue-boundaries.js";

const typescript = ["**/*.{ts,tsx}"];
const web = ["apps/web/**/*.{js,ts,tsx}"];
const restrictedFetchMembers = [
  {
    selector:
      "MemberExpression[property.name='fetch'], MemberExpression[property.value='fetch']",
    message:
      "Use the product adapter or the shared web HTTP client for requests.",
  },
];
const restrictedWebSyntax = [
  {
    selector:
      "Literal[value=/fakestoreapi/i], TemplateElement[value.raw=/fakestoreapi/i]",
    message:
      "The browser must send all catalogue requests through our backend.",
  },
  {
    selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
    message: "Render user and upstream content as text.",
  },
];

export default tseslint.config(
  { ignores: ["**/dist/**", "**/coverage/**"] },
  js.configs.recommended,
  {
    files: typescript,
    extends: [tseslint.configs.recommendedTypeChecked],
    languageOptions: { parserOptions: { projectService: true } },
    plugins: { catalogue: { rules: { boundaries: catalogueBoundaries } } },
    rules: {
      "catalogue/boundaries": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
    },
  },
  {
    rules: {
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",
    },
  },
  {
    files: ["**/*.{js,ts,tsx}"],
    ignores: [
      "apps/api/src/adapters/**",
      "apps/api/scripts/**",
      "apps/web/src/shared/api/http.ts",
    ],
    rules: {
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message: "Use the product adapter or the shared web HTTP client.",
        },
      ],
      "no-restricted-syntax": ["error", ...restrictedFetchMembers],
    },
  },
  {
    files: ["apps/api/src/{domain,ports,services}/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["koa", "nodemailer"],
          patterns: ["@koa/*", "**/adapters/**", "**/http/**"],
        },
      ],
    },
  },
  {
    files: [
      "apps/web/src/features/*/components/**",
      "apps/web/src/shared/ui/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: ["@tanstack/react-query"],
          patterns: [
            "**/api",
            "**/queries",
            "**/mutations",
            "**/shared/api/**",
          ],
        },
      ],
    },
  },
  {
    files: web,
    plugins: { "react-hooks": reactHooks, "jsx-a11y": jsxA11y },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "no-restricted-syntax": [
        "error",
        ...restrictedFetchMembers,
        ...restrictedWebSyntax,
      ],
    },
  },
  {
    files: ["apps/web/src/shared/api/http.ts"],
    rules: { "no-restricted-syntax": ["error", ...restrictedWebSyntax] },
  },
  prettier,
);
