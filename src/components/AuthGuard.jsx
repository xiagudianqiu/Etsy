import { Loader2, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import AuthPage from './AuthPage';

/**
 * 认证守卫
 * - loading：显示加载态
 * - 未登录：显示登录页
 * - 已登录：渲染 children
 */
export default function AuthGuard({ children }) {
  const { user, loading, configured } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] gap-4">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#d4a056] to-[#8a6630] shadow-[0_4px_16px_rgba(212,160,86,0.3)]">
          <TrendingUp className="w-6 h-6 text-[#1a1208]" strokeWidth={2.5} />
        </div>
        <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          加载中...
        </div>
      </div>
    );
  }

  if (!configured) {
    return <AuthPage />;
  }

  if (!user) {
    return <AuthPage />;
  }

  return children;
}
