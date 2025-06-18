# Feedback på juridiska texter för handbok.org

## Sammanfattning
Dina föreslagna texter är en bra grund, men behöver flera viktiga tillägg och förtydliganden för att vara juridiskt korrekta och täcka din specifika tjänst.

## Viktiga saknade delar som behöver läggas till:

### 1. Specifika tredjepartstjänster som måste nämnas:
- **Supabase** (databas och autentisering)
- **Vercel** (hosting) 
- **Stripe** (betalningar - MYCKET viktigt för GDPR)
- **Resend** (e-posthantering)

### 2. Betalningsvillkor som saknas:
- Prenumerationspris och faktureringscykel
- Återbetalningspolicy
- Betalningsmetoder
- Automatisk förnyelse
- Uppsägningsvillkor

### 3. Cookie-policy förtydliganden:
- Du har redan implementerat cookie-samtycke korrekt
- Behöver specificera Supabase auth-cookies
- Nämna att ni INTE använder Google Analytics eller tracking

### 4. Kontaktuppgifter:
- Behöver riktig företagsinformation
- Juridisk adress
- Organisationsnummer
- Dataskyddsombud (om tillämpligt)

### 5. Datalagring och säkerhet:
- Var data lagras (EU/Sverige via Supabase)
- Backup-rutiner
- Dataportabilitet
- Dataminimering

## Förslag på förbättringar:

### Integritetspolicy - Tillägg:
```
Tredjepartstjänster vi använder:
• Supabase (databas och autentisering) - data lagras inom EU
• Stripe (betalningar) - för hantering av prenumerationer
• Vercel (hosting) - för webbplatsens drift
• Resend (e-post) - för systemnotifikationer

Lagringstid:
• Användardata: Så länge kontot är aktivt + 30 dagar efter avslutad prenumeration
• Betalningsdata: 7 år (enligt bokföringslagen)
• Loggar: 30 dagar
```

### Användarvillkor - Tillägg:
```
Priser och betalning:
• Tjänsten kostar 2490 kr per år
• Betalning sker via Stripe
• Automatisk förnyelse
• 30 dagars provperiod
• Uppsägning senast 30 dagar före förnyelse

Tjänsteavbrott:
• Vi strävar efter 99% upptid
• Planerat underhåll meddelas i förväg
• Ingen ersättning för kortare avbrott (<24h)
```

### Cookie-policy - Tillägg:
```
Specifika cookies:
• sb-auth-token (Supabase autentisering) - 7 dagar
• sb-refresh-token (sessionsförnyelse) - 30 dagar  
• Inga Google Analytics eller tracking-cookies
• Inga marknadsföringscookies
```

## Juridiska rekommendationer:

### 1. Företagsinformation som måste finnas:
- Fullständigt företagsnamn
- Organisationsnummer
- Postadress
- E-post och telefon
- Ansvarig utgivare

### 2. Ansvarsfriskrivningar att förstärka:
```
Vi ansvarar inte för:
• Förlust av data vid användarfel
• Beslut fattade baserat på handbokens innehåll
• Juridisk korrekthet av användarskapat innehåll
• Tredjepartstjänsters tillgänglighet
• Indirekt skada eller förlorad vinst
```

### 3. Uppsägning och dataportabilitet:
```
Vid uppsägning:
• Data exporteras inom 30 dagar
• Konto raderas efter 60 dagar
• Backup-data raderas efter 90 dagar
• Betalningshistorik sparas enligt lag (7 år)
```

## Vad du behöver göra härnäst:

1. **Samla företagsinformation** - namn, orgnr, adress
2. **Komplettera med specifika tjänstedetaljer** - Supabase, Stripe, etc.
3. **Lägg till betalningsvillkor** - priser, uppsägning, återbetalning
4. **Förtydliga datahantering** - var, hur länge, vilka rättigheter
5. **Överväg juridisk granskning** - särskilt för betalningsvillkor

## Prioritet:
🔴 **HASTE**: Betalningsvillkor och Stripe-integration (GDPR-krav)
🟡 **VIKTIGT**: Komplettera tredjepartstjänster
🟢 **BRA ATT HA**: Förbättra ansvarsfriskrivningar

Vill du att jag hjälper dig skriva de kompletta, uppdaterade texterna? 