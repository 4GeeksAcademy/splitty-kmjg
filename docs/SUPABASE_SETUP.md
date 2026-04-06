# Supabase Configuration Guide - Splitty

This document explains how to set up and connect your Splitty development environment to a Supabase PostgreSQL instance.

## 1. Supabase Project Setup

1.  Create a new project at [database.new](https://database.new).
2.  In the **SQL Editor**, create a new query and paste the content of [`scripts/migrate_to_supabase.sql`](../scripts/migrate_to_supabase.sql).
3.  Run the query. This will create all necessary tables, indexes, and a storage bucket for receipts.

## 2. Environment Variables (.env)

Add the following variables to your `.env` file (see `.env.example` for the template):

```env
# Supabase API (Dashboard -> Project Settings -> API)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Database (Dashboard -> Project Settings -> Database)
# Use the Connection String format: postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
DATABASE_URL=postgresql://postgres:your-password@db.your-ref.supabase.co:5432/postgres
```

## 3. Data Migration (Optional)

If you have existing data in a local `test.db` (SQLite), you can migrate it to Supabase using the provided script:

1.  Install dependencies:
    ```bash
    pip install psycopg2-binary python-dotenv
    ```
2.  Run the migration script:
    ```bash
    python scripts/migrate_data.py
    ```

## 4. Frontend Integration

The project includes a Supabase client initialized at `src/front/supabase.js`. You can import it to interact with Supabase features (Storage, Realtime, etc.):

```javascript
import { supabase } from './supabase';
```

## 5. Storage

A bucket named `receipts` is automatically created by the SQL script. This bucket is intended for storing expense receipts. Use the `supabase_client.py` on the backend or the JS client on the frontend to manage file uploads.
