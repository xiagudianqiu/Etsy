-- ===================================================================
-- 迁移 0002: AI 生图模块 - 模型配置
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ===================================================================

-- 加字段：存用户预设的多套 AI 模型配置（JSON 数组）
-- 结构：[{id, label, provider, model, apiKey, endpoint}]
alter table profiles
  add column if not exists ai_models jsonb default '[]'::jsonb;

-- 兼容：如果之前有 evolink_api_key 字段，迁移到 ai_models 数组
-- （首次执行此脚本时 evolink_api_key 不存在，会跳过）
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'profiles' and column_name = 'evolink_api_key'
  ) then
    update profiles
    set ai_models = case
      when evolink_api_key is not null and evolink_api_key != '' then
        jsonb_build_array(jsonb_build_object(
          'id', gen_random_uuid()::text,
          'label', 'EvoLink GPT-Image-2',
          'provider', 'evolink',
          'model', 'gpt-image-2',
          'apiKey', evolink_api_key,
          'endpoint', 'https://api.evolink.ai/v1/images/generations'
        ))
      else '[]'::jsonb
    end
    where ai_models = '[]'::jsonb;

    -- 迁移完成后删除旧字段
    alter table profiles drop column if exists evolink_api_key;
  end if;
end $$;

comment on column profiles.ai_models is '用户预设的 AI 模型配置数组（含 API Key），仅本人可见';
