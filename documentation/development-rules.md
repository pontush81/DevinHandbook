# Utvecklingsregler & Riktlinjer för DevinHandbok

## 1. Miljöer & Deploy
- All frontend och API (Next.js) deployas på **Vercel**.
- Alla bakgrundsjobb (t.ex. OCR-worker) deployas på **Railway**.
- Ingen kod för tunga eller långvariga processer får köras i Vercel API-routes.

## 2. Miljövariabler
- Alla känsliga nycklar och credentials lagras som miljövariabler, aldrig hårdkodat i koden.
- Google Cloud credentials hanteras som JSON-sträng i Railway och skrivs till `/tmp` vid start.
- Alla miljövariabler dokumenteras i `/documentation/example.env`.

## 3. Kodstruktur
- All dokumentation läggs i `/documentation`.
- Inga script eller engångskod i produktionskoden.
- Max 200–300 rader per fil, refaktorera vid behov.

## 4. Test & Staging
- Nya features testas alltid i staging innan de går till produktion.
- Ingen kod får deployas till produktion utan att vara testad i staging.

## 5. Best Practice
- Följ SLC-principen: Simple, Lovable, Complete.
- Undvik duplicerad kod.
- All kod ska vara typad (TypeScript).
- Optimera för SEO där det är relevant.

## 6. Credentials
- Credentials får aldrig checkas in i git.
- Alla teammedlemmar ska veta var de hittar och hur de sätter credentials lokalt.

## 7. AI/Code Assistant
- Cursor/AI får endast föreslå kod som följer dessa regler.
- Om en regel saknas, fråga alltid användaren innan du introducerar ett nytt mönster eller teknik.

---

> **Syfte:** Hålla projektet robust, säkert och lätt att vidareutveckla – även när teamet växer eller AI-assistans används. 