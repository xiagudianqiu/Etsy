import { useState } from 'react';
import { TrendingUp, Mail, Lock, ArrowRight, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/**
 * 登录/注册页 — 暖金风格
 */
export default function AuthPage() {
  const { signIn, signUp, configured } = useAuth();
  const [mode, setMode] = useState('signin');  // signin | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        await signUp(email, password);
        setSuccess('注册成功！请登录。');
        setMode('signin');
      } else {
        await signIn(email, password);
        // onAuthStateChange 会自动更新 user
      }
    } catch (err) {
      // 友好错误提示
      let msg = err.message || '操作失败';
      if (msg.includes('Invalid login credentials')) msg = '邮箱或密码错误';
      if (msg.includes('already registered')) msg = '该邮箱已注册，请直接登录';
      if (msg.includes('Password should be at least')) msg = '密码至少 6 位';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Supabase 未配置提示
  if (!configured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
        <div className="card max-w-md w-full p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--gold-soft)] flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-[var(--gold)]" />
          </div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">未配置 Supabase</h2>
          <p className="text-sm text-[var(--text-tertiary)] mb-4">
            多用户功能需要 Supabase 数据库支持。请按 README 部署指南配置后使用。
          </p>
          <div className="text-left text-xs bg-[var(--bg-elevated)] rounded-lg p-4 text-[var(--text-tertiary)] font-mono">
            <div>1. 注册 supabase.com 创建项目</div>
            <div>2. SQL Editor 跑 supabase/migrations/0001_init.sql</div>
            <div>3. 复制 .env.example → .env.local 填值</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6 relative overflow-hidden">
      {/* 背景光晕 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--gold-soft)] rounded-full blur-[140px] opacity-60" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#d4a056] to-[#8a6630] shadow-[0_4px_16px_rgba(212,160,86,0.3)] mb-4">
            <TrendingUp className="w-7 h-7 text-[#1a1208]" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Etsy Profit</h1>
          <p className="text-sm text-[var(--text-tertiary)] mt-1">Etsy 卖家利润分析平台</p>
        </div>

        <div className="card p-7 fade-in">
          {/* 模式切换 */}
          <div className="flex gap-1 p-1 mb-6 rounded-lg bg-[var(--bg-elevated)]">
            <button
              onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signin'
                  ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                mode === 'signup'
                  ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)]'
                  : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 邮箱 */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--gold)] placeholder-[var(--text-tertiary)]"
                />
              </div>
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">密码</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="至少 6 位"
                  className="w-full pl-10 pr-3 py-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--gold)] placeholder-[var(--text-tertiary)]"
                />
              </div>
            </div>

            {/* 错误/成功提示 */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[var(--down)] text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[rgba(74,222,128,0.08)] border border-[rgba(74,222,128,0.2)] text-[var(--up)] text-xs">
                <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
                {success}
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gradient-to-b from-[#d4a056] to-[#b8853d] text-[#1a1208] font-semibold text-sm transition-all hover:from-[#e5b46a] hover:to-[#c99450] disabled:opacity-50 shadow-[0_2px_8px_rgba(212,160,86,0.3)]"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 处理中...</>
              ) : (
                <>
                  {mode === 'signin' ? '登录' : '注册'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-[var(--text-muted)] mt-6">
          数据按账户隔离 · 每月上传限 30 个 CSV · 邮件限 31 封
        </p>
      </div>
    </div>
  );
}
