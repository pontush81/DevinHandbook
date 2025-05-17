/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/.next/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  // Förhindra att Jest behandlar Next.js interna filer
  transformIgnorePatterns: [
    '/node_modules/(?!.*.mjs$)'
  ],
  // Ignorera Next.js specifika filer i tester
  modulePathIgnorePatterns: [
    "<rootDir>/.next/"
  ],
  // Använd jest-environment-jsdom för tester
  testEnvironmentOptions: {
    url: "http://localhost/",
  },
};