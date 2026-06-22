import { FileText, CheckCircle2, Loader2 } from 'lucide-react';

/**
 * PDF 导出进度遮罩
 * 全屏暖金风格，实时显示进度条 + 当前阶段
 */
export default function PDFProgressOverlay({ progress }) {
  if (!progress) return null;

  const { percent = 0, stage = '准备中…', current, total } = progress;
  const done = percent >= 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md"
      style={{ background: 'rgba(10, 9, 8, 0.75)' }}
    >
      <div className="card max-w-sm w-full mx-4 p-7 fade-in" style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.5), 0 0 60px rgba(212,160,86,0.15)' }}>
        {/* 图标 */}
        <div className="flex items-center gap-3 mb-5">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${done ? 'bg-[rgba(74,222,128,0.15)]' : 'bg-[var(--gold-soft)]'}`}>
            {done ? (
              <CheckCircle2 className="w-5 h-5 text-[var(--up)]" />
            ) : (
              <FileText className="w-5 h-5 text-[var(--gold-bright)]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">
              {done ? 'PDF 导出完成' : '正在生成 PDF 报告'}
            </div>
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
              {done ? '已保存到下载文件夹' : '请稍候，正在处理数据'}
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2 text-xs">
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5">
              {!done && <Loader2 className="w-3 h-3 animate-spin text-[var(--gold)]" />}
              {stage}
            </span>
            <span className="tabular-nums font-medium text-[var(--gold-bright)]">{percent}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300 ease-out"
              style={{
                width: `${percent}%`,
                background: done
                  ? 'var(--up)'
                  : 'linear-gradient(90deg, #d4a056, #f5b955)',
                boxShadow: done ? 'none' : '0 0 8px rgba(245,185,85,0.4)'
              }}
            />
          </div>
        </div>

        {/* 步骤数 */}
        {current !== undefined && total !== undefined && (
          <div className="text-[10px] text-[var(--text-tertiary)] tabular-nums text-right">
            步骤 {current} / {total}
          </div>
        )}
      </div>
    </div>
  );
}