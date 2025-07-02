# Autentiseringsproblem på Handbok.org - Analys och Lösningar

## Sammanfattning
Inloggning med användarnamn och lösenord på https://www.handbok.org/login har slutat fungera på grund av flera kritiska problem med sessionshantering och cookie-autentisering.

## Identifierade Problem

### 1. Cookie-autentisering Misslyckad
**Problem:** Serverlogen visar genomgående fel med cookie-baserad autentisering:
```
⚠️ [StandardAuth] Cookie auth error: Auth session missing!
⚠️ [StandardAuth] Cookie authentication failed, trying alternatives...
❌ [StandardAuth] All authentication methods failed
```

**Orsak:** Supabase autentiseringscookies (`sb-kjsquvjzctdwgjypcjrg-auth-token`) sparas inte eller läses inte korrekt.

### 2. Saknade Autentiseringscookies
**Problem:** Alla Supabase-autentiseringscookies saknas konsekvent i förfrågningar:
- `sb-kjsquvjzctdwgjypcjrg-auth-token`
- `sb-kjsquvjzctdwgjypcjrg-auth-token.0`
- `sb-kjsquvjzctdwgjypcjrg-auth-token.1` etc.

**Effekt:** Sessioner kan inte verifieras på serversidan.

### 3. Storage Synkroniseringsproblem
**Problem:** Den anpassade storage-implementationen i `supabase-client.ts` har problem med cookie-persistering.

**Kod med problem:**
```javascript
// Cookie-sätt funktion misslyckast med domain-hantering
const secure = window.location.protocol === 'https:' ? '; Secure' : '';
document.cookie = `${key}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/${secure}${sameSite}`;
```

### 4. Session State Hanteringsproblem
**Problem:** AuthContext har komplexa race conditions och flera retry-mekanismer som orsakar sessionsfel.

## Rekommenderade Lösningar

### Omedelbar Åtgärd (Prioritet 1)
1. **Fixa Cookie Domain Hantering**
   - Uppdatera cookie-inställningar för .handbok.org domain
   - Säkerställ att cookies sätts korrekt för produktion

2. **Förbättra Supabase Storage**
   - Förenkla storage-implementationen
   - Ta bort komplexa synkroniseringslogik mellan localStorage och cookies

### Medellång Sikt (Prioritet 2)
1. **Förenkla AuthContext**
   - Minska komplexitet i auth state management
   - Ta bort onödiga retry-mekanismer
   - Förbättra felhantering

2. **Uppdatera Supabase Konfiguration**
   - Kontrollera att rätt auth flow används (PKCE)
   - Verifiera att storage settings är korrekta

### Långsiktig Lösning (Prioritet 3)
1. **Implementera Server-Side Session Management**
   - Använd @supabase/ssr för bättre SSR-stöd
   - Implementera middleware för session refresh
   - Förbättra server-client sync

## Teknisk Implementation

### 1. Fixa Cookie Domain (src/lib/supabase-client.ts)
```javascript
setItem: (key: string, value: string) => {
  if (typeof window === 'undefined') return;
  
  // Set in localStorage
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn('localStorage setItem failed:', e);
  }
  
  // Set as cookie with correct domain
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const domain = isProduction ? '.handbok.org' : '';
    const secure = isProduction && window.location.protocol === 'https:' ? '; Secure' : '';
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    
    const cookieString = `${key}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/${domain ? `; Domain=${domain}` : ''}${secure}; SameSite=Lax`;
    document.cookie = cookieString;
  } catch (e) {
    console.warn('Cookie setItem failed:', e);
  }
}
```

### 2. Förenkla AuthContext Init
```javascript
// Ta bort komplexa retry-logik och använd enklare approach
useEffect(() => {
  const initializeAuth = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth init error:', error);
        setSession(null);
        setUser(null);
      } else {
        setSession(session);
        setUser(session?.user ?? null);
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  
  initializeAuth();
}, []);
```

### 3. Debug Information
För att diagnostisera problemet, lägg till debug-loggar:
```javascript
// I LoginForm.tsx handleSubmit
console.log('Login attempt:', {
  environment: process.env.NODE_ENV,
  hasLocalStorage: typeof localStorage !== 'undefined',
  hasCookies: typeof document !== 'undefined',
  currentUrl: window.location.href,
  userAgent: navigator.userAgent
});
```

## Testningsplan

### 1. Omedelbar Test
- [ ] Testa inloggning i utvecklingsmiljö
- [ ] Verifiera att cookies sätts korrekt
- [ ] Kontrollera console för auth-fel

### 2. Produktionstest
- [ ] Testa inloggning på https://www.handbok.org/login
- [ ] Verifiera session persistens
- [ ] Testa olika webbläsare

### 3. Regression Test
- [ ] Testa Google OAuth login
- [ ] Verifiera befintliga sessioner
- [ ] Testa logout funktionalitet

## Uppföljning

1. **Övervaka server logs** för auth-fel efter fix
2. **Implementera alerting** för auth-problem
3. **Dokumentera** nya auth flow för teamet
4. **Planera migration** till @supabase/ssr

## Kontakt för Support
- För akuta problem: Kontakta Supabase support med server logs
- För implementationshjälp: Se Supabase Next.js troubleshooting guide
- Community hjälp: Supabase Discord eller GitHub

---
*Skapad: 2025-01-20*
*Status: Kritisk - Kräver omedelbar åtgärd*