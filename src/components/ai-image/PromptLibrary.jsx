import { useState, useMemo } from 'react';
import promptsData from '../../data/prompts.json';
import { Search, Sparkles, ImageOff } from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: '全部', emoji: '✨' },
  ...promptsData.categories.map(c => ({ key: c.key, label: c.label, emoji: c.emoji, count: c.count }))
];

/**
 * 提示词库 — 网格卡片 + 分类筛选 + 搜索
 */
export default function PromptLibrary({ onSelect, hasApiKey }) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = promptsData.prompts;
    if (category !== 'all') {
      list = list.filter(p => p.category === category);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.prompt.toLowerCase().includes(q) ||
        p.categoryLabel.includes(q)
      );
    }
    return list;
  }, [category, search]);

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="card p-4 space-y-3">
        {/* 分类 tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border
                ${category === c.key
                  ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)] border-[rgba(212,160,86,0.4)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border)]'
                }`}
            >
              <span>{c.emoji}</span>
              {c.label}
              {c.key !== 'all' && c.count && (
                <span className="text-[10px] opacity-60 tabular-nums">{c.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* 搜索框 */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索提示词标题或内容..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
          />
          <span className="text-xs text-[var(--text-tertiary)] tabular-nums">{filtered.length} 个</span>
        </div>
      </div>

      {/* 提示词卡片网格 */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-[var(--text-tertiary)]">
          没有匹配的提示词
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <PromptCard key={`${p.category}-${p.id}`} prompt={p} onSelect={onSelect} hasApiKey={hasApiKey} />
          ))}
        </div>
      )}
    </div>
  );
}

function PromptCard({ prompt, onSelect, hasApiKey }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="card overflow-hidden flex flex-col hover:border-[var(--gold)] transition-colors group">
      {/* 效果图 */}
      <div className="aspect-square bg-[var(--bg-elevated)] relative overflow-hidden">
        {prompt.imageUrl && !imgError ? (
          <img
            src={prompt.imageUrl}
            alt={prompt.title}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
            <ImageOff className="w-8 h-8 mb-2" />
            <span className="text-xs">无预览图</span>
          </div>
        )}
        {/* 分类标签 */}
        <div className="absolute top-2 left-2">
          <span className="chip chip-gold text-[10px] backdrop-blur-sm">
            {prompt.categoryEmoji} {prompt.categoryLabel}
          </span>
        </div>
        {/* Case 编号 */}
        <div className="absolute top-2 right-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/50 text-white backdrop-blur-sm tabular-nums">
            #{prompt.id}
          </span>
        </div>
      </div>

      {/* 信息 */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-[13px] font-medium text-[var(--text-primary)] line-clamp-2 mb-2" title={prompt.title}>
          {prompt.title}
        </h3>

        {/* 参数提示 */}
        {prompt.arguments.length > 0 && (
          <div className="text-[10px] text-[var(--text-tertiary)] mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[var(--gold)]" />
            {prompt.arguments.length} 个可调参数
          </div>
        )}

        {/* 提示词预览（截断） */}
        <div className="text-[11px] text-[var(--text-muted)] line-clamp-2 mb-3 flex-1 font-mono">
          {prompt.filledPrompt}
        </div>

        {/* 使用按钮 */}
        <button
          onClick={() => onSelect(prompt)}
          className="btn-primary text-xs py-2"
        >
          <Sparkles className="w-3 h-3" />
          使用此提示词
        </button>
      </div>
    </div>
  );
}
