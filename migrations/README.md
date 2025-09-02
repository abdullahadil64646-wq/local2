# Supabase Migration Guide for Grocery Store Platform

This directory contains migration instructions and SQL scripts to migrate from MongoDB to Supabase PostgreSQL.

## Migration Files

1. `001_database_schema.sql` - Core database tables and schema
2. `002_authentication_setup.md` - Google OAuth and authentication configuration
3. `003_edge_functions.md` - Supabase Edge Functions setup
4. `004_storage_buckets.md` - File storage configuration
5. `005_row_level_security.sql` - Security policies
6. `006_indexes_and_triggers.sql` - Performance optimizations

## Migration Process

### Step 1: Setup Supabase Project
1. Create a new project at https://supabase.com
2. Note down your project URL and API keys
3. Update `.env` file with Supabase credentials

### Step 2: Database Migration
```bash
# Run SQL files in order
psql -h db.your-project.supabase.co -U postgres -d postgres -f migrations/001_database_schema.sql
psql -h db.your-project.supabase.co -U postgres -d postgres -f migrations/005_row_level_security.sql
psql -h db.your-project.supabase.co -U postgres -d postgres -f migrations/006_indexes_and_triggers.sql
```

### Step 3: Authentication Setup
Follow instructions in `002_authentication_setup.md`

### Step 4: Edge Functions
Follow instructions in `003_edge_functions.md`

### Step 5: Storage Configuration
Follow instructions in `004_storage_buckets.md`

### Step 6: Data Migration
Use the provided Node.js scripts to migrate data from MongoDB to Supabase:
```bash
npm run migrate:data
```

## Important Notes

- Current system uses MongoDB - these migrations are for future Supabase integration
- Test all migrations in development environment first
- Backup existing data before migration
- Update frontend to use Supabase client instead of direct API calls

## Environment Variables

Add these to your `.env` file:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```