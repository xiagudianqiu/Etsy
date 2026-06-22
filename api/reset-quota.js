/**
 * Vercel Cron Function: 每月 1 号重置配额
 *
 * 调用 Supabase 的 reset_monthly_quota 函数，将所有用户的
 * uploads_this_month / emails_this_month 归零。
 *
 * 触发：vercel.json cron（每月 1 号 UTC 16:00 = 北京 00:00）
 * 手动：GET /api/reset-quota?token=CRON_SECRET
 */
import { getSupabaseAdmin } from './_lib/supabase.js';

export default async function handler(req, res) {
  const authHeader = req.headers.authorization || '';
  const tokenParam = req.query.token;
  const secret = process.env.CRON_SECRET;

  const authorized = (secret && authHeader === `Bearer ${secret}`)
    || (secret && tokenParam === secret)
    || !secret;

  if (!authorized) {
    return res.status(401).json({ error: '未授权' });
  }

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.rpc('reset_monthly_quota');

    if (error) {
      return res.status(500).json({ error: '重置失败：' + error.message });
    }

    return res.status(200).json({
      ok: true,
      message: '配额已重置',
      resetAt: new Date().toISOString()
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
