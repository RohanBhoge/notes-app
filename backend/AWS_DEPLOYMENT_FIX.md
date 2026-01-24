# AWS Beanstalk Cookie Authentication Fix

## Problem
After successful login on AWS Beanstalk, subsequent API calls return 401 Unauthorized even though login succeeded.

## Root Causes

### 1. Hardcoded CORS Origin
**File:** `app.js`
**Issue:** CORS origin hardcoded to `http://localhost:5173`
**Impact:** Cookies from AWS Beanstalk domain blocked by browser

### 2. Cookie SameSite Setting
**File:** `authController.js`
**Issue:** `sameSite: 'strict'` blocks cross-site cookies
**Impact:** Cookies not sent with requests from different domain

## Solutions Applied

### ✅ Fix 1: Dynamic CORS Configuration

**Before:**
```javascript
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
```

**After:**
```javascript
const allowedOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
```

### ✅ Fix 2: Production Cookie Settings

**Before:**
```javascript
sameSite: 'strict'  // Blocks cross-domain cookies
```

**After:**
```javascript
sameSite: isProduction ? 'none' : 'lax'  // Allows cross-domain in production
secure: isProduction  // HTTPS required with sameSite:'none'
```

## Environment Variables Required

Add to your AWS Beanstalk environment:

```bash
NODE_ENV=production
CORS_ORIGIN=https://your-frontend-domain.com
```

**For multiple origins:**
```bash
CORS_ORIGIN=https://your-frontend.com,https://www.your-frontend.com
```

## Cookie Settings Explanation

| Setting | Development | Production |
|---------|-------------|------------|
| `sameSite` | `'lax'` | `'none'` |
| `secure` | `false` | `true` |
| Result | Works on localhost | Works cross-domain |

**Why `sameSite: 'none'` in production?**
- Frontend: `https://your-frontend.com`
- Backend: `https://your-api.elasticbeanstalk.com`
- These are **different domains** → requires `sameSite: 'none'`
- `sameSite: 'none'` requires `secure: true` (HTTPS only)

## Testing

1. **Set environment variable on AWS:**
   ```bash
   CORS_ORIGIN=https://your-frontend-domain.com
   NODE_ENV=production
   ```

2. **Redeploy backend to Beanstalk**

3. **Test login flow:**
   - Login should succeed ✓
   - Cookies should be set ✓
   - Subsequent API calls should work with cookies ✓

## Security Notes

✅ **httpOnly** - Prevents JavaScript access (XSS protection)
✅ **secure** - HTTPS only in production
✅ **sameSite: 'none'** - Required for cross-domain but safe with HTTPS
✅ **CORS validation** - Only allowed origins can make requests

## Local Development

No changes needed! Still works on `http://localhost:5173` with `sameSite: 'lax'`
