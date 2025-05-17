# Handbok-projektets dokumentation

Välkommen till dokumentationskatalogen för handbok-projektet. Här hittar du viktig information om hur projektet är strukturerat och hur du arbetar med olika delar av systemet.

## Innehåll

- [Stripe Testläge](./stripe-test-mode.md) - Hur du konfigurerar och använder Stripe i testläge
- [Miljöhantering](./environment-switching.md) - Hur du hanterar olika miljöer (utveckling, test, produktion)

## Använda testläge för Stripe

För att kontrollera vilket läge ditt system är konfigurerat för, kör:

```bash
npm run check-stripe
```

Detta kommando visar om du kör i testläge eller skarpt läge för Stripe-betalningar.

## Viktigt att veta

1. **Testläge vs. Skarpt läge**: Använd alltid testläge vid utveckling för att undvika oavsiktliga riktiga transaktioner.
2. **Miljövariabler**: Alla känsliga nycklar och konfigurationer lagras i `.env.local` filen som inte ska checkas in i versionshanteringen.
3. **Testdata**: I testläge kan du använda testkort för att simulera olika betalningsscenarion, se [stripe-test-mode.md](./stripe-test-mode.md) för detaljer.

---

För mer information, se den specifika dokumentationen för varje ämne i länkarna ovan. 