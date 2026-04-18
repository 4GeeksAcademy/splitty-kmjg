# Supabase Migration Guide for Splitty

## Prerequisites
1. Create a Supabase project at https://app.supabase.com
2. Get your project reference ID from Project Settings

---

## Step 1: Run Schema Migration

1. Go to Supabase SQL Editor: `Project Settings -> SQL Editor`
2. Copy and paste the contents of `scripts/migrate_to_supabase.sql`
3. Click **Run** to create all tables and indexes

---

## Step 2: Configure Environment Variables

Copy `.env.supabase.example` to `.env` and fill in:

```bash
# From Supabase Dashboard -> Project Settings -> Configuration -> Database
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# From Supabase Dashboard -> Project Settings -> API
JWT_SECRET_KEY="[your-jwt-secret]"
```

---

## Step 3: Update SQLAlchemy Connection

The current `app.py` already supports `DATABASE_URL`. Just ensure your `.env` has:

```bash
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"
```

**Important:** SQLAlchemy needs `postgresql://` prefix (not `postgres://`). The app.py code at line 64 already handles this conversion.

---

## Step 4: Supabase Auth (JWT)

### Option A: Use Supabase Auth (Recommended)
If you want to use Supabase's built-in auth system instead of Flask-JWT:

1. In Supabase Dashboard, enable **Email** provider in Authentication
2. Update the auth flow to use Supabase Client
3. Replace `flask-jwt-extended` with `@supabase/supabase-js` on frontend

### Option B: Keep Flask-JWT (Current)
Your current JWT setup can continue working with Supabase if:
- You set `JWT_SECRET_KEY` in `.env` to match Supabase's JWT secret
- Or generate your own secret and configure Supabase to use it

To get Supabase JWT Secret:
```
Supabase Dashboard -> Project Settings -> API
Look for: "JWT SECRET"
```

---

## Step 5: Supabase Storage (for Receipts)

### Option A: Keep Cloudinary (Current)
No changes needed - Cloudinary is already configured.

### Option B: Migrate to Supabase Storage

1. Enable Storage in Supabase Dashboard
2. Create a bucket called `receipts` (or run the SQL in migrate_to_supabase.sql)
3. Install Supabase client:
```bash
pip install supabase
```

4. Update `routes.py` receipt upload endpoint:
```python
from supabase import create_client, Client

supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# Replace cloudinary.uploader.upload with:
upload_result = supabase.storage.from_("receipts").upload(
    f"receipts/{filename}",
    file.read(),
    {"content_type": file.content_type}
)
receipt_url = supabase.storage.from_("receipts").get_public_url(upload_result.get("Key"))
```

---

## Step 6: Test the Connection

```bash
cd C:\Projects\Splitty\splitty-kmjg
python -c "from src.api.models import db; from src.app import app; 
with app.app_context(): 
    db.engine.execute('SELECT 1')"
print("Connection successful!")
```

---

## Troubleshooting

### "relation does not exist"
- Make sure you ran the SQL migration script in Supabase SQL Editor

### "password authentication failed"
- Check your DATABASE_URL has the correct password
- Project reference: `db.YOUR_PROJECT_REF.supabase.co`

### "Invalid JWT"
- Verify JWT_SECRET_KEY matches Supabase dashboard
- Or generate a new secret and update Supabase settings

### Port 5432 blocked
- Supabase uses port 5432 for direct PostgreSQL connections
- Make sure your IP is whitelisted in Supabase -> Project Settings -> Database -> Connection Pooling

---

## Next Steps After Migration

1. Test all API endpoints
2. Enable Row Level Security (RLS) policies for production
3. Configure real-time subscriptions if needed
4. Set up regular database backups in Supabase
