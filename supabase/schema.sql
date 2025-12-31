-- Create Campaigns table
create table campaigns (
  id text primary key, -- slug or manual ID
  title text not null,
  description text,
  start_date timestamp with time zone not null,
  end_date timestamp with time zone not null,
  prize_amount text,
  prize_pool numeric,
  prize_type text default 'ETH',
  reward_type text check (reward_type in ('instant', 'giveaway')),
  instant_reward jsonb, -- Stores {amountPerWinner, numberOfWinners}
  prize_tiers jsonb, -- Stores array of tiers
  tasks jsonb, -- Stores array of task definitions
  timeline text,
  clicks int default 0,
  joined int default 0, -- participant count (denormalized for speed, or can use count(*))
  participants int default 0, -- duplicate of joined?
  progress int default 0,
  status text default 'active',
  created_at timestamp with time zone default now(),
  permission_context jsonb, -- For advanced permissions
  session_private_key text, -- Encrypted session key (handle with care!)
  owner text -- Wallet address of the campaign creator
);

-- Create Participants (Submissions) table
create table participants (
  id uuid default gen_random_uuid() primary key,
  campaign_id text references campaigns(id) on delete cascade,
  wallet_address text not null,
  email text,
  twitter text,
  tasks_completed int default 0,
  total_tasks int default 0,
  submitted_at timestamp with time zone default now(),
  status text default 'pending', -- pending, verified, rejected
  reward_paid boolean default false,
  reward_amount text,
  
  unique(campaign_id, wallet_address) -- One entry per wallet per campaign
);

-- Create RLS policies (Optional but recommended)
alter table campaigns enable row level security;
alter table participants enable row level security;

-- Allow read access to everyone for campaigns
create policy "Public campaigns are viewable by everyone"
  on campaigns for select
  using ( true );

-- Allow insert access for creating campaigns (restrict this in prod!)
create policy "Anyone can create campaigns"
  on campaigns for insert
  with check ( true );

-- Participants RLS
create policy "Participants can view their own submissions"
  on participants for select
  using ( true ); -- Simplified for demo, usually auth.uid() or similar

create policy "Anyone can join"
  on participants for insert
  with check ( true );
