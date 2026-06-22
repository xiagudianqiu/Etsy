/**
 * Vercel Cron Function: 每天 23:00 批量发送暂存的 CSV（多用户版）
 *
 * 1. 从 mail_queue 读取今日待发记录（按 user_id + to_email 分组）
 * 2. 每组打包成多附件邮件发到用户邮箱
 * 3. 发送成功后标记 sent_at + 累加 emails_this_month
 *
 * 触发：Vercel Cron 每天 23:00（vercel.json: 0 15 * * * UTC）
 * 手动：GET /api/cron-send?token=CRON_SECRET
 */
import { getSupabaseAdmin } from './_lib/supabase.js';

export default async function handler(req, res) {
  // 鉴权：cron header 或手动 token
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
    const today = new Date().toISOString().slice(0, 10);

    // 1. 读取今日待发记录
    const { data: queue, error: qErr } = await admin
      .from('mail_queue')
      .select('*')
      .eq('send_date', today)
      .is('sent_at', null)
      .order('queued_at', { ascending: true });

    if (qErr) {
      return res.status(500).json({ error: '读取队列失败：' + qErr.message });
    }

    if (!queue || queue.length === 0) {
      return res.status(200).json({ ok: true, message: '今日无待发邮件', sent: 0 });
    }

    // 2. 按 user_id + to_email 分组
    const groups = {};
    queue.forEach(item => {
      const key = `${item.user_id}:${item.to_email}`;
      if (!groups[key]) groups[key] = { user_id: item.user_id, to_email: item.to_email, items: [] };
      groups[key].items.push(item);
    });

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    if (!apiKey) {
      return res.status(500).json({ error: '服务器未配置 RESEND_API_KEY' });
    }

    const results = [];

    // 3. 逐组发送
    for (const [key, group] of Object.entries(groups)) {
      try {
        const attachments = group.items.map(it => ({
          filename: it.filename,
          content: Buffer.from(it.csv_content, 'utf-8').toString('base64')
        }));

        // 合计摘要
        const totalSales = group.items.reduce((s, it) => s + (it.summary?.totalSales || 0), 0);
        const totalOrders = group.items.reduce((s, it) => s + (it.summary?.orderCount || 0), 0);
        const totalProfit = group.items.reduce((s, it) => s + (it.summary?.profit || 0), 0);

        const fileList = group.items.map(it =>
          `<li style="padding:4px 0"><strong>${it.filename}</strong> · 销售 $${(it.summary?.totalSales || 0).toFixed(2)} · ${it.summary?.orderCount || 0} 单 · 利润 $${(it.summary?.profit || 0).toFixed(2)}${it.summary?.user_email ? ` · 用户 ${it.summary.user_email}` : ''}</li>`
        ).join('');

        const html = `
          <div style="font-family:'PingFang SC','Microsoft YaHei',sans-serif;color:#333;max-width:600px;margin:0 auto;padding:24px">
            <h1 style="color:#1a1612;border-bottom:3px solid #d4a056;padding-bottom:12px">Etsy 数据每日备份</h1>
            <p>今日共 <strong>${group.items.length}</strong> 个 CSV 文件已自动备份，详见附件。</p>
            <h3 style="color:#d4a056;margin-top:24px">文件清单</h3>
            <ul style="padding-left:20px;line-height:1.8">${fileList}</ul>
            <h3 style="color:#d4a056;margin-top:24px">今日合计</h3>
            <table style="border-collapse:collapse;font-size:14px">
              <tr><td style="padding:6px 16px 6px 0;color:#888">总销售额</td><td style="padding:6px 0;font-weight:600">$${totalSales.toFixed(2)}</td></tr>
              <tr><td style="padding:6px 16px 6px 0;color:#888">总订单数</td><td style="padding:6px 0;font-weight:600">${totalOrders}</td></tr>
              <tr><td style="padding:6px 16px 6px 0;color:#888">总净利润</td><td style="padding:6px 0;font-weight:600;color:#d4a056">$${totalProfit.toFixed(2)}</td></tr>
            </table>
            <p style="margin-top:32px;color:#888;font-size:12px;border-top:1px solid #eee;padding-top:16px">
              此邮件由 Etsy Profit Dashboard 每日定时任务自动发送（${new Date().toLocaleString('zh-CN')}）。
            </p>
          </div>
        `;

        // 调 Resend
        const resendResp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [group.to_email],
            subject: `Etsy 每日备份 · ${today} · ${group.items.length} 个文件`,
            html,
            attachments
          })
        });

        if (!resendResp.ok) {
          const errData = await resendResp.json().catch(() => ({}));
          results.push({ email: group.to_email, status: 'error', error: errData.message || errData.error });
          continue;
        }

        // 4. 标记已发送 + 累加配额
        const sentIds = group.items.map(it => it.id);
        await admin.from('mail_queue').update({ sent_at: new Date().toISOString() }).in('id', sentIds);
        await admin.rpc('increment_email_count', { p_user_id: group.user_id });

        results.push({ email: group.to_email, status: 'sent', count: group.items.length });
      } catch (e) {
        results.push({ email: group.to_email, status: 'error', error: e.message });
      }
    }

    const sentCount = results.filter(r => r.status === 'sent').length;
    return res.status(200).json({
      ok: true,
      sent: sentCount,
      total: Object.keys(groups).length,
      results
    });
  } catch (err) {
    console.error('Cron send error:', err);
    return res.status(500).json({ error: err.message });
  }
}
