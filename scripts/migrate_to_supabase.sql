-- =========================================
-- MIGRATION SCRIPT: SQLite -> Supabase
-- Splitty App - Schema Only (No Data)
-- =========================================
-- Run this in Supabase SQL Editor to create the schema

-- =========================================
-- 1. ENABLE UUID EXTENSION (for future use)
-- =========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- 2. CREATE TABLES (in dependency order)
-- =========================================

-- Table: blocked_token (JWT blocklist)
CREATE TABLE blocked_token (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(120) NOT NULL UNIQUE,
    blocked_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table: user
CREATE TABLE "user" (
    id SERIAL PRIMARY KEY,
    username VARCHAR(120) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password VARCHAR NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Table: "group"
CREATE TABLE "group" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

-- Table: group_member
CREATE TABLE group_member (
    id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Table: invitation
CREATE TABLE invitation (
    id SERIAL PRIMARY KEY,
    email VARCHAR(120) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    group_id INTEGER NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMP
);

-- Table: expense
CREATE TABLE expense (
    id SERIAL PRIMARY KEY,
    description VARCHAR(255) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT '$',
    date TIMESTAMP NOT NULL DEFAULT NOW(),
    group_id INTEGER NOT NULL REFERENCES "group"(id) ON DELETE CASCADE,
    paid_by INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    receipt_url VARCHAR(500)
);

-- Table: expense_participant
CREATE TABLE expense_participant (
    id SERIAL PRIMARY KEY,
    expense_id INTEGER NOT NULL REFERENCES expense(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    amount_owed NUMERIC(10, 2) NOT NULL DEFAULT 0
);

-- Table: friendship
CREATE TABLE friendship (
    id SERIAL PRIMARY KEY,
    requester_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    addressee_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(requester_id, addressee_id)
);

-- Table: friend_invitation
CREATE TABLE friend_invitation (
    id SERIAL PRIMARY KEY,
    inviter_id INTEGER NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    email VARCHAR(120) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Table: user_group (N:N intermediate - optional, already covered by group_member)
-- Note: This table exists in models.py but isn't actively used in relationships

-- =========================================
-- 3. CREATE INDEXES (for performance)
-- =========================================

CREATE INDEX idx_group_member_user ON group_member(user_id);
CREATE INDEX idx_group_member_group ON group_member(group_id);
CREATE INDEX idx_invitation_token ON invitation(token);
CREATE INDEX idx_expense_group ON expense(group_id);
CREATE INDEX idx_expense_paid_by ON expense(paid_by);
CREATE INDEX idx_expense_participant_expense ON expense_participant(expense_id);
CREATE INDEX idx_expense_participant_user ON expense_participant(user_id);
CREATE INDEX idx_friendship_requester ON friendship(requester_id);
CREATE INDEX idx_friendship_addressee ON friendship(addressee_id);
CREATE INDEX idx_friend_invitation_token ON friend_invitation(token);
CREATE INDEX idx_blocked_token_jti ON blocked_token(jti);

-- =========================================
-- 4. ENABLE ROW LEVEL SECURITY (RLS)
-- =========================================

ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "group" ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_participant ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendship ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_invitation ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_token ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 5. RLS POLICIES (basic - adjust as needed)
-- =========================================

-- Users can see all users (needed for search)
CREATE POLICY "Users are viewable by everyone" ON "user"
    FOR SELECT USING (true);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile" ON "user"
    FOR UPDATE USING (auth.uid() = id);

-- Groups are visible to members only
CREATE POLICY "Groups visible to members" ON "group"
    FOR SELECT USING (
        id IN (SELECT group_id FROM group_member WHERE user_id = auth.uid())
    );

-- Expenses visible to group members
CREATE POLICY "Expenses visible to group members" ON expense
    FOR SELECT USING (
        group_id IN (SELECT group_id FROM group_member WHERE user_id = auth.uid())
    );

-- =========================================
-- 6. STORAGE BUCKET FOR RECEIPTS
-- =========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'receipts',
    'receipts',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'application/pdf']
);

-- =========================================
-- 7. NEXT: Update your .env file
-- =========================================
-- See supabase_migration_guide.md for environment variables
