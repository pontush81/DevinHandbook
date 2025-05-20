# Säkerhetschecklista – OWASP Top 10 för Next.js & Supabase

Denna checklista hjälper dig att följa OWASP Top 10 i detta projekt.

## 1. Broken Access Control
- Använd Supabase RLS (Row Level Security) på ALLA tabeller.
- Kontrollera att API:er och endpoints endast returnerar data till rätt användare.

## 2. Cryptographic Failures
- Använd alltid HTTPS i produktion.
- Lagra aldrig hemliga nycklar i frontend eller i repo.
- Kontrollera att känslig data är krypterad i databasen.

## 3. Injection (SQL, XSS, etc)
- Använd parametriserade queries (Supabase gör detta automatiskt).
- Sanera all användardata innan rendering (t.ex. ReactMarkdown: tillåt EJ HTML).

## 4. Insecure Design
- Tillämpa "least privilege" på alla endpoints och databasregler.
- Validera och sanera all input från användare.

## 5. Security Misconfiguration
- Kontrollera CORS-inställningar.
- Säkra miljövariabler och använd olika .env-filer för dev/staging/prod.
- Kör aldrig i debug mode i produktion.

## 6. Vulnerable and Outdated Components
- Kör `npm audit` och `npm outdated` regelbundet.
- Uppdatera beroenden vid behov.

## 7. Identification and Authentication Failures
- Använd Supabase Auth korrekt.
- Se till att sessionshantering är säker och att lösenordspolicy är stark.

## 8. Software and Data Integrity Failures
- Använd CI/CD och versionshantering.
- Ladda aldrig in okänd kod eller tredjepartsbibliotek utan granskning.

## 9. Security Logging and Monitoring Failures
- Lägg till loggning för fel och misstänkt aktivitet.
- Använd Supabase och Next.js loggning.

## 10. Server-Side Request Forgery (SSRF)
- Undvik att göra server-till-server-anrop baserat på användarinput.

---

**Tips:**
- Granska denna checklista vid varje ny feature eller release.
- Lägg till automatiska tester för säkerhet där det är möjligt. 