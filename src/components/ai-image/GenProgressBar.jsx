import { Loader2 } from 'lucide-react';
import { useGenContext } from '../../utils/GenProgressContext';

/**
 * 全局生图进度条
 * 显示在 Topbar 下方，跨页面可见
 * 生成中显示进度，完成自动消失
 */
export default function GenProgressBar() {
  const { generating, progressText, result, clearGen } = useGenContext();

  if (!generating && !result) return null;

  return (
    <div className="relative z-20">
      {generating && (
        <div className="h-0.5 bg-[var(--bg-elevated)] overflow-hidden">
          <div
            className="h-full w-full bg-gradient-to-r from-[var(--gold)] to-[var(--gold-bright)] animate-[progressBar_2s_ease_infinite]"
          />
        </div>
      )}

      {(generating || result) && (
        <div className="px-8 py-2 bg-[var(--bg-elevated)] border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[var(--gold)]" />
                <span className="text-sm text-[var(--text-primary)]">{progressText || '生成中...'}</span>
              </>
            ) : result?.ok ? (
              <>
                <span className="text-sm text-[var(--up)]">✓ 图片已生成</span>
                {result.raw?.data?.[0]?.revised_prompt && (
                  <span className="text-xs text-[var(--text-tertiary)] ml-2 max-w-[400px] truncate">
                    {result.raw.data[0].revised_prompt}
                  </span>
                )}
              </>
            ) : result?.error ? (
              <>
                <span className="text-sm text-[var(--down)]">✕ 生成失败</span>
                <span className="text-xs text-[var(--text-tertiary)] ml-2 max-w-[400px] truncate">{result.error}</span>
              </>
            ) : null}
          </div>
          {!generating && (
            <button onClick={clearGen} className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
              关闭
            </button>
          )}
        </div>
      )}
    </div>
  );
}