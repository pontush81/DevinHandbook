# Cloudflare DNS-konfiguration för Handbok.org

## Wildcard-subdomän konfiguration

För att säkerställa att test-subdomäner och multi-level-subdomäner fungerar korrekt behöver följande inställningar göras i Cloudflare:

### 1. Huvudsakliga DNS-poster

```
# Grundläggande domänposter
handbok.org              A      <IP-adress>
www.handbok.org          CNAME  handbok.org

# Wildcard för alla subdomäner
*.handbok.org            CNAME  handbok.org

# Wildcard för multi-level subdomäner (t.ex. test.subdomain.handbok.org)
*.*.handbok.org          CNAME  handbok.org
```

### 2. Page Rules i Cloudflare

Skapa följande Page Rules för att hantera dynamiska omdirigerings-regler:

#### Regel 1: Omdirigera test.*.handbok.org

**URL-mönster:** `test.*.handbok.org/*`  
**Åtgärd:** Forwarding URL (301 Redirect)  
**Destination:** `https://www.handbok.org/handbook/$2/$1`  
**Reg-expressions aktiverade:** Ja, med $2 som fångar subdomänen mellan 'test.' och '.handbok.org'

#### Regel 2: Omdirigera *.handbok.org

**URL-mönster:** `*.handbok.org/*`  
**Åtgärd:** Forwarding URL (301 Redirect)  
**Destination:** `https://www.handbok.org/handbook/$1`  
**Reg-expressions aktiverade:** Ja, med $1 som fångar subdomänen

### 3. Andra viktiga inställningar

1. Aktivera "Proxy" (molnikonen orange) för alla DNS-poster.
2. Säkerställ att SSL-inställningen är "Full (strict)" för kryptering.
3. Aktivera "Always Use HTTPS" under SSL/TLS-inställningar.

## Testning av konfigurationen

När ovanstående inställningar är gjorda, kontrollera följande:

1. `test.handbok.org` borde omdirigera till `www.handbok.org/handbook/test`
2. `test.annie.handbok.org` borde omdirigera till `www.handbok.org/handbook/annie`
3. `annie.handbok.org` borde omdirigera till `www.handbok.org/handbook/annie`

Om något av dessa test misslyckas, kontrollera Page Rules igen och säkerställ att wildcard-posterna är korrekt konfigurerade.

## Staging-miljö

Samma konfiguration ovan kan appliceras för staging.handbok.org med motsvarande DNS-poster för den domänen. 