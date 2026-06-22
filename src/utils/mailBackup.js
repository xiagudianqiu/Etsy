/**
 * 邮件备份工具（多用户版）
 *
 * 前端调 /api/queue-csv 时附带 Supabase access_token，
 * 后端验证身份后入队到 Supabase mail_queue 表。
 * 每天 23:00 由 cron 批量发送。
 *
 * 用户的邮件开关 / 收件邮箱存在 Supabase profiles 表，
 * 不再用 LocalStorage（避免跨设备不同步）。
 */
import { supabase } from './supabase';

/**
 * 发送 CSV 到队列（多用户版，需登录）
 */
export async function sendCSVByEmail(file, summary) {
  if (!supabase) return { ok: false, error: 'Supabase 未配置' };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: '未登录' };

    const csvContent = await file.text();
    const resp = await fetch('/api/queue-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        filename: file.name,
        csvContent,
        summary
      })
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      return { ok: false, error: data.error || `HTTP ${resp.status}` };
    }

    const data = await resp.json();
    return { ok: true, queued: true, sendAt: data.sendAt };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * 测试入队（发一个虚拟 CSV 占位）
 */
export async function sendTestEmail() {
  if (!supabase) return { ok: false, error: 'Supabase 未配置' };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, error: '未登录' };

    const resp = await fetch('/api/queue-csv', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        filename: `test-${Date.now()}.csv`,
        csvContent: 'Test,Hello\n1,This is a test',
        summary: { totalSales: 0, profit: 0, orderCount: 0 }
      })
    });

    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      return { ok: false, error: data.error || `HTTP ${resp.status}` };
    }
    const data = await resp.json();
    return { ok: true, sendAt: data.sendAt };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
