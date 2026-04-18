module.exports = [
  {
    ignores: ["leaderboard.json"],
  },
  {
    files: ["*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        document: "readonly",
        fetch: "readonly",
        performance: "readonly",
        window: "readonly",
      },
    },
    rules: {
      "array-callback-return": "error",
      "consistent-return": "off",
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-const-assign": "error",
      "no-redeclare": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-use-before-define": "off",
      "object-shorthand": ["warn", "always"],
      "prefer-const": "warn",
    },
  },
  {
    files: ["eslint.config.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        __dirname: "readonly",
        module: "readonly",
        process: "readonly",
        require: "readonly",
      },
    },
  },
];
