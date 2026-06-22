import { useState, useMemo } from 'react';
import promptsData from '../../data/prompts.json';
import { Search, ImageOff } from 'lucide-react';
import PromptDetailModal from './PromptDetailModal';

const CATEGORIES = [
  { key: 'all', label: '全部', emoji: '✨' },
  ...promptsData.categories.map(c => ({ key: c.key, label: c.label, emoji: c.emoji, count: c.count }))
];

/**
 * 提示词库 — 小卡片网格（缩略图+标题），点击弹出详情模态窗
 */
export default function PromptLibrary({ onSelect, hasApiKey }) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);  // 选中的提示词（弹窗）

  const filtered = useMemo(() => {
    let list = promptsData.prompts;
    if (category !== 'all') list = list.filter(p => p.category === category);
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
    <div className="space-y-4 pb-32">
      {/* 筛选栏 */}
      <div className="card p-4 space-y-3">
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

        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索提示词标题或内容..."
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none"
          />
          <span className="text-xs text-[var(--text-tertiary)] tabular-nums">{filtered.length}</span>
        </div>
      </div>

      {/* 卡片网格 */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center text-[var(--text-tertiary)]">没有匹配的提示词</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(p => (
            <PromptCard
              key={`${p.category}-${p.id}`}
              prompt={p}
              onClick={() => setSelected(p)}
            />
          ))}
        </div>
      )}

      {/* 详情弹窗 */}
      {selected && (
        <PromptDetailModal
          prompt={selected}
          onClose={() => setSelected(null)}
          onUse={(p) => {
            onSelect(p);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function PromptCard({ prompt, onClick }) {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      onClick={onClick}
      className="card overflow-hidden text-left hover:border-[var(--gold)] transition-colors group"
    >
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
            <ImageOff className="w-6 h-6 mb-1" />
          </div>
        )}
        <div className="absolute top-1.5 left-1.5">
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white backdrop-blur-sm">
            {prompt.categoryEmoji}
          </span>
        </div>
      </div>
      <div className="p-2">
        <h3 className="text-[11px] font-medium text-[var(--text-primary)] line-clamp-2 leading-tight" title={prompt.title}>
          {prompt.title}
        </h3>
      </div>
    </button>
  );
}
