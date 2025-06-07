/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { configFile: './jest-config/babel-jest.js' }]
  },
  setupFilesAfterEnv: [
    '@testing-library/jest-dom',
    '<rootDir>/jest-config/setup-tests.js'
  ],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/.next/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  // Lägg till moduleNameMapper för path aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/hooks/(.*)$': '<rootDir>/src/hooks/$1',
  },
  // Förhindra att Jest behandlar Next.js interna filer
  transformIgnorePatterns: [
    '/node_modules/(?!.*.mjs$)',
    "/node_modules/(?!(react-markdown|remark-gfm|unified|bail|trough|vfile|micromark|mdast-util-to-string)/)"
  ],
  // Ignorera Next.js specifika filer i tester
  modulePathIgnorePatterns: [
    "<rootDir>/.next/"
  ],
  // Använd node environment för API tester
  testEnvironmentOptions: {
    url: "http://localhost/",
  },
  // Global setup for Next.js API testing
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};