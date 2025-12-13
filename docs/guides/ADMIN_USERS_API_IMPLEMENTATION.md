# Backend Edge Function - Admin User Management API

## 🎯 Overview

This implementation creates a secure backend edge function for admin user management, following the security best practice of moving `auth.admin` operations from the frontend to the backend.

## 🔧 What Was Changed

### Before (Frontend Direct Access)
```javascript
// ❌ Frontend was directly calling admin API
const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
```

### After (Backend Edge Function)
```javascript
// ✅ Frontend now calls secure backend API
const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-users`, {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});
```

## 📁 Files Created/Modified

### 1. Backend Edge Function
**File:** `supabase/functions/admin-users/index.ts`

**Features:**
- ✅ Uses `SERVICE_ROLE_KEY` securely on backend
- ✅ Validates admin authentication via JWT tokens
- ✅ Provides REST API endpoints for user management
- ✅ Includes proper error handling and CORS support

**API Endpoints:**
- `GET /functions/v1/admin-users` - List users with pagination and search
- `POST /functions/v1/admin-users` - Execute admin actions

**Supported Actions:**
- `promote-admin` - Promote user to admin role
- `demote-user` - Demote admin to regular user
- `create-profile` - Create user profile
- `delete-profile` - Delete user profile

### 2. Frontend Updates
**File:** `src/pages/UserManagement.jsx`

**Changes:**
- 🔄 Replaced direct `supabase.auth.admin` calls with secure API calls
- 🔄 Added proper authentication headers
- 🔄 Centralized API calls through `callAdminApi` helper function
- 🔄 Maintained all existing UI functionality

## 🛡️ Security Implementation

### Backend Security
```typescript
// 1. Service role key used only on backend
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// 2. Admin verification for every request
async function verifyAdminContext(authHeader: string | null): Promise<AdminContext | null> {
  // Verify user JWT token
  // Check admin role in profiles table
  // Return admin context or null
}

// 3. All operations require admin privileges
if (!adminContext) {
  return new Response('Brak uprawnień administratora', { status: 403 });
}
```

### Frontend Security
```javascript
// Always include user session token
const { data: { session } } = await supabase.auth.getSession();
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});
```

## 📊 API Usage Examples

### Frontend Implementation
```javascript
// List users
const response = await fetch('/functions/v1/admin-users', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});

// Promote user to admin
await fetch('/functions/v1/admin-users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    action: 'promote-admin',
    userId: 'user-uuid',
    fullName: 'Administrator Name'
  })
});
```

### Backend Edge Function
```typescript
// All operations use SERVICE_ROLE_KEY securely
const { data, error } = await supabaseAdmin.auth.admin.listUsers({
  page: 1,
  perPage: 50,
});

// Check admin permissions
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('id, role')
  .eq('id', user.id)
  .maybeSingle();

if (!profile || profile.role !== 'admin') {
  throw new Error('Brak uprawnień administratora');
}
```

## 🚀 Deployment Instructions

### 1. Deploy Edge Function
```bash
# Deploy to Supabase
supabase functions deploy admin-users

# Set environment variables (if needed)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 2. Test the Implementation
```bash
# Run the test script
node test-admin-users-api.js
```

### 3. Update Environment Variables
Ensure these variables are set:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

## 🔍 Testing

### Test Coverage
- ✅ Unauthorized access rejection
- ✅ Invalid action handling
- ✅ Admin permission validation
- ✅ Frontend integration

### Manual Testing
1. **Without Admin Token:** Should return 403 error
2. **With Admin Token:** Should return user list and allow management actions
3. **Frontend Integration:** UserManagement page should work normally

## 📈 Benefits

### Security
- 🔒 No service role key exposure to frontend
- 🔒 JWT-based admin verification
- 🔒 Centralized access control
- 🔒 Audit trail through edge function logs

### Performance
- ⚡ Reduced database queries (batch operations)
- ⚡ Better error handling and caching
- ⚡ Optimized pagination and search

### Maintainability
- 🧹 Single source of truth for admin operations
- 🧹 Easy to extend with new admin features
- 🧹 Better separation of concerns

## 🔧 Troubleshooting

### Common Issues
1. **"Brak uprawnień administratora"** - User doesn't have admin role
2. **401/403 errors** - Invalid or missing JWT token
3. **CORS errors** - Missing proper headers

### Debug Steps
1. Check user role in `profiles` table
2. Verify JWT token is valid
3. Check edge function logs: `supabase functions logs admin-users`
4. Ensure environment variables are set

## 📚 Related Files

- `supabase/functions/admin-users/index.ts` - Edge function implementation
- `src/pages/UserManagement.jsx` - Updated frontend component
- `test-admin-users-api.js` - Test script
- `supabase/functions/admin-console/index.ts` - Existing admin function (for reference)

---

**✅ Implementation Complete:** The admin user management now follows security best practices by moving sensitive operations to the backend while maintaining the same user experience.