# Test Documentation - Devin Handbook Project

## 📋 Översikt

Detta är en komplett testuite för att säkerställa att refaktorering inte går sönder viktiga funktioner. Testerna är organiserade i olika kategorier för att täcka alla kritiska delar av applikationen.

## 🧪 Test-struktur

```
__tests__/
├── components/           # UI-komponenter tester
│   ├── ui/              # Grundläggande UI-komponenter
│   │   ├── button.test.tsx
│   │   └── dialog.test.tsx
│   └── handbook/        # Handbok-specifika komponenter
├── lib/                 # Business logic tester
│   ├── auth.test.ts     # Autentisering
│   └── handbook.test.ts # Handbok-funktionalitet
├── integration/         # Integration tests
│   └── create-handbook-flow.test.tsx
└── auth-diagnostics.test.ts
```

## 🚀 Hur man kör testerna

### Grundläggande kommandon

```bash
# Kör alla tester
npm test

# Kör tester i watch-mode (startar om vid ändringar)
npm run test:watch

# Kör tester med coverage-rapport
npm run test:coverage

# Kör endast UI-komponenter tester
npm run test:components

# Kör endast business logic tester 
npm run test:lib

# Kör endast autentisering tester
npm run test:auth
```

### CI/CD kommandon

```bash
# Kör tester som de skulle köras i CI (inga watch-modes)
npm run test:ci
```

## 🎯 Vad testerna täcker

### ✅ UI-komponenter
- **Button**: Styling-konsistens, blå färger, hover-states, disabled states
- **Dialog**: Bakgrund inte genomskinlig, korrekt öppning/stängning, styling
- **Forms**: Validering, error handling, user interactions

### ✅ Autentisering
- Sign up, sign in, sign out
- Session management och refresh
- Error handling för expired sessions
- Auth state changes
- User profile management

### ✅ Handbok-funktionalitet
- Handbok-skapande med sektioner och sidor
- Subdomain uniqueness validation
- CRUD-operationer (Create, Read, Update, Delete)
- Error handling vid databas-operationer

### ✅ Payment Flow
- Stripe checkout session creation
- Payment verification
- Error handling för payment failures
- Integration med handbok-skapande

### ✅ Integration Tester
- Komplett user flow från handbok-skapande till publicering
- Subdomain availability check
- Form validation
- Error recovery

## 🛡️ Refaktorering med trygghet

### Innan refaktorering:
```bash
# 1. Kör alla tester för att säkerställa att de passerar
npm test

# 2. Kör coverage-rapport för att se vad som testas
npm run test:coverage
```

### Under refaktorering:
```bash
# Kör i watch-mode så testerna körs automatiskt vid ändringar
npm run test:watch

# Eller kör specifika tester för den del du refaktorerar:
npm run test:components  # Om du refaktorerar UI
npm run test:lib         # Om du refaktorerar business logic
npm run test:auth        # Om du refaktorerar autentisering
```

### Efter refaktorering:
```bash
# Säkerställ att alla tester fortfarande passerar
npm run test:ci

# Bygg projektet för att säkerställa inga build-errors
npm run build
```

## 🔧 Mocking-strategi

### Supabase
```typescript
// Alla Supabase-anrop är mockade för konsistenta test-results
jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { /* mocked auth methods */ },
    from: jest.fn(() => ({ /* mocked database operations */ }))
  }
}));
```

### Next.js Router
```typescript
// Router-navigation är mockad för isolerade tester
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), /* ... */ }))
}));
```

### Stripe/Payment
```typescript
// Fetch requests (för Stripe API) är mockade
global.fetch = jest.fn();
```

## 📊 Coverage Goals

Målet är att ha hög coverage på kritiska delar:

- **Autentisering**: >90% coverage
- **Payment flow**: >85% coverage  
- **Handbok CRUD**: >80% coverage
- **UI-komponenter**: >75% coverage

## 🚨 Viktiga saker att testa efter refaktorering

### Kör alltid dessa specifika tester:
```bash
# 1. Autentisering (kritiskt för säkerhet)
npm run test:auth

# 2. Handbok-skapande (core business logic)
npm test __tests__/integration/create-handbook-flow.test.tsx

# 3. UI-konsistens (user experience)
npm run test:components

# 4. Dialog transparency fix (recent bug fix)
npm test __tests__/components/ui/dialog.test.tsx
```

## 🔍 Debugging test failures

### När tester misslyckas:

1. **Kör med verbose output**:
   ```bash
   npm test -- --verbose
   ```

2. **Kör ett specifikt test**:
   ```bash
   npm test -- --testNamePattern="specific test name"
   ```

3. **Kolla mock status**:
   ```bash
   # Lägg till i din test:
   console.log('Mock calls:', mockFunction.mock.calls);
   ```

4. **Debug DOM state**:
   ```bash
   # I React Testing Library tests:
   screen.debug(); // Prints current DOM
   ```

## 📝 Lägga till nya tester

### När du lägger till ny funktionalitet:

1. **UI-komponenter**: Lägg till i `__tests__/components/`
2. **Business logic**: Lägg till i `__tests__/lib/`
3. **User flows**: Lägg till i `__tests__/integration/`

### Test template:
```typescript
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

describe('Your Component/Function', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should do what it\'s supposed to do', () => {
    // Arrange
    const input = 'test input';
    
    // Act
    const result = yourFunction(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

## ⚡ Tips för effektiv testning

1. **Kör relevanta tester**: Fokusera på att köra tester för den del du refaktorerar
2. **Watch mode**: Använd `npm run test:watch` för snabb feedback
3. **Coverage**: Kolla `npm run test:coverage` för att se vad som saknar tester
4. **Integration först**: Kör integration-tester först för att fånga stora problem
5. **Mock smart**: Mocka beroenden men testa verklig logik

## 🎯 Nästa steg

Med denna testuite kan du nu säkert:

1. ✅ Refaktorera UI-komponenter
2. ✅ Städa upp business logic
3. ✅ Optimera databas-queries
4. ✅ Förbättra error handling
5. ✅ Uppdatera dependencies

**Kom ihåg**: Kör alltid `npm test` innan och efter varje refaktorering! 