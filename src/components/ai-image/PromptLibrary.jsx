import { useState, useMemo } from 'react';
import promptsData from '../../data/prompts.json';
import { Search, Sparkles, ImageOff, ChevronDown, ChevronUp, ArrowDown } from 'lucide-react';

const CATEGORIES = [
  { key: 'all', label: '全部', emoji: '✨' },
  ...promptsData.categories.map(c => ({ key: c.key, label: c.label, emoji: c.emoji, count: c.count }))
];

/**
 * 提示词库 — 小卡片网格（缩略图+标题），点击展开详情（只看不生成）
 * 点「发送到生图栏」把提示词装入底部生图栏
 */
export default function PromptLibrary({ onSelect, hasApiKey }) {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);  // 展开的卡片 key

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
    <div className="space-y-4 pb-32">  {/* pb-32 给底部生图栏留空间 */}
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
          {filtered.map(p => {
            const key = `${p.category}-${p.id}`;
            const expanded = expandedId === key;
            return (
              <PromptCard
                key={key}
                prompt={p}
                expanded={expanded}
                onToggle={() => setExpandedId(expanded ? null : key)}
                onSelect={onSelect}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function PromptCard({ prompt, expanded, onToggle, onSelect }) {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`card overflow-hidden transition-all ${expanded ? 'col-span-2 sm:col-span-3 md:col-span-4 lg:col-span-5' : ''}`}>
      {/* 未展开：缩略图 + 标题 */}
      <button onClick={onToggle} className="w-full text-left">
        <div className="aspect-square bg-[var(--bg-elevated)] relative overflow-hidden">
          {prompt.imageUrl && !imgError ? (
            <img
              src={prompt.imageUrl}
              alt={prompt.title}
              loading="lazy"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
              <ImageOff className="w-6 h-6 mb-1" />
            </div>
          )}
          {/* 分类小标 */}
          <div className="absolute top-1.5 left-1.5">
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white backdrop-blur-sm">
              {prompt.categoryEmoji}
            </span>
          </div>
          {/* 展开指示 */}
          <div className="absolute bottom-1.5 right-1.5">
            <span className="w-5 h-5 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
              {expanded ? <ChevronUp className="w-3 h-3 text-white" /> : <ChevronDown className="w-3 h-3 text-white" />}
            </span>
          </div>
        </div>
        {/* 标题 */}
        <div className="p-2">
          <h3 className="text-[11px] font-medium text-[var(--text-primary)] line-clamp-2 leading-tight" title={prompt.title}>
            {prompt.title}
          </h3>
        </div>
      </button>

      {/* 展开后：详情 */}
      {expanded && (
        <div className="p-4 border-t border-[var(--border)] fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 左：大图 */}
            <div className="aspect-square rounded-lg overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
              {prompt.imageUrl && !imgError ? (
                <img src={prompt.imageUrl} alt={prompt.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-sm">无参考图</div>
              )}
            </div>

            {/* 右：信息 */}
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="chip chip-gold text-[10px]">{prompt.categoryEmoji} {prompt.categoryLabel}</span>
                  <span className="text-[10px] text-[var(--text-tertiary)] tabular-nums">#{prompt.id}</span>
                </div>
                <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{prompt.title}</h3>
                {prompt.author && (
                  <div className="text-[10px] text-[var(--text-muted)] mt-1">
                    来源：{prompt.authorUrl ? (
                      <a href={prompt.authorUrl} target="_blank" rel="noreferrer" className="text-[var(--gold)] hover:underline">@{prompt.author}</a>
                    ) : `@${prompt.author}`}
                  </div>
                )}
              </div>

              {prompt.arguments.length > 0 && (
                <div className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3 text-[var(--gold)]" />
                  含 {prompt.arguments.length} 个可调参数
                </div>
              )}

              {/* 提示词预览 */}
              <div>
                <div className="text-[10px] text-[var(--text-tertiary)] mb-1 uppercase tracking-wider">提示词（英文）</div>
                <div className="text-[11px] text-[var(--text-secondary)] font-mono leading-relaxed bg-[var(--bg)] rounded-md p-2.5 max-h-32 overflow-y-auto">
                  {prompt.filledPrompt}
                </div>
              </div>

              {/* 发送到生图栏 */}
              <button
                onClick={() => onSelect(prompt)}
                className="btn-primary w-full text-xs"
              >
                <ArrowDown className="w-3 h-3" />
                发送到生图栏
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
