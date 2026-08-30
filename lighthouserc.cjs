/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("@playwright/test");

module.exports = {
  ci: {
    collect: {
      chromePath: chromium.executablePath(),
      startServerCommand: "npm run start -- --hostname 127.0.0.1 --port 3100",
      startServerReadyPattern: "Ready in|Local:",
      url: ["http://127.0.0.1:3100/", "http://127.0.0.1:3100/explore"],
      numberOfRuns: 3,
      settings: {
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
        chromeFlags: "--headless --no-sandbox --disable-dev-shm-usage",
        maxWaitForLoad: 60_000,
      },
    },
    assert: {
      assertions: {
        "categories:performance": [
          "error",
          { minScore: 0.9, aggregationMethod: "median" },
        ],
        "categories:accessibility": [
          "error",
          { minScore: 0.9, aggregationMethod: "median" },
        ],
        "categories:best-practices": [
          "error",
          { minScore: 0.9, aggregationMethod: "median" },
        ],
        "categories:seo": [
          "error",
          { minScore: 0.9, aggregationMethod: "median" },
        ],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: "./lighthouse-reports",
    },
  },
};
