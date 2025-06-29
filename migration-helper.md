# Hybrid Authentication Migration Guide

## Quick Migration Pattern

### BEFORE (old auth-utils pattern):
```typescript
import { getServerSession } from '@/lib/auth-utils';

const session = await getServerSession();
const { searchParams } = new URL(request.url);
const queryUserId = searchParams.get('userId');
const userId = session?.user?.id || queryUserId;

if (!userId) {
  return NextResponse.json({ error: 'Ej autentiserad' }, { status: 401 });
}
```

### AFTER (new hybrid pattern):
```typescript
import { getHybridAuth, AUTH_RESPONSES } from '@/lib/standard-auth';

const { userId, session, authMethod } = await getHybridAuth(request);

if (!userId) {
  return NextResponse.json(
    AUTH_RESPONSES.UNAUTHENTICATED,
    { status: AUTH_RESPONSES.UNAUTHENTICATED.status }
  );
}
```

## Migration Benefits

✅ **Hybrid Compatibility**: Supports cookies, query params, Bearer tokens  
✅ **Join System Compatible**: Works with existing userId query parameter pattern  
✅ **Standardized Responses**: Consistent error messages  
✅ **Better Logging**: Enhanced debugging information  
✅ **Future Proof**: Single auth method for all endpoints  

## Step-by-Step Migration

1. **Replace import**:
   ```typescript
   // OLD
   import { getServerSession } from '@/lib/auth-utils';
   
   // NEW  
   import { getHybridAuth, AUTH_RESPONSES } from '@/lib/standard-auth';
   ```

2. **Replace auth logic**:
   ```typescript
   // OLD
   const session = await getServerSession();
   const userId = session?.user?.id || searchParams.get('userId');
   
   // NEW
   const { userId, session, authMethod } = await getHybridAuth(request);
   ```

3. **Update error responses**:
   ```typescript
   // OLD
   return NextResponse.json({ error: 'Du måste vara inloggad' }, { status: 401 });
   
   // NEW
   return NextResponse.json(AUTH_RESPONSES.UNAUTHENTICATED, { status: AUTH_RESPONSES.UNAUTHENTICATED.status });
   ```

## Testing Each Migration

```bash
# Test with cookies (standard)
curl -X GET "http://localhost:3000/api/endpoint" -H "Cookie: auth-token=..."

# Test with query parameter (join system)  
curl -X GET "http://localhost:3000/api/endpoint?userId=123"

# Test with Bearer token
curl -X GET "http://localhost:3000/api/endpoint" -H "Authorization: Bearer ..."
```

## Verification Checklist

- [ ] Import updated to use `@/lib/standard-auth`
- [ ] Uses `getHybridAuth()` instead of old auth methods  
- [ ] Standard error responses implemented
- [ ] Query parameter fallback works for join system
- [ ] Enhanced logging shows auth method used
- [ ] Existing functionality preserved 