import { X, Sparkles, ArrowDown, ExternalLink, Copy, Check } from 'lucide-react';
import { useState } from 'react';

/**
 * 提示词详情弹窗 — 居中悬浮卡片查看
 * 显示大图 + 标题 + 提示词 + 参数，点「发送到生图栏」装入底部
 */
export default function PromptDetailModal({ prompt, onClose, onUse }) {
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.filledPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-strong)] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="chip chip-gold flex-shrink-0">{prompt.categoryEmoji} {prompt.categoryLabel}</span>
            <span className="text-[11px] text-[var(--text-tertiary)] tabular-nums flex-shrink-0">#{prompt.id}</span>
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{prompt.title}</h2>
          </div>
          <button onClick={onClose} className="btn-icon flex-shrink-0 ml-2 w-8 h-8">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 左：大图 */}
          <div className="space-y-2">
            <div className="section-label">参考效果</div>
            <div className="aspect-square rounded-xl overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
              {prompt.imageUrl && !imgError ? (
                <img
                  src={prompt.imageUrl}
                  alt={prompt.title}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-sm">
                  无参考图
                </div>
              )}
            </div>
            {prompt.authorUrl && (
              <a
                href={prompt.authorUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--gold-bright)] flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                原作者 @{prompt.author}
              </a>
            )}
          </div>

          {/* 右：提示词 + 参数 */}
          <div className="space-y-4">
            {/* 参数提示 */}
            {prompt.arguments.length > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--gold-soft)] border border-[rgba(212,160,86,0.2)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--gold-bright)] flex-shrink-0" />
                <span className="text-[11px] text-[var(--gold-bright)]">
                  含 {prompt.arguments.length} 个可调参数，发送到生图栏后可填写
                </span>
              </div>
            )}

            {/* 参数列表（只读预览） */}
            {prompt.arguments.length > 0 && (
              <div>
                <div className="section-label mb-2">参数预览</div>
                <div className="space-y-1.5">
                  {prompt.arguments.map(arg => (
                    <div key={arg.name} className="flex items-center gap-2 text-[11px]">
                      <span className="text-[var(--text-tertiary)] flex-1 truncate">{arg.name}</span>
                      <span className="text-[var(--text-secondary)] font-mono truncate max-w-[180px]">{arg.default}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 提示词 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="section-label">提示词（英文）</span>
                <button
                  onClick={handleCopy}
                  className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--gold-bright)] flex items-center gap-1"
                >
                  {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] font-mono leading-relaxed bg-[var(--bg)] rounded-md p-3 max-h-48 overflow-y-auto border border-[var(--border)]">
                {prompt.filledPrompt}
              </div>
            </div>
          </div>
        </div>

        {/* 底部：发送到生图栏 */}
        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
          <span className="text-[11px] text-[var(--text-tertiary)]">点击下方按钮，把提示词装入底部生图栏</span>
          <button onClick={() => onUse(prompt)} className="btn-primary text-xs">
            <ArrowDown className="w-3.5 h-3.5" />
            发送到生图栏
          </button>
        </div>
      </div>
    </div>
  );
}
