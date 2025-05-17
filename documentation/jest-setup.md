# Jest Testing Setup with TypeScript and React

Detta dokument beskriver hur Jest-testmiljön är konfigurerad för projektet och hur man skriver tester.

## Installation

Följande paket är installerade för testmiljön:

```bash
npm install --save-dev jest ts-jest @types/jest babel-jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @babel/preset-env @babel/preset-react @babel/preset-typescript
npm install --save-dev jest-environment-jsdom
```

## Konfigurationsfiler

### jest.config.js

```javascript
module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
};
```

### babel.config.js

```javascript
module.exports = {
  presets: [
    '@babel/preset-env',
    '@babel/preset-react',
    '@babel/preset-typescript',
  ],
};
```

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