# UI Felsökning - Handbok

## 🚨 Vanliga UI-problem och lösningar

### Problem: UI "tappar" eller försvinner

**Symptom:**
- Komponenter renderas inte korrekt
- Innehåll försvinner plötsligt
- Fast Refresh går i loop
- Loading-skärm fastnar
- Logg visar många "Fast Refresh had to perform a full reload"

**Huvudorsaker:**
1. **Korrupt webbläsarcache**
2. **Problematiska auth-cookies** 
3. **Gammalt localStorage/sessionStorage**
4. **Service workers med gamla cachade filer**

### ✅ Lösning 1: Inkognito-läge (Snabbtest)
Öppna sidan i inkognito/privat läge:
- **Chrome/Edge:** `Ctrl+Shift+N`
- **Firefox:** `Ctrl+Shift+P`
- **Safari:** `Cmd+Shift+N`

**Om det fungerar i inkognito** → Problemet är cache/cookies

### ✅ Lösning 2: Manuell cache-rensning

#### Chrome/Edge:
1. `F12` → Öppna Developer Tools
2. Högerklicka på reload-knappen 
3. Välj "Empty Cache and Hard Reload"

#### Firefox:
1. `Ctrl+Shift+Delete`
2. Välj "Everything" och kryssa i alla boxar
3. Klicka "Clear Now"

#### Safari:
1. `Cmd+Option+E` → Empty caches
2. `Cmd+Shift+Delete` → Clear history

### ✅ Lösning 3: Automatisk cache-rensning (Development)

I development-läge finns en **"Rensa Cache"**-knapp längst ner till höger på sidan.

Knappen:
- Rensar localStorage och sessionStorage
- Tar bort alla cookies för domänen
- Avregistrerar service workers
- Rensar cache storage
- Laddar om sidan automatiskt

### ✅ Lösning 4: Programmatisk cache-rensning

```javascript
// Rensa all cache för denna app
const clearAppCache = async () => {
  localStorage.clear();
  sessionStorage.clear();
  
  // Rensa cookies
  document.cookie.split(";").forEach((c) => {
    const eqPos = c.indexOf("=");
    const name = eqPos > -1 ? c.substr(0, eqPos) : c;
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  });
  
  // Rensa service workers
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (let registration of registrations) {
      await registration.unregister();
    }
  }
  
  // Ladda om
  window.location.reload();
};
```

## 🔧 Förebyggande åtgärder

### 1. Auth-context förbättringar
- Automatisk rensning av korrupta auth-tokens
- Bättre hantering av expired sessions
- Minskat antal auth state changes

### 2. Render optimering
- `useDebounceRender` för att förhindra render loops
- `StableProvider` för att stabilisera props
- Minskat antal onödiga re-renders

### 3. Next.js konfiguration
- Optimerad webpack för development
- Förbättrad Fast Refresh
- Bättre watch options

## 🐛 Debug-verktyg

### Console-kommandon för debugging:
```javascript
// Kolla auth-status
supabase.auth.getSession()

// Kolla localStorage
console.log(localStorage)

// Kolla cookies  
console.log(document.cookie)

// Tvinga cache-rensning
location.reload(true) // Hard reload
```

### Logg-analys
Leta efter dessa mönster i console:
- `Fast Refresh had to perform a full reload` → Cache-problem
- `Auth state change: SIGNED_IN` (upprepas) → Auth loop
- `Critical dependency: the request of a dependency is an expression` → Supabase warning (ofarligt)

## 📱 Mobilspecifika problem

### iOS Safari:
- Ofta aggressiv cache
- Privat surfning kan lösa problem
- Settings → Safari → Clear History and Website Data

### Android Chrome:
- Settings → Privacy → Clear browsing data
- Välj "All time" och alla kategorier

## 🚀 När allt annat misslyckats

1. **Stäng webbläsaren helt** (inte bara fliken)
2. **Starta om webbläsaren**
3. **Prova en annan webbläsare**
4. **Starta om datorn** (sista utvägen)

## 📝 Rapportera problem

Om problemet kvarstår trots alla lösningar:
1. Inkludera browser version och OS
2. Kopiera console.log utdata
3. Beskriv exakt vad som händer
4. Nämn om inkognito fungerar eller inte

## 🔄 Regelbundet underhåll

**För utvecklare:**
- Rensa cache varje vecka
- Kontrollera för Fast Refresh warnings
- Övervaka bundle size

**För användare:**
- Prova inkognito om något är konstigt
- Rapportera ihållande problem
- Håll webbläsaren uppdaterad 