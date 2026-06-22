-- ===================================================================
-- Etsy Profit Dashboard - 多用户改造数据库迁移脚本
-- 在 Supabase Dashboard → SQL Editor 中执行此脚本
-- ===================================================================

-- ========================================
-- 1. profiles 表（用户资料 + 配置 + 配额）
-- ========================================
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  created_at timestamptz default now(),

  -- 配额计数（每月重置）
  uploads_this_month int default 0,
  emails_this_month int default 0,
  quota_reset_at timestamptz default date_trunc('month', now() + interval '1 month'),

  -- 用户配置（替代旧 LocalStorage 里的 etsyData.config）
  config jsonb default '{
    "products": {},
    "exchangeRate": 7.2,
    "displayCurrency": "USD",
    "costCurrency": "CNY",
    "rates": {"USD":1,"CNY":7.2,"EUR":0.92,"GBP":0.79,"JPY":156,"HKD":7.8,"SGD":1.34}
  }'::jsonb,

  -- 邮件备份设置
  mail_enabled boolean default false,
  mail_to text
);

-- ========================================
-- 2. months 表（每月数据，替代 LocalStorage.months）
-- ========================================
create table if not exists months (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  month_key text not null,           -- "2026-04"
  filename text,
  imported_at timestamptz default now(),
  summary jsonb not null,            -- 解析后的 summary 对象
  orders jsonb not null,             -- orders 数组
  unique(user_id, month_key)         -- 同一用户一个月只能有一份（再次导入覆盖）
);

create index if not exists months_user_idx on months(user_id);
create index if not exists months_user_month_idx on months(user_id, month_key);

-- ========================================
-- 3. mail_queue 表（邮件队列，每天 23:00 cron 处理）
-- ========================================
create table if not exists mail_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  to_email text not null,
  send_date date not null,           -- 待发送日期（每天 23:00 处理同日的）
  filename text not null,
  csv_content text not null,         -- 原始 CSV 内容
  summary jsonb,                     -- 摘要：{totalSales, profit, orderCount}
  queued_at timestamptz default now(),
  sent_at timestamptz                -- 已发送的标记（null = 待发）
);

create index if not exists mail_queue_pending_idx on mail_queue(send_date, sent_at);
create index if not exists mail_queue_user_idx on mail_queue(user_id);

-- ========================================
-- 4. 行级安全（RLS）— 数据隔离的关键
-- ========================================

-- profiles
alter table profiles enable row level security;

drop policy if exists "users can read own profile" on profiles;
create policy "users can read own profile" on profiles
  for select using (auth.uid() = id);

drop policy if exists "users can insert own profile" on profiles;
create policy "users can insert own profile" on profiles
  for insert with check (auth.uid() = id);

drop policy if exists "users can update own profile" on profiles;
create policy "users can update own profile" on profiles
  for update using (auth.uid() = id);

-- months
alter table months enable row level security;

drop policy if exists "users can crud own months" on months;
create policy "users can crud own months" on months
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- mail_queue
alter table mail_queue enable row level security;

drop policy if exists "users can insert own mail" on mail_queue;
create policy "users can insert own mail" on mail_queue
  for insert with check (auth.uid() = user_id);

drop policy if exists "users can read own mail" on mail_queue;
create policy "users can read own mail" on mail_queue
  for select using (auth.uid() = user_id);

-- 注：cron-send 函数会用 service_role key 绕过 RLS 处理所有用户队列

-- ========================================
-- 5. 触发器：注册后自动创建 profile
-- ========================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ========================================
-- 6. 工具函数：检查配额
-- ========================================
create or replace function check_upload_quota(p_user_id uuid, p_limit int default 30)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select uploads_this_month into v_count from profiles where id = p_user_id;
  return coalesce(v_count, 0) < p_limit;
end;
$$;

create or replace function increment_upload_count(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update profiles set uploads_this_month = uploads_this_month + 1 where id = p_user_id;
end;
$$;

create or replace function check_email_quota(p_user_id uuid, p_limit int default 31)
returns boolean
language plpgsql
security definer
as $$
declare
  v_count int;
begin
  select emails_this_month into v_count from profiles where id = p_user_id;
  return coalesce(v_count, 0) < p_limit;
end;
$$;

create or replace function increment_email_count(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
begin
  update profiles set emails_this_month = emails_this_month + 1 where id = p_user_id;
end;
$$;

-- ========================================
-- 7. 月度重置函数（由 cron 每月 1 号调用）
-- ========================================
create or replace function reset_monthly_quota()
returns void
language plpgsql
security definer
as $$
begin
  update profiles
    set uploads_this_month = 0,
        emails_this_month = 0,
        quota_reset_at = date_trunc('month', now() + interval '1 month');
end;
$$;

-- ========================================
-- 完成
-- ========================================
-- 执行后请到 Authentication → Settings 检查以下选项：
--   - Enable email confirmations: 可选，建议关闭以简化注册
--   - Site URL: 设为你的 Vercel 部署地址
-- ========================================
