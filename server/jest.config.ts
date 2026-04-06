import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  collectCoverage: true,
  collectCoverageFrom: [
    "src/controllers/authControllers.ts",
    "src/controllers/expenseControllers.ts",
    "src/routes/authRoutes.ts",
    "src/routes/expenseRoutes.ts",
    "src/middleware/authMiddleware.ts",
    "src/middleware/requestTiming.ts",
    "src/utils/responseHelpers.ts",
    "src/app.ts",
  ],
  coverageThreshold: {
    global: {
      lines: 90,
      statements: 90,
      functions: 90,
      branches: 85,
    },
  },
};

export default config;
