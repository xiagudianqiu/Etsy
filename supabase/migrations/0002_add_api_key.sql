-- ===================================================================
-- 迁移 0002: 给 profiles 表加 evolink_api_key 字段（AI 生图模块）
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ===================================================================

-- 加字段（存用户的 EvoLink API Key，用于 GPT-Image-2 生图）
alter table profiles
  add column if not exists evolink_api_key text;

-- 注：该字段受现有 RLS 策略保护（users can read/update own profile），
-- 用户只能读写自己的 Key，无法看到别人的。

-- 加注释
comment on column profiles.evolink_api_key is '用户的 EvoLink API Key（GPT-Image-2 生图用），仅本人可见';
