import { useState, useMemo } from 'react';
import { X, Sparkles, Loader2, Download, RefreshCw, AlertCircle, Check, Copy } from 'lucide-react';
import { generateImage, fillPrompt } from '../../utils/evolinkApi';

const SIZES = [
  { value: '1024x1024', label: '1024×1024（方形）' },
  { value: '1536x1024', label: '1536×1024（横向）' },
  { value: '1024x1536', label: '1024×1536（竖向）' }
];

/**
 * 生图弹窗
 * - 左：原图预览
 * - 右：参数填写 + 提示词编辑 + 生成
 */
export default function ImageGenerator({ prompt, apiKey, onClose, onGenerated }) {
  // 参数值（从 prompt.arguments 初始化为默认值）
  const [argValues, setArgValues] = useState(() => {
    const v = {};
    (prompt.arguments || []).forEach(a => { v[a.name] = a.default; });
    return v;
  });

  // 手动编辑的提示词（覆盖自动填充）
  const [manualPrompt, setManualPrompt] = useState('');
  const [useManual, setUseManual] = useState(false);
  const [size, setSize] = useState('1024x1024');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);  // { ok, imageUrl, error }
  const [copied, setCopied] = useState(false);

  // 实时预览最终提示词
  const finalPrompt = useMemo(() => {
    if (useManual) return manualPrompt;
    return fillPrompt(prompt.prompt, argValues);
  }, [useManual, manualPrompt, prompt.prompt, argValues]);

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);
    const r = await generateImage(apiKey, finalPrompt, { size });
    setResult(r);
    if (r.ok) {
      onGenerated({
        prompt: finalPrompt,
        imageUrl: r.imageUrl,
        title: prompt.title,
        category: prompt.categoryLabel,
        generatedAt: new Date().toISOString()
      });
    }
    setGenerating(false);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(finalPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!result?.imageUrl) return;
    const a = document.createElement('a');
    a.href = result.imageUrl;
    a.download = `gpt-image-${prompt.id}.png`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-strong)] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="chip chip-gold flex-shrink-0">{prompt.categoryEmoji} {prompt.categoryLabel}</span>
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)] truncate">#{prompt.id} {prompt.title}</h2>
          </div>
          <button onClick={onClose} className="btn-icon flex-shrink-0 ml-2"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 左：原图 + 生成结果 */}
          <div className="space-y-3">
            <div className="section-label">参考效果</div>
            <div className="aspect-square rounded-xl overflow-hidden bg-[var(--bg)] border border-[var(--border)]">
              {prompt.imageUrl ? (
                <img src={prompt.imageUrl} alt={prompt.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)] text-sm">无参考图</div>
              )}
            </div>

            {/* 生成结果 */}
            {result?.ok && (
              <>
                <div className="section-label flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-[var(--up)]" />
                  生成结果
                </div>
                <div className="aspect-square rounded-xl overflow-hidden bg-[var(--bg)] border border-[rgba(74,222,128,0.3)]">
                  <img src={result.imageUrl} alt="生成结果" className="w-full h-full object-cover" />
                </div>
                <button onClick={handleDownload} className="btn-ghost w-full text-xs">
                  <Download className="w-3.5 h-3.5" />
                  下载图片
                </button>
              </>
            )}
          </div>

          {/* 右：参数 + 提示词 + 生成 */}
          <div className="space-y-4">
            {/* 参数 */}
            {prompt.arguments.length > 0 && (
              <div>
                <div className="section-label mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--gold)]" />
                  可调参数（{prompt.arguments.length} 个）
                </div>
                <div className="space-y-2">
                  {prompt.arguments.map(arg => (
                    <div key={arg.name}>
                      <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">{arg.name}</label>
                      <input
                        type="text"
                        value={argValues[arg.name] || ''}
                        onChange={e => { setArgValues(p => ({ ...p, [arg.name]: e.target.value })); setUseManual(false); }}
                        className="w-full px-2.5 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--gold)]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 尺寸 */}
            <div>
              <label className="block text-[11px] text-[var(--text-tertiary)] mb-1.5">尺寸</label>
              <select
                value={size}
                onChange={e => setSize(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--gold)]"
              >
                {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            {/* 提示词预览 */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] text-[var(--text-tertiary)]">最终提示词（英文）</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setManualPrompt(finalPrompt); setUseManual(!useManual); }}
                    className={`text-[10px] ${useManual ? 'text-[var(--gold-bright)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
                  >
                    {useManual ? '✓ 手动编辑' : '手动编辑'}
                  </button>
                  <button onClick={handleCopyPrompt} className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--gold-bright)] flex items-center gap-1">
                    {copied ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                    {copied ? '已复制' : '复制'}
                  </button>
                </div>
              </div>
              <textarea
                value={finalPrompt}
                onChange={e => { setManualPrompt(e.target.value); setUseManual(true); }}
                rows={6}
                className="w-full px-2.5 py-2 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-[11px] font-mono outline-none focus:border-[var(--gold)] resize-none leading-relaxed"
              />
            </div>

            {/* 错误提示 */}
            {result && !result.ok && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[var(--down)] text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">生成失败</div>
                  <div className="opacity-80 mt-0.5">{result.error}</div>
                </div>
              </div>
            )}

            {/* API Key 未配置提示 */}
            {!apiKey && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-[rgba(245,185,85,0.08)] border border-[rgba(245,185,85,0.2)] text-[var(--gold-bright)] text-xs">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <div>未配置 API Key，请先到「设置 → AI 生图」填写 EvoLink API Key</div>
              </div>
            )}

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={generating || !apiKey}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 生成中...（约 10-30 秒）</>
              ) : result?.ok ? (
                <><RefreshCw className="w-4 h-4" /> 重新生成</>
              ) : (
                <><Sparkles className="w-4 h-4" /> 生成图片</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
