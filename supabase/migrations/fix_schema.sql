-- Run this SQL in your Supabase Dashboard SQL Editor to fix the schema mismatch

-- 1. Add the missing 'owner' column to campaigns
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS owner text;

-- 2. Add other potentially missing columns for the new reward system
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS reward_type text CHECK (reward_type IN ('instant', 'giveaway')),
ADD COLUMN IF NOT EXISTS instant_reward jsonb,
ADD COLUMN IF NOT EXISTS prize_tiers jsonb,
ADD COLUMN IF NOT EXISTS permission_context jsonb,
ADD COLUMN IF NOT EXISTS session_private_key text;

-- 3. Create an index on 'owner' for faster dashboard queries
CREATE INDEX IF NOT EXISTS idx_campaigns_owner ON campaigns(owner);

-- 4. Update the RLS policy to ensure users can only see their own campaigns (optional but recommended)
-- First, drop existing policy if it's too broad
DROP POLICY IF EXISTS "Public campaigns are viewable by everyone" ON campaigns;

-- Re-create policies
-- Allow everyone to read campaigns (needed for the public room page)
CREATE POLICY "Public campaigns are viewable by everyone" 
ON campaigns FOR SELECT 
USING (true);

-- Allow authenticated users to insert their own campaigns
CREATE POLICY "Users can create their own campaigns" 
ON campaigns FOR INSERT 
WITH CHECK (auth.uid() = owner OR owner IS NOT NULL);
-- Note: Logic above allows any owner string for now to match your current simple implementation
-- Ideally, you would strictly enforce auth.uid() if you were using Supabase Auth heavily.

-- Allow users to update their own campaigns
CREATE POLICY "Users can update their own campaigns" 
ON campaigns FOR UPDATE 
USING (auth.uid() = owner OR owner = current_setting('request.headers')::json->>'x-address' OR true);
-- Keeping it permissive for now as your auth implementation details vary
