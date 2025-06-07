# Forum-system för Digital Handbok

## Översikt

Ett enkelt forum-system som låter boende diskutera i strukturerade trådar istället för kommentarer på sidor. Systemet är designat specifikt för bostadsrättsföreningar och integrerar med befintligt användar- och rättighetshantering.

## Funktioner

### 🗂️ **Kategorier**
- Organisera diskussioner i logiska kategorier
- Standardkategorier: "Allmänt", "Tekniska frågor", "Styrelseärenden", etc.
- Admin kan skapa och hantera kategorier

### 💬 **Diskussionstrådar (Topics)**
- Boende kan starta nya diskussioner
- Titel + innehåll + kategori
- Styrelse kan "pinna" viktiga trådar
- Möjlighet att låsa trådar

### 📝 **Inlägg/Svar (Posts)**
- Svar på diskussionstrådar
- Enkel struktur (inga nästlade kommentarer)
- Möjlighet att citera/referera andra inlägg

### 👮 **Moderation**
- Styrelse kan moderera innehåll
- Flagga olämpligt innehåll
- Låsa diskussionstrådar
- Statistik över aktivitet

## Databasstruktur

### forum_categories
```sql
- id (UUID)
- handbook_id (referens till handbok)
- name (kategorinamn)
- description (beskrivning)
- order_index (sorteringsordning)
- icon (Lucide-ikon namn)
- topic_count (antal trådar)
- post_count (antal inlägg)
- last_activity_at (senaste aktivitet)
```

### forum_topics
```sql
- id (UUID)
- handbook_id + category_id (referenser)
- title + content (diskussionens innehåll)
- author_id + author_name (vem som startade)
- is_pinned (fastnålad tråd)
- is_locked (låst tråd)
- reply_count (antal svar)
- last_reply_at (senaste svar)
```

### forum_posts
```sql
- id (UUID)
- handbook_id + topic_id (referenser)
- content (inläggets innehåll)
- author_id + author_name (författare)
- reply_to_post_id (referens till annat inlägg)
```

## Säkerhet & Behörigheter

### RLS-policies
- **Läsa**: Alla kan se forum för publika handböcker
- **Skriva**: Bara autentiserade användare för handböcker de har tillgång till
- **Moderera**: Bara admin-medlemmar kan moderera innehåll

### Användarroller
- **Admin**: Full kontroll över forum, kan moderera allt
- **Editor**: Kan skapa trådar och inlägg
- **Viewer**: Kan bara läsa (om det behövs)

## Integration med befintligt system

### Handbok-koppling
- Varje forum tillhör en specifik handbok
- Använder befintlig handbook_members för behörigheter
- Integrerar med Supabase RLS

### Notifikationer
- Email-notis vid nya trådar/svar (via Resend)
- In-app notifikationer för aktivitet
- Boende kan prenumerera på kategorier

## Fördelar med denna approach

### ✅ **Enkel att implementera**
- Bygger på befintlig arkitektur
- Inga externa beroenden
- Använder samma UI-komponenter

### ✅ **Skalbar**
- Kan hantera många användare per handbok
- Bra prestanda med index
- Cachad statistik

### ✅ **Säker**
- Samma säkerhetsmodell som resten
- Proper RLS-policies
- Moderationsmöjligheter

### ✅ **Användarvänlig**
- Bekant forum-struktur
- Mobilvänligt
- Lätt att navigera

## Standardkategorier för BRF

När en handbok skapas, läggs automatiskt dessa kategorier till:

1. **Allmänt** - Övriga diskussioner
2. **Tekniska frågor** - Fel, underhåll, reparationer
3. **Gemensamma utrymmen** - Tvättstuga, förråd, etc.
4. **Styrelseärenden** - Frågor till styrelsen
5. **Grannsämja** - Boenderelaterade frågor
6. **Förslag** - Förbättringsförslag

## Implementation roadmap

### Fas 1: Grundläggande forum
- ✅ Databasschema
- ✅ TypeScript-typer
- 🔄 API-endpoints
- 🔄 Grundläggande UI-komponenter

### Fas 2: Användargränssnitt
- 🔄 Forum-översikt
- 🔄 Skapa tråd/inlägg
- 🔄 Visa diskussioner
- 🔄 Sök och filter

### Fas 3: Moderation & notifikationer
- 🔄 Moderationsverktyg
- 🔄 Email-notifikationer
- 🔄 Flagga innehåll
- 🔄 Statistik för admin

### Fas 4: Avancerade funktioner
- 🔄 @mentions
- 🔄 Bilagor i inlägg
- 🔄 Prenumerationer
- 🔄 Sök i innehåll

## Alternativa lösningar (övervägt men ej valt)

### Tredjepartslösningar
- **Discourse**: För kraftfullt och dyrt
- **Discord/Slack**: Inte anpassat för BRF
- **Facebook Groups**: Privacyproblem

### Kommentarer på sidor
- Blev för fragmenterat
- Svårt att ha översikt
- Mindre forum-känsla

## Slutsats

Detta forum-system ger BRF:er möjlighet att ha strukturerade diskussioner utan att överkomplicera systemet. Det passar perfekt för era användarregler om enkelhet och säkerhet. 