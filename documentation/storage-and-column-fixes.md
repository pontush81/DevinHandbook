# Åtgärder för storage- och databaskolumnproblem

## Bakgrund
Vi har åtgärdat två huvudproblem i applikationen:

1. 400/500-fel vid skapande av handböcker pga. inkonsekvent namngivning av ID-kolumner
2. "Access to storage is not allowed from this context" i iframes och subdomäner

## 1. Databaskolumnkonvertering `user_id` -> `owner_id`

### Problem
Koden använde `owner_id` medan databasen använde `user_id`, vilket orsakade 400 Bad Request-fel.

### Åtgärder
1. **Databas**: Migration för att byta namn på kolumnen i handbooks-tabellen och handbook_permissions-tabellen.
2. **API**: Uppdatering av alla API-routes för att använda `owner_id` istället för `user_id`.
3. **Klient**: Ändring av alla frontend-komponenter för att använda `owner_id`.

### Migrationsfil
Vi uppdaterade migrationsfilen `update_user_id_to_owner_id.sql` för att:
- Byta namn på kolonner i både handbooks och handbook_permissions
- Uppdatera RLS-policies för att använda `owner_id`
- Skapa policies för handbook_permissions-tabellen

## 2. Säker localStorage-åtkomst

### Problem
Moderna webbläsare blockerar localStorage-åtkomst i vissa kontexter:
- I iframes (särskilt cross-domain)
- När användaren har aktiverat "Enhanced Tracking Protection"
- I incognito/privat läge

### Åtgärder
1. **Säker storage-wrapper**: Implementerat `safeStorage` som:
   - Försöker använda localStorage när det är tillgängligt
   - Använder in-memory fallback när localStorage inte kan användas
   - Detekterar iframe-kontext och anpassar beteende

2. **Kompatibilitetstyper**: Lade till TypeScript-deklarationer för `safeStorage`

3. **Konsekvent användning**: Uppdaterade alla platser som använder localStorage:
   - HandbookOnboardingBanner
   - AuthContext
   - Andra komponenter som behöver lagring

## Hur man kör migrationen
Migrationen körs med:
```
node scripts/run-migrations.js update_user_id_to_owner_id.sql
```

Observera att du måste ha korrekta värden i `.env.local` för att detta ska fungera.

## Att tänka på framöver
- Använd alltid `owner_id` som kolumnnamn för ägaren till en handbok
- Använd alltid `safeStorage` istället för direkt `localStorage`-åtkomst
- Vid test av iframe-funktionalitet, testa även när localStorage är blockerat av webbläsaren 