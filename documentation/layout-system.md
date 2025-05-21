## Flexibel navigation med navLinks

Du kan skicka in egna länkar till MainHeader (och därmed MainLayout) via prop:en `navLinks`. Detta gör det enkelt att anpassa navigationen för olika sidor.

### Exempel

```tsx
<MainLayout
  variant="landing"
  navLinks={[
    { href: '/about', label: 'Om oss' },
    { href: '/pricing', label: 'Pris' },
    { href: '/contact', label: 'Kontakt' },
  ]}
>
  {/* sidinnehåll */}
</MainLayout>
```

Om du inte skickar in `navLinks` används standardlänkarna för landningssidan.

**Tips:**
- Du kan använda olika länkar på olika sidor för maximal flexibilitet.
- Alla länkar är typade och SEO-vänliga. 