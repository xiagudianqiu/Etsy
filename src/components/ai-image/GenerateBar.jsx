import { useState, useRef } from 'react';
import { Sparkles, Loader2, Image as ImageIcon, X, Upload, AlertCircle, Download, RefreshCw, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { generateImage, fillPrompt } from '../../utils/evolinkApi';

const RESOLUTION_PRESETS = [
  { value: '1K', label: '1K', longEdge: 1024 },
  { value: '2K', label: '2K', longEdge: 2048 },
  { value: '4K', label: '4K', longEdge: 4096 }
];

const ASPECT_RATIOS = [
  { value: '1:1', w: 1, h: 1 },
  { value: '16:9', w: 16, h: 9 },
  { value: '9:16', w: 9, h: 16 },
  { value: '4:3', w: 4, h: 3 },
  { value: '3:4', w: 3, h: 4 },
  { value: '3:2', w: 3, h: 2 },
  { value: '2:3', w: 2, h: 3 },
  { value: '5:4', w: 5, h: 4 },
  { value: '4:5', w: 4, h: 5 },
  { value: '2:1', w: 2, h: 1 },
  { value: '1:2', w: 1, h: 2 },
  { value: '21:9', w: 21, h: 9 },
  { value: '9:21', w: 9, h: 21 }
];

/**
 * 根据比例 + 分辨率长边计算最终像素尺寸
 * 长边 = longEdge，短边 = round(longEdge * min(w,h)/max(w,h))
 */
function calcSize(ratioValue, resolution) {
  const r = ASPECT_RATIOS.find(a => a.value === ratioValue) || ASPECT_RATIOS[0];
  const res = RESOLUTION_PRESETS.find(p => p.value === resolution) || RESOLUTION_PRESETS[0];
  const longEdge = res.longEdge;
  const shortEdge = Math.round(longEdge * Math.min(r.w, r.h) / Math.max(r.w, r.h));
  // 横向（w>h）→ 宽是长边；竖向 → 高是长边
  return r.w >= r.h ? `${longEdge}x${shortEdge}` : `${shortEdge}x${longEdge}`;
}

const QUALITY_PRESETS = [
  { value: 'auto', label: '自动' },
  { value: 'low', label: '低（快）' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高（慢）' }
];

/**
 * 底部悬浮生图栏
 * 固定在页面底部居中，包含：模型选择 + 参考图上传 + 尺寸 + 提示词 + 生成
 */
export default function GenerateBar({ aiModels, selectedPrompt, onClearPrompt, onGenerated }) {
  const [modelId, setModelId] = useState(aiModels[0]?.id || '');
  const [prompt, setPrompt] = useState('');
  const [useTemplate, setUseTemplate] = useState(true);  // 是否用模板（带参数）
  const [argValues, setArgValues] = useState({});
  const [refImages, setRefImages] = useState([]);  // File[]（最多4张）
  const [refPreviews, setRefPreviews] = useState([]);  // string[] base64
  const [ratio, setRatio] = useState('1:1');
  const [resolution, setResolution] = useState('1K');
  const size = calcSize(ratio, resolution);
  const [quality, setQuality] = useState('auto');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(true);  // 栏子展开/收起
  const fileRef = useRef(null);

  const selectedModel = aiModels.find(m => m.id === modelId);

  // 选中提示词变化时，更新 prompt 和参数默认值
  const lastPromptId = useRef(null);
  if (selectedPrompt && selectedPrompt.id !== lastPromptId.current) {
    lastPromptId.current = selectedPrompt.id;
    const defaults = {};
    (selectedPrompt.arguments || []).forEach(a => { defaults[a.name] = a.default; });
    setArgValues(defaults);
    setPrompt('');
    setUseTemplate(true);
    setResult(null);
    setError('');
  }

  // 最终提示词
  const finalPrompt = useTemplate && selectedPrompt
    ? fillPrompt(selectedPrompt.prompt, argValues)
    : (prompt || (selectedPrompt ? selectedPrompt.filledPrompt : ''));

  const handleUploadRef = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const valid = files.filter(f => f.type.startsWith('image/'));
    if (valid.length === 0) {
      setError('请上传图片文件');
      return;
    }
    setRefImages(prev => {
      const remain = 4 - prev.length;
      if (remain <= 0) {
        setError('最多上传 4 张参考图');
        return prev;
      }
      const adding = valid.slice(0, remain);
      // 读预览
      adding.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => setRefPreviews(p => [...p, ev.target.result]);
        reader.readAsDataURL(file);
      });
      return [...prev, ...adding];
    });
    setError('');
    e.target.value = '';  // 允许重选
  };

  const removeRefImage = (idx) => {
    setRefImages(prev => prev.filter((_, i) => i !== idx));
    setRefPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleGenerate = async () => {
    if (!selectedModel) {
      setError('请先在设置中配置 AI 模型');
      return;
    }
    if (!finalPrompt.trim()) {
      setError('提示词不能为空');
      return;
    }
    setGenerating(true);
    setError('');
    setResult(null);

    const r = await generateImage(selectedModel.apiKey, finalPrompt, {
      size,
      quality,
      model: selectedModel.model,
      endpoint: selectedModel.endpoint,
      refImages: refImages  // 数组
    });

    setResult(r);
    if (r.ok) {
      onGenerated?.({
        prompt: finalPrompt,
        imageUrl: r.imageUrl,
        title: selectedPrompt?.title || '自定义生图',
        category: selectedPrompt?.categoryLabel || '自定义',
        model: selectedModel.label,
        generatedAt: new Date().toISOString()
      });
    } else {
      // 错误时附带原始返回，方便排查
      setError(r.raw ? `${r.error} | 返回: ${JSON.stringify(r.raw).slice(0, 200)}` : r.error);
      console.log('[AI 生图] 失败详情:', r);
    }
    setGenerating(false);
  };

  const handleDownload = () => {
    if (!result?.imageUrl) return;
    const a = document.createElement('a');
    a.href = result.imageUrl;
    a.download = `gpt-image-${Date.now()}.png`;
    a.target = '_blank';
    a.click();
  };

  const noModels = aiModels.length === 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-center px-4 pb-4 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-4xl card border-[var(--border-strong)] shadow-2xl"
           style={{ boxShadow: '0 -8px 40px rgba(0,0,0,0.4), 0 0 0 1px var(--border-strong)' }}>

        {/* 收起时的精简条 */}
        {!expanded && (
          <button onClick={() => setExpanded(true)} className="w-full px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--gold-bright)]" />
              <span className="text-sm font-medium text-[var(--text-primary)]">生图栏</span>
              {selectedPrompt && (
                <span className="chip chip-gold text-[10px] max-w-[200px] truncate">{selectedPrompt.title}</span>
              )}
            </div>
            <ChevronUp className="w-4 h-4 text-[var(--text-tertiary)]" />
          </button>
        )}

        {/* 展开时的完整栏 */}
        {expanded && (
          <div className="p-4 space-y-3">
            {/* 顶行：模型 + 尺寸 + 质量 + 收起 */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* 模型选择 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--text-tertiary)]">模型</span>
                <select
                  value={modelId}
                  onChange={e => setModelId(e.target.value)}
                  disabled={noModels}
                  className="px-2 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--gold)] disabled:opacity-50"
                >
                  {noModels ? (
                    <option value="">未配置</option>
                  ) : (
                    aiModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)
                  )}
                </select>
              </div>

              {/* 比例 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--text-tertiary)]">比例</span>
                <select
                  value={ratio}
                  onChange={e => setRatio(e.target.value)}
                  className="px-2 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--gold)]"
                >
                  {ASPECT_RATIOS.map(a => <option key={a.value} value={a.value}>{a.value}</option>)}
                </select>
              </div>

              {/* 分辨率 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--text-tertiary)]">分辨率</span>
                <select
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  className="px-2 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--gold)]"
                >
                  {RESOLUTION_PRESETS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {/* 最终尺寸预览 */}
              <span className="text-[10px] text-[var(--text-muted)] tabular-nums">{size}</span>

              {/* 质量 */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[var(--text-tertiary)]">质量</span>
                <select
                  value={quality}
                  onChange={e => setQuality(e.target.value)}
                  className="px-2 py-1 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs outline-none focus:border-[var(--gold)]"
                >
                  {QUALITY_PRESETS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
                </select>
              </div>

              {/* 参考图上传（最多4张） */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={refImages.length >= 4}
                className={`btn-ghost text-xs disabled:opacity-40 disabled:cursor-not-allowed ${refImages.length > 0 ? 'border-[var(--gold)] text-[var(--gold-bright)]' : ''}`}
                title={refImages.length >= 4 ? '已达上限 4 张' : '上传参考图（最多 4 张）'}
              >
                <Upload className="w-3 h-3" />
                参考图 {refImages.length > 0 && `${refImages.length}/4`}
              </button>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUploadRef} />

              <div className="flex-1" />

              <button onClick={() => setExpanded(false)} className="btn-icon w-7 h-7" title="收起">
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 参考图预览（多图网格） */}
            {refPreviews.length > 0 && (
              <div className="p-2 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)]">
                <div className="flex items-center gap-2 flex-wrap">
                  {refPreviews.map((src, idx) => (
                    <div key={idx} className="relative group">
                      <img src={src} alt={`参考图${idx+1}`} className="w-12 h-12 rounded object-cover border border-[var(--border)]" />
                      <button
                        onClick={() => removeRefImage(idx)}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[var(--down)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="删除"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                      <span className="absolute bottom-0 left-0 text-[8px] px-1 bg-black/60 text-white rounded-tr">{idx+1}</span>
                    </div>
                  ))}
                  {refImages.length < 4 && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-12 h-12 rounded border-2 border-dashed border-[var(--border-strong)] flex items-center justify-center text-[var(--text-tertiary)] hover:border-[var(--gold)] hover:text-[var(--gold-bright)] transition-colors"
                      title="继续添加"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="text-[10px] text-[var(--text-tertiary)] mt-1.5">
                  {refImages.length} 张参考图 · {refImages.length < 4 ? `还可加 ${4 - refImages.length} 张` : '已达上限'}
                </div>
              </div>
            )}

            {/* 提示词来源 */}
            {selectedPrompt ? (
              <div className="flex items-center gap-2 p-2 rounded-md bg-[var(--gold-soft)] border border-[rgba(212,160,86,0.2)]">
                <Sparkles className="w-3.5 h-3.5 text-[var(--gold-bright)] flex-shrink-0" />
                <span className="text-[11px] text-[var(--gold-bright)] flex-1 truncate">
                  来自：{selectedPrompt.title}
                </span>
                <button
                  onClick={() => { onClearPrompt(); setPrompt(''); }}
                  className="text-[var(--text-tertiary)] hover:text-[var(--down)]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="text-[11px] text-[var(--text-tertiary)] flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                点击上方提示词卡片「发送到生图栏」，或直接在下面输入自定义提示词
              </div>
            )}

            {/* 参数（如果有模板） */}
            {useTemplate && selectedPrompt && selectedPrompt.arguments.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] text-[var(--text-tertiary)]">参数：</span>
                {selectedPrompt.arguments.map(arg => (
                  <div key={arg.name} className="flex items-center gap-1">
                    <span className="text-[10px] text-[var(--text-muted)]">{arg.name}:</span>
                    <input
                      type="text"
                      value={argValues[arg.name] || ''}
                      onChange={e => setArgValues(p => ({ ...p, [arg.name]: e.target.value }))}
                      className="w-24 px-1.5 py-0.5 rounded bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-[10px] outline-none focus:border-[var(--gold)]"
                    />
                  </div>
                ))}
                <button
                  onClick={() => setUseTemplate(false)}
                  className="text-[10px] text-[var(--text-tertiary)] hover:text-[var(--gold-bright)] ml-auto"
                >
                  切换手动编辑
                </button>
              </div>
            )}

            {/* 提示词输入框 */}
            <textarea
              value={useTemplate && selectedPrompt ? finalPrompt : (prompt || finalPrompt)}
              onChange={e => { setPrompt(e.target.value); setUseTemplate(false); }}
              rows={2}
              placeholder="输入提示词（英文效果更好），或从上方选择提示词模板..."
              className="w-full px-2.5 py-2 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-mono outline-none focus:border-[var(--gold)] resize-none leading-relaxed"
            />

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.2)] text-[var(--down)] text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* 生成结果预览（小） */}
            {result?.ok && (
              <div className="flex items-center gap-3 p-2 rounded-md bg-[rgba(74,222,128,0.06)] border border-[rgba(74,222,128,0.2)]">
                <img src={result.imageUrl} alt="生成结果" className="w-14 h-14 rounded object-cover" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] text-[var(--up)] font-medium">生成成功</div>
                  <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">查看「生成历史」或下载</div>
                </div>
                <button onClick={handleDownload} className="btn-ghost text-[11px]">
                  <Download className="w-3 h-3" /> 下载
                </button>
                <button onClick={handleGenerate} className="btn-ghost text-[11px]">
                  <RefreshCw className="w-3 h-3" /> 重生
                </button>
              </div>
            )}

            {/* 生成按钮 */}
            <button
              onClick={handleGenerate}
              disabled={generating || noModels || !finalPrompt.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> 生成中...（任务排队处理，约 15-60 秒）</>
              ) : noModels ? (
                <><AlertCircle className="w-4 h-4" /> 请先在设置配置模型</>
              ) : (
                <><Sparkles className="w-4 h-4" /> 生成图片</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
