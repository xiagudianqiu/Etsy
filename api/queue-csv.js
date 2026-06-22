/**
 * Vercel Serverless Function: 入队 CSV（多用户版）
 *
 * 接收前端上传的 CSV，验证用户身份和配额，写入 mail_queue 表。
 * 由 Vercel Cron 每天 23:00 批量发送。
 *
 * POST /api/queue-csv
 * Headers: Authorization: Bearer <supabase_access_token>
 * Body: { filename, csvContent, summary }
 */
import { getSupabaseAdmin, getUserFromRequest } from './_lib/supabase.js';

const EMAIL_QUOTA = 31;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // 1. 验证用户
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: '未登录或 token 已过期' });
    }

    const { filename, csvContent, summary } = req.body || {};
    if (!filename || !csvContent) {
      return res.status(400).json({ error: '缺少 filename / csvContent' });
    }

    const admin = getSupabaseAdmin();

    // 2. 查询 profile，检查邮件开关 + 配额
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('mail_enabled, mail_to, emails_this_month')
      .eq('id', user.id)
      .single();

    if (profileErr) {
      return res.status(500).json({ error: '读取用户资料失败：' + profileErr.message });
    }

    if (!profile.mail_enabled) {
      return res.status(400).json({ error: '邮件备份未开启' });
    }
    if (!profile.mail_to) {
      return res.status(400).json({ error: '请先在设置中填入收件邮箱' });
    }
    if ((profile.emails_this_month || 0) >= EMAIL_QUOTA) {
      return res.status(429).json({
        error: `本月邮件配额已用完（${EMAIL_QUOTA} 封），下月 1 号自动重置`
      });
    }

    // 3. 入队（按 send_date 分组，每天 23:00 cron 处理）
    const sendDate = new Date().toISOString().slice(0, 10);  // YYYY-MM-DD

    const { error: insertErr } = await admin.from('mail_queue').insert({
      user_id: user.id,
      to_email: profile.mail_to,
      send_date: sendDate,
      filename,
      csv_content: csvContent,
      summary: summary || {}
    });

    if (insertErr) {
      return res.status(500).json({ error: '入队失败：' + insertErr.message });
    }

    return res.status(200).json({
      ok: true,
      queued: true,
      sendAt: `${sendDate} 23:00 (北京时间)`,
      message: `已暂存，将于今晚 23:00 与其他文件一起发送到 ${profile.mail_to}`
    });
  } catch (err) {
    console.error('Queue CSV error:', err);
    return res.status(500).json({ error: err.message || '入队失败' });
  }
}
