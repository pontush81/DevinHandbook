# Förbättrad Checkbox-logik för Synlighet

## Översikt

Den gamla checkbox-logiken var förvirrande med separata "Publik sektion" och "Publicerad sektion" checkboxar. Den nya logiken använder radio-buttons för tydligare och mer intuitiva val.

## Nya Synlighetsalternativ

### För Sektioner (Radio-buttons)

1. **📝 Utkast** (`is_published: false`)
   - Dold för alla utom redigerare
   - Används för sektioner som inte är klara

2. **🔒 Endast medlemmar** (`is_published: true, is_public: false`)
   - Synlig endast för inloggade användare
   - Bra för känslig information

3. **🌐 Synlig för alla** (`is_published: true, is_public: true`)
   - Synlig för alla besökare
   - Standard för allmän information

### För Sidor (Checkbox)

- **Publicerad** (checkbox) - När ikryssad: sidan visas för användare. När ej ikryssad: sidan är ett utkast och dold
- Konsekvent etikett som inte ändras för att undvika förvirring

## 🔄 Automatisk Kaskadlogik

Om alla sidor i en sektion blir utkast, blir sektionen automatiskt utkast. När en sida publiceras i en utkast-sektion, återställs sektionen till sitt tidigare tillstånd (antingen "Endast medlemmar" eller "Synlig för alla").

## ↕️ Sortering och Ordning

### Konsekvent Sortering
- Både sektioner och sidor sorteras alltid efter `order_index` för konsistent visning
- Samma ordning visas i både redigeringsläge och läsläge
- Dolda sektioner påverkar inte den visuella ordningen

### Flytta Sektioner (Endast Redigeringsläge)
- **↑ Upp-knapp**: Flyttar sektionen ett steg uppåt i ordningen
- **↓ Ner-knapp**: Flyttar sektionen ett steg nedåt i ordningen
- Knapparna är inaktiverade när sektionen redan är först/sist
- Ändringarna sparas automatiskt i databasen

### UI-funktioner
- Upp/ner-knappar visas endast i redigeringsläge
- Knappar är visuellt inaktiverade när de inte kan användas
- Tooltips förklarar vad varje knapp gör

## Implementation

### Komponenter som uppdaterats:
- `AllSectionsView.tsx` - Nya radio-buttons för sektioner
- `ModernHandbookClient.tsx` - Förbättrad synlighetslogik och kaskadlogik
- `src/app/admin/content/page.tsx` - Uppdaterat admin-gränssnitt

### Nya funktioner:
- `checkAndUpdateSectionStatus()` - Kontrollerar och uppdaterar sektionsstatus
- Förbättrad `getVisibleSections()` - Tydligare synlighetslogik
- Automatisk status-kontroll vid sid-uppdateringar

## Migration

Befintliga data fungerar direkt eftersom:
- `is_published: undefined/null` behandlas som `true` (bakåtkompatibilitet)
- `is_public: undefined/null` behandlas som `true` (bakåtkompatibilitet)

## Användargränssnitt

### Före:
```
☑ Publik sektion
☑ Publicerad sektion
```

### Efter:
```
Synlighet:
◯ 📝 Utkast
◯ 🔒 Endast medlemmar  
● 🌐 Synlig för alla
```

Detta gör det mycket tydligare vad varje alternativ betyder och förhindrar förvirring kring vilka kombinationer som är tillåtna. 