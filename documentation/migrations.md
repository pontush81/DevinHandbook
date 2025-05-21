# Handboken Databasmigrationer

## Uppdatera handbooks-tabellen: user_id till owner_id

Vi behöver göra en databasmigration för att åtgärda ett problem där koden använder `owner_id` men databasen använder `user_id` för handbooks-tabellen.

### Bakgrund

I vår kod har vi ändrat alla förekomster av `user_id` till `owner_id` i handbooks-relaterade API-anrop, men i databasen finns fortfarande kolonnen `user_id`. Detta orsakar 400 Bad Request-fel när klientsidan försöker göra anrop.

### Lösning

1. Vi har skapat en migrationsfil som:
   - Byter namn på kolonnen `user_id` till `owner_id` i handbooks-tabellen
   - Uppdaterar RLS-policies för att använda den nya kolumnnamnet
   - Lägger till en funktion och trigger för att säkerställa att användareprofiler skapas automatiskt

### Så här kör du migrationen

```bash
# Installera nödvändiga paket om de inte redan finns
npm install dotenv @supabase/supabase-js

# Kör migrationen
node scripts/run-migrations.js update_user_id_to_owner_id.sql
```

### Viktigt att notera

- Dubbelkolla att du har rätt miljövariabler innan du kör migrationen
- Denna migration gör ändringar i produktionsdatabasen - **testa på en dev-branch först**
- Migrationen är idempotent och kan köras flera gånger utan problem

### Kod ändringar

Vi har uppdaterat följande filer för att använda `owner_id` istället för `user_id`:

- src/app/dashboard/page.tsx
- src/app/create-handbook/page.tsx
- src/app/edit-handbook/[id]/client.tsx
- src/lib/proxy-db.ts

Vi har också lagt till en utility-funktion `ensureUserProfile` i `src/lib/user-utils.ts` som säkerställer att användarprofiler skapas när de behövs. 