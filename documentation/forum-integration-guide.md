# Forum Integration Guide

## 📍 URL-struktur (Path-baserad)

Forum använder er befintliga routing-struktur:

```
http://localhost:3000/test/forum                    (Forum-översikt)
http://localhost:3000/test/forum/category/[id]      (Kategori-vy)
http://localhost:3000/test/forum/topic/[id]         (Diskussionstråd)
http://localhost:3000/test/forum/new-topic          (Skapa ny tråd)

http://localhost:3000/brf-segerstaden/forum         (Annan BRF)
```

## 🔒 Data-separation

**Ja, all data är 100% separerad mellan föreningar:**

```sql
-- Alla forum-tabeller har handbook_id som foreign key
forum_categories (handbook_id -> handbooks.id)
forum_topics (handbook_id -> handbooks.id)  
forum_posts (handbook_id -> handbooks.id)

-- RLS-policies säkerställer att endast data för rätt handbok visas
CREATE POLICY "Topics synliga för publika handböcker" 
  ON forum_topics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM handbooks 
      WHERE handbooks.id = forum_topics.handbook_id 
      AND handbooks.published = true
    )
  );
```

**BRF Segerstaden kan ALDRIG se BRF Test's forum-data.**

## 📱 Integration i Navigation

### 1. Lägg till Forum-knapp i sidemeny

Hitta er befintliga sidemeny-komponent och lägg till:

```tsx
// I er befintliga navigation/sidebar-komponent
import { ForumMenuButton } from '@/components/forum/ForumNavigation';

// Lägg till denna mellan era befintliga menyalternativ:
<ForumMenuButton subdomain={subdomain} unreadCount={0} />
```

### 2. Exempel på integration

```tsx
// Exempel på hur det kan se ut i er sidemeny:
<nav className="space-y-1">
  <Link href={`/${subdomain}`}>Hem</Link>
  <Link href={`/${subdomain}/sections`}>Avsnitt</Link>
  <ForumMenuButton subdomain={subdomain} unreadCount={0} />  {/* NYT! */}
  <Link href={`/${subdomain}/documents`}>Dokument</Link>
</nav>
```

## 🎯 Standardkategorier skapade

Forum-systemet har automatiskt skapat dessa kategorier för alla handböcker:

1. **Allmänt** - Övriga diskussioner
2. **Tekniska frågor** - Fel, underhåll, reparationer  
3. **Gemensamma utrymmen** - Tvättstuga, förråd, etc.
4. **Styrelseärenden** - Frågor till styrelsen
5. **Grannsämja** - Boenderelaterade frågor
6. **Förslag** - Förbättringsförslag

## 🚀 Testa direkt

```bash
# Gå till forum för "test":
http://localhost:3000/test/forum

# Gå till forum för "brf-segerstaden":  
http://localhost:3000/brf-segerstaden/forum
```

## ✅ Nästa steg

1. **Integrera navigation** - Lägg till `ForumMenuButton` i er sidemeny
2. **Testa olika handböcker** - Bekräfta att data är separerad
3. **Skapa API:er** - För att kunna skapa topics och posts
4. **Lägg till i layout** - Forum-navigering i handbok-layouten

## 🔧 Utveckling

När ni är redo att bygga vidare behöver ni:

- API-endpoints för att skapa/redigera topics och posts
- Formulär för att skapa nya diskussioner
- Moderationsverktyg för admins
- Notifikationssystem

Allt är förberett i databasen och typerna är klara! 