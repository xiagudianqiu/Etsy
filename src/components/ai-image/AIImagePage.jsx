import { useState } from 'react';
import promptsData from '../../data/prompts.json';
import PromptLibrary from './PromptLibrary';
import ImageGenerator from './ImageGenerator';
import GeneratedImages from './GeneratedImages';
import { KeyRound, Sparkles, Image as ImageIcon } from 'lucide-react';

/**
 * AI 生图主页面
 * - 顶部：API Key 状态 + 生图历史切换
 * - 主体：提示词库网格
 * - 点卡片：打开生图弹窗
 */
export default function AIImagePage({ apiKey }) {
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [generated, setGenerated] = useState([]);
  const [view, setView] = useState('library');

  const onGenerated = (item) => {
    setGenerated(prev => [{ ...item, id: Date.now() }, ...prev].slice(0, 30));
  };

  return (
    <div className="space-y-6">
      {/* 顶部栏：标题 + API Key 状态 + 视图切换 */}
      <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--gold-soft)] flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-[var(--gold-bright)]" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-[var(--text-primary)]">GPT-Image-2 生图工具</div>
            <div className="text-xs text-[var(--text-tertiary)] mt-0.5">{promptsData.total} 个精选提示词 · 电商主图/广告/海报</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* API Key 状态 */}
          {apiKey ? (
            <span className="chip chip-up">
              <KeyRound className="w-3 h-3" />
              API Key 已配置
            </span>
          ) : (
            <span className="chip chip-muted">
              <KeyRound className="w-3 h-3" />
              未配置 API Key
            </span>
          )}

          {/* 视图切换 */}
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-elevated)]">
            <button
              onClick={() => setView('library')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === 'library' ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)]' : 'text-[var(--text-tertiary)]'
              }`}
            >
              <Sparkles className="w-3 h-3 inline mr-1" />提示词库
            </button>
            <button
              onClick={() => setView('history')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                view === 'history' ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)]' : 'text-[var(--text-tertiary)]'
              }`}
            >
              <ImageIcon className="w-3 h-3 inline mr-1" />
              生成历史 {generated.length > 0 && `(${generated.length})`}
            </button>
          </div>
        </div>
      </div>

      {/* 主体内容 */}
      {view === 'library' ? (
        <PromptLibrary onSelect={setSelectedPrompt} hasApiKey={!!apiKey} />
      ) : (
        <GeneratedImages items={generated} onRegenerate={(p) => setSelectedPrompt(p)} />
      )}

      {/* 生图弹窗 */}
      {selectedPrompt && (
        <ImageGenerator
          prompt={selectedPrompt}
          apiKey={apiKey}
          onClose={() => setSelectedPrompt(null)}
          onGenerated={onGenerated}
        />
      )}
    </div>
  );
}
