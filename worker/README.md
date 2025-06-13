# OCR Worker

Denna worker processar OCR-jobb från Supabase och kör Google Vision OCR på PDF:er.

## Lokalt

1. Gå till `worker/`-mappen:
   ```sh
   cd worker
   ```
2. Installera dependencies:
   ```sh
   npm install
   ```
3. Sätt miljövariabler i `.env` eller via shell:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GOOGLE_CLOUD_VISION_BUCKET`
   - `GOOGLE_CLOUD_CREDENTIALS`
4. Starta workern:
   ```sh
   npm start
   ```

## Railway/Render deploy

1. Deploya endast `worker/`-mappen som en Railway/Render service.
2. Lägg in samma miljövariabler i Railway/Render under "Variables".
3. Startkommando:
   ```sh
   npm start
   # eller
   node ocr-worker.js
   ```

## Tips
- Koden pollar Supabase efter nya jobb och processar dem automatiskt.
- Se loggar i Railway/Render för status och felsökning. 