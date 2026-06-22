import { useState } from 'react';
import { Download, RefreshCw, Copy, Check, Trash2, ImageOff, Clock } from 'lucide-react';

/**
 * 生成历史 — 本次会话生成的图片
 * 注：不持久化（刷新会清空），避免占用数据库空间
 */
export default function GeneratedImages({ items, onRegenerate }) {
  const [copiedId, setCopiedId] = useState(null);

  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--gold-soft)] flex items-center justify-center">
          <ImageOff className="w-7 h-7 text-[var(--gold)]" />
        </div>
        <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-1">还没有生成过图片</h3>
        <p className="text-sm text-[var(--text-tertiary)]">去提示词库选一个，点「使用此提示词」开始生成</p>
      </div>
    );
  }

  const handleDownload = (item) => {
    const a = document.createElement('a');
    a.href = item.imageUrl;
    a.download = `gpt-image-${item.id}.png`;
    a.target = '_blank';
    a.click();
  };

  const handleCopy = (item) => {
    navigator.clipboard.writeText(item.prompt);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
        <Clock className="w-3.5 h-3.5" />
        本次会话生成的图片（刷新页面会清空，请及时下载）
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="card overflow-hidden">
            {/* 图片 */}
            <div className="aspect-square bg-[var(--bg-elevated)] relative">
              <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
              <div className="absolute top-2 left-2">
                <span className="chip chip-gold text-[10px] backdrop-blur-sm">{item.category}</span>
              </div>
            </div>

            {/* 信息 */}
            <div className="p-3 space-y-2">
              <div className="text-[12px] font-medium text-[var(--text-primary)] line-clamp-1">{item.title}</div>
              <div className="text-[10px] text-[var(--text-tertiary)]">
                {new Date(item.generatedAt).toLocaleTimeString('zh-CN')}
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-1 pt-1">
                <button
                  onClick={() => handleDownload(item)}
                  className="flex-1 btn-ghost text-[11px] py-1.5"
                  title="下载"
                >
                  <Download className="w-3 h-3" />
                </button>
                <button
                  onClick={() => handleCopy(item)}
                  className="flex-1 btn-ghost text-[11px] py-1.5"
                  title="复制提示词"
                >
                  {copiedId === item.id ? <Check className="w-3 h-3 text-[var(--up)]" /> : <Copy className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => onRegenerate(item)}
                  className="flex-1 btn-ghost text-[11px] py-1.5"
                  title="用相同提示词重新生成"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
