# Google OAuth and Authentication Setup for Supabase

## Overview
This guide helps you set up Google OAuth authentication in your Supabase project for the grocery store platform.

## Step 1: Configure Google OAuth in Google Cloud Console

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: Web application
   - Name: Grocery Store Platform
   - Authorized JavaScript origins:
     ```
     http://localhost:3000
     https://your-domain.com
     ```
   - Authorized redirect URIs:
     ```
     https://your-project.supabase.co/auth/v1/callback
     ```

4. **Note down your credentials:**
   - Client ID
   - Client Secret

## Step 2: Configure Supabase Authentication

1. **Go to Supabase Dashboard**
   - Visit your project at https://supabase.com/dashboard

2. **Navigate to Authentication**
   - Go to "Authentication" > "Settings"
   - Click on "Auth Providers"

3. **Configure Google Provider**
   ```
   Google enabled: YES
   Client ID: [Your Google Client ID]
   Client Secret: [Your Google Client Secret]
   ```

4. **Update Site URL**
   - Set your site URL: `http://localhost:3000` (development)
   - For production: `https://your-domain.com`

5. **Configure Redirect URLs**
   ```
   http://localhost:3000/auth/callback
   https://your-domain.com/auth/callback
   ```

## Step 3: Update Frontend Authentication

Update your React app to use Supabase auth:

```javascript
// src/config/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

```javascript
// src/context/AuthContext.js
import { supabase } from '../config/supabase'

// Google Sign In
const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  })
  return { data, error }
}

// Sign Out
const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}
```

## Step 4: Environment Variables

Add these to your `.env` file:

```env
# Supabase
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key

# Google OAuth
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

## Step 5: Backend Integration

Update your backend to work with Supabase auth:

```javascript
// middleware/auth.js
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const { data: { user }, error } = await supabase.auth.getUser(token)
  
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' })
  }

  req.user = user
  next()
}
```

## Step 6: Database Triggers for User Management

Create database triggers to automatically manage user data:

```sql
-- Function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.created_at
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

## Step 7: Row Level Security (RLS)

Enable RLS for secure access:

```sql
-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policy for users to see their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

-- Policy for users to update their own data
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

## Testing Authentication

1. **Test Google Login**
   - Visit your app
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Verify user is created in Supabase

2. **Test API Calls**
   - Make authenticated requests
   - Verify JWT token validation
   - Check user permissions

## Troubleshooting

1. **Invalid Redirect URI**
   - Ensure all redirect URIs are added to Google Console
   - Check for typos in URLs

2. **CORS Issues**
   - Add your domain to Supabase CORS settings
   - Verify site URL configuration

3. **Token Verification Issues**
   - Check service role key permissions
   - Verify JWT configuration

## Security Best Practices

1. **Environment Variables**
   - Never expose service role key in frontend
   - Use anon key for frontend only

2. **Row Level Security**
   - Always enable RLS on sensitive tables
   - Test policies thoroughly

3. **Token Management**
   - Implement token refresh logic
   - Handle expired tokens gracefully