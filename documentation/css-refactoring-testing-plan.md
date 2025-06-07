# CSS Refaktorering - Testplan för hela siten

## Genomförd analys behövs efter stora CSS-förändringar

### 🎯 **Vad vi ändrade och varför det kan påverka andra sidor:**
1. **Tog bort 2,500+ rader global CSS** - Risk: Components kan ha förlorat styling
2. **Ändrade alla `min-height` regler** - Risk: Layout kan vara brutet på vissa sidor  
3. **Modulär struktur** - Risk: Import-dependency problem
4. **Tailwind utilities** - Risk: Vissa klasser kanske inte fungerar

### 📋 **Systematisk testplan**

#### **Prioritet 1: Kritiska användarsidor** ⚠️
- [ ] **Landing page** (`/`) - Första intryck
- [ ] **Handbok viewer** (`/[subdomain]`) - Huvudfunktionalitet
- [ ] **Meddelanden** (`/[subdomain]/meddelanden`) - ✅ FIXAT
- [ ] **Search** (`/search`) - Hitta handböcker
- [ ] **Login/Signup** (`/login`, `/signup`) - Användarregistrering
- [ ] **Dashboard** (`/dashboard`) - Användarens startsida

#### **Prioritet 2: Admin-funktionalitet** 🔧
- [ ] **Admin dashboard** (`/admin`) - Översikt
- [ ] **Content management** (`/admin/content`) - Editor-heavy page
- [ ] **User management** (`/admin/users`) - Tabeller och forms
- [ ] **Handbook management** (`/admin/handbooks`) - CRUD operationer

#### **Prioritet 3: Support-sidor** 📄
- [ ] **Create handbook** (`/create-handbook`) - Onboarding flow
- [ ] **Success pages** (`/success`) - Confirmation flows
- [ ] **Error pages** (`/404`, fel-states) - Error handling

### 🔍 **Vad att kolla på varje sida:**

#### **Layout-checks:**
- [ ] **Header/Navigation** - Är den synlig och stilad?
- [ ] **Sidebar** (om applicable) - Fungerar den?
- [ ] **Main content area** - Rätt padding/margins?
- [ ] **Footer** - Är den där den ska vara?

#### **Component-checks:**
- [ ] **Cards** - Har de border, shadow, hover-effects?
- [ ] **Buttons** - Rätt färger och hover-states?
- [ ] **Forms** - Input fields stylade korrekt?
- [ ] **Tables** - Borders och spacing?
- [ ] **Modals/Dialogs** - Poppar de upp korrekt?

#### **Responsiv-checks:**
- [ ] **Mobile** (< 640px) - Allt synligt och användbarat?
- [ ] **Tablet** (640px - 1024px) - Bra layout?
- [ ] **Desktop** (> 1024px) - Optimal storlek?

#### **Specific Problem Patterns:**
- [ ] **Min-height issues** - Innehåll som inte fyller skärmen när det borde
- [ ] **Missing shadows/borders** - Platta komponenter som ska ha depth
- [ ] **Text spacing** - För tight eller för spretig typography
- [ ] **Button styling** - Ostylade eller fel färger
- [ ] **Card components** - Saknar background eller borders

### 🛠️ **Snabbfix-strategier:**

#### **För Card-component problem:**
```css
/* Add to specific page CSS */
.page-name [data-component="card"],
.page-name .card-class {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
}
```

#### **För layout problem:**
```css
/* Restore specific min-height where needed */
.page-specific-class {
  min-height: 100vh;
}
```

#### **För component library problem:**
```css
/* Re-enable specific Tailwind utilities */
@layer utilities {
  .page-name .shadow-sm { box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05); }
  .page-name .border { border-width: 1px; }
}
```

### 📊 **Testing Matrix:**

| Sida | Layout OK | Components OK | Responsive OK | Actions Needed |
|------|-----------|---------------|---------------|----------------|
| `/` | ⏳ | ⏳ | ⏳ | - |
| `/[subdomain]` | ⏳ | ⏳ | ⏳ | - |
| `/[subdomain]/meddelanden` | ✅ | ✅ | ✅ | Card styling fixed |
| `/search` | ⏳ | ⏳ | ⏳ | - |
| `/login` | ⏳ | ⏳ | ⏳ | - |
| `/dashboard` | ⏳ | ⏳ | ⏳ | - |
| `/admin` | ⏳ | ⏳ | ⏳ | - |
| `/admin/content` | ⏳ | ⏳ | ⏳ | - |

### 🎯 **Tillvägagångssätt:**

#### **Steg 1: Quick Visual Scan** (5 min per sida)
1. Ladda sidan i browser
2. Kolla första intryck - ser det "rätt" ut?
3. Markera åpenbart brutna saker

#### **Steg 2: Interaction Testing** (5 min per sida)
1. Klicka på buttons/links
2. Testa hover-effects
3. Öppna modals/dropdowns

#### **Steg 3: Responsive Testing** (3 min per sida)
1. Ändra browser-storlek till mobil
2. Kolla att allt är synligt
3. Testa navigering på mobil

#### **Steg 4: Fix Pattern** (när problem hittas)
1. Identifiera vilket component/pattern som är brutet
2. Lägg till specific CSS i relevant modulfil
3. Testa fix på alla liknande sidor

### 📈 **Förväntade findings:**

#### **Sannolika problem baserat på vad vi ändrade:**
1. **Cards utan styling** - Meddelanden hade detta, troligt på fler sidor
2. **Layout height issues** - Sidor som behöver min-height
3. **Missing component borders** - Button, input, table styling
4. **Editor.js problems** - Content editing sidor kan ha CSS-problems

#### **Låg-risk områden:**
1. **Text/Typography** - Bevarade i globals.css
2. **Colors** - Tailwind color utilities bevarades
3. **Basic spacing** - Most margin/padding utilities intact

### 💡 **Pro-tips för effektiv testing:**

1. **Använd browser dev tools** - Quick way to spot missing CSS
2. **Test i inkognito mode** - Eliminerar cache-problem
3. **Compare före/efter screenshots** - Om du har gamla bilder
4. **Focus på user flows** - Inte varje pixel, utan kan användare genomföra viktiga tasks

### 🚨 **Red flags att kolla efter:**
- Helt vita/ostylade areas
- Buttons som ser ut som plain text
- Cards utan borders/shadows
- Text som flyter ihop utan spacing
- Content som scrollar ut ur containers

### ✅ **Success criteria:**
- [ ] Alla kritiska user flows fungerar
- [ ] Inga grava visuella buggar
- [ ] Responsiv design fungerar på mobil
- [ ] Admin-funktionalitet intact
- [ ] Performance equivalent eller bättre än före 