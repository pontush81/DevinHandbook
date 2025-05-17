# Miljöhantering i Handbok-Projektet

Detta dokument beskriver hur du hanterar olika miljöer (utveckling, test och produktion) i handbok-projektet, särskilt med fokus på Stripe-integrationen.

## Miljöer

Projektet stöder följande miljöer:

1. **Utvecklingsmiljö (Development)**: För lokal utveckling och testning
2. **Testmiljö (Staging)**: För teständamål före produktionsdrift
3. **Produktionsmiljö (Production)**: Den faktiska miljön som användare interagerar med

## Miljövariabler

Miljövariabler hanteras via `.env.local` filen. Det finns en mall (`env.local.template`) som du kan använda för att skapa din egen `.env.local` fil.

### Miljöspecifika variabler

För varje miljö behöver du specifika miljövariabler. Nedan följer rekommendationen för Stripe-nycklarna:

#### Utveckling och Test
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

#### Produktion
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

## Säker hantering av miljöbyten

För att säkert byta mellan miljöer, följ dessa steg:

1. **Skapa separata .env-filer för varje miljö**:
   - `.env.local.development`
   - `.env.local.staging`
   - `.env.local.production`

2. **Byta miljö**:
   ```bash
   # För att byta till testmiljö
   cp .env.local.staging .env.local
   
   # För att byta till produktion
   cp .env.local.production .env.local
   ```

3. **Starta om applikationen** efter miljöbyte:
   ```bash
   npm run dev
   ```

## Viktiga säkerhetsaspekter

- **Kör aldrig** tester mot produktionsdatabasen
- **Inkludera aldrig** riktiga API-nycklar i versionskontrollsystemet
- **Kontrollera alltid** vilken miljö du arbetar i innan du gör ändringar
- **Använd Stripe-testläge** för all utveckling och testning

## Rekommenderad utvecklingsprocess

1. Utveckla och testa först lokalt med testnycklar
2. Driftsätt till testmiljö och verifiera funktionalitet
3. Först när allt är testat och verifierat, driftsätt till produktion

## Relaterade dokument

- [Stripe Testläge - Konfigurationsguide](./stripe-test-mode.md) 