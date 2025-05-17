# Uppdaterad Jest Testing Setup med TypeScript och React

Detta dokument beskriver hur Jest-testmiljön är konfigurerad för projektet så att den inte krockar med Next.js-byggen.

## Installation

Följande paket är installerade för testmiljön:

```bash
npm install --save-dev jest ts-jest @types/jest babel-jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @babel/preset-env @babel/preset-react @babel/preset-typescript
npm install --save-dev jest-environment-jsdom @babel/plugin-syntax-import-attributes
```

## Konfigurationsstruktur

För att undvika konflikter med Next.js SWC-kompilatorn har vi isolerat Babel-konfigurationen för Jest i en separat mapp:

```
projekt/
  ├── jest-config/
  │   └── babel-jest.js  # Babel-konfiguration för Jest
  ├── jest.config.js     # Jest huvudkonfiguration
  └── package.json       # Uppdaterat test-skript
```

## Konfigurationsfiler

### jest-config/babel-jest.js

```javascript
// Detta konfigurerar babel endast för Jest-tester och påverkar inte Next.js
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
  plugins: [
    '@babel/plugin-syntax-import-attributes'
  ]
};
```

### jest.config.js

```javascript
/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": ["babel-jest", { configFile: './jest-config/babel-jest.js' }]
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
```

## Uppdaterade package.json scripts

```json
"scripts": {
  "test": "NODE_ENV=test jest --config=jest.config.js"
}
```

## Varför denna struktur?

1. Vi har flyttat Babel-konfigurationen till en egen mapp (`jest-config/`) för att helt isolera den från Next.js byggprocess
2. Vi pekar explicit på Babel-konfigurationen i Jest-transformern för att undvika att Next.js hittar en `.babelrc` eller `babel.config.js` fil
3. Vi kör testerna med explicit konfiguration via `--config=jest.config.js`
4. Detta låter Next.js använda sin SWC-kompilator för byggprocessen utan konflikter

## Skriva tester

Tester placeras i `__tests__`-mappen. Testfiler ska namnges med `.test.ts` eller `.test.tsx` för React-komponenter.

### Exempel på komponenttest

```tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Hello from '../src/components/Hello';

test('renders greeting with name', () => {
  render(<Hello name="Pontus" />);
  expect(screen.getByText('Hello, Pontus!')).toBeInTheDocument();
});
```

## Köra tester

```bash
npm test
```

För att köra tester med coverage-rapport:

```bash
npm test -- --coverage
```

För att köra specifika testfiler:

```bash
npm test -- path/to/test/file.test.tsx
``` 