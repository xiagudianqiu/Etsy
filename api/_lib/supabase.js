/**
 * 服务端 Supabase 客户端（用 service_role key 绕过 RLS）
 * 仅在 Vercel functions 内部使用，不暴露给前端
 */
import { createClient } from '@supabase/supabase-js';

let _client = null;

export function getSupabaseAdmin() {
  if (_client) return _client;

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('缺少 Supabase 配置：VITE_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY');
  }

  _client = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
  return _client;
}

/**
 * 从请求 header 提取用户 access token 并验证身份
 * 返回 user 对象，失败返回 null
 */
export async function getUserFromRequest(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}
