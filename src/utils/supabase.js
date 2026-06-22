import { createClient } from '@supabase/supabase-js';

/**
 * Supabase 客户端
 *
 * 环境变量在 Vercel 部署时配置：
 *   VITE_SUPABASE_URL       - 项目 URL（https://xxx.supabase.co）
 *   VITE_SUPABASE_ANON_KEY  - 公开 key（受 RLS 保护，安全暴露给前端）
 *
 * 本地开发：复制 .env.example 为 .env.local，填入你的值
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    '⚠ Supabase 未配置。请设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 环境变量。\n' +
    '本地开发：复制 .env.example 为 .env.local 并填值。'
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storage: window.localStorage
      }
    })
  : null;
