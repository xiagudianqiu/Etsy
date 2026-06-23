import { useState, useEffect, useMemo } from 'react';
import { X, Save, RotateCcw, Trash2, Plus, Sparkles, RefreshCw, Tag, Coins, Info, Cpu, Eye, EyeOff } from 'lucide-react';
import { CURRENCIES, DEFAULT_RATES, fetchRates } from '../utils/currency';

const DEFAULT_PRODUCTS = {
  '40oz Stanley LSF': 140,
  '40oz LSF': 95,
  '40oz LSF 粉花': 110,
  '64oz Stanley': 120,
  '40oz Stanley 银钛': 130,
  '32oz 粉色蝴蝶结': 110,
  '32oz': 100
};

export default function SettingsModal({ isOpen, onClose, config, aiModels, onSave, orders, onUpdateAiModels, quota }) {
  const [products, setProducts] = useState({});
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [costCurrency, setCostCurrency] = useState('CNY');
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [exchangeRate, setExchangeRate] = useState(7.2);
  const [rateStatus, setRateStatus] = useState('idle');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setProducts({ ...(config?.products || DEFAULT_PRODUCTS) });
      setDisplayCurrency(config?.displayCurrency || 'USD');
      setCostCurrency(config?.costCurrency || 'CNY');
      setRates(config?.rates || DEFAULT_RATES);
      setExchangeRate(config?.exchangeRate || 7.2);
      setNewName('');
      setNewCost('');
    }
  }, [isOpen, config]);

  const discoveredProducts = useMemo(() => {
    if (!orders) return [];
    const seen = new Set(Object.keys(products));
    const found = [];
    orders.forEach(o => {
      if (o.product && !seen.has(o.product) && !found.includes(o.product)) {
        found.push(o.product);
      }
    });
    return found;
  }, [orders, products]);

  const refreshRates = async () => {
    setRateStatus('loading');
    try {
      const r = await fetchRates();
      setRates(r);
      setExchangeRate(r.CNY || 7.2);
      setLastUpdate(new Date().toLocaleString('zh-CN'));
      setRateStatus('done');
    } catch (e) {
      setRateStatus('error');
    }
  };

  const updateCost = (name, cost) => {
    setProducts(p => ({ ...p, [name]: parseFloat(cost) || 0 }));
  };

  const deleteOne = (name) => {
    setProducts(p => {
      const n = { ...p };
      delete n[name];
      return n;
    });
  };

  const addOne = () => {
    const name = newName.trim();
    if (!name || name in products) return;
    const costInCostCur = parseFloat(newCost) || 0;
    const usdCost = costCurrency === 'USD' ? costInCostCur : costInCostCur / (rates[costCurrency] || exchangeRate);
    setProducts(p => ({ ...p, [name]: usdCost }));
    setNewName('');
    setNewCost('');
  };

  const addDiscovered = (name) => {
    if (name in products) return;
    setProducts(p => ({ ...p, [name]: 0 }));
  };

  const addAllDiscovered = () => {
    setProducts(p => {
      const n = { ...p };
      discoveredProducts.forEach(name => { if (!(name in n)) n[name] = 0; });
      return n;
    });
  };

  const handleReset = () => {
    setProducts({ ...DEFAULT_PRODUCTS });
    setDisplayCurrency('USD');
    setCostCurrency('CNY');
  };

  const handleSave = () => {
    onSave({
      products,
      displayCurrency,
      costCurrency,
      rates,
      exchangeRate: rates.CNY || exchangeRate
    });
    onClose();
  };

  if (!isOpen) return null;

  const costCurRate = rates[costCurrency] || DEFAULT_RATES[costCurrency] || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-strong)] w-full max-w-2xl max-h-[88vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[var(--gold)]" />
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">设置</h2>
          </div>
          <button onClick={onClose} className="btn-icon"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">

          {/* ===== 币种与汇率 ===== */}
          <section>
            <SectionTitle icon={Coins} title="币种与汇率" sub="利润显示币种 + 实时汇率获取" />

            <div className="mb-3">
              <label className="block text-xs text-[var(--text-tertiary)] mb-2">利润显示币种</label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {Object.values(CURRENCIES).map(c => (
                  <button
                    key={c.code}
                    onClick={() => setDisplayCurrency(c.code)}
                    className={`px-2 py-2 rounded-lg text-xs font-medium transition-all border
                      ${displayCurrency === c.code
                        ? 'bg-[var(--gold-soft)] text-[var(--gold-bright)] border-[rgba(212,160,86,0.4)]'
                        : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border)] hover:border-[var(--border-strong)]'
                      }`}
                    title={`${c.name} (${c.code})`}
                  >
                    <div className="text-base leading-none">{c.emoji}</div>
                    <div className="mt-1 text-[11px] font-medium">{c.name}</div>
                    <div className="text-[9px] text-[var(--text-tertiary)] mt-0.5">{c.code}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-xs text-[var(--text-tertiary)] mb-2">产品成本输入币种</label>
              <select
                value={costCurrency}
                onChange={e => setCostCurrency(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--gold)]"
              >
                {Object.values(CURRENCIES).map(c => (
                  <option key={c.code} value={c.code}>{c.emoji} {c.name} ({c.symbol})</option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
                输入成本时用此币种，保存时自动换算为 USD 内部存储
              </p>
            </div>

            <div className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[var(--text-secondary)]">实时汇率（USD → {costCurrency}）</span>
                <button
                  onClick={refreshRates}
                  disabled={rateStatus === 'loading'}
                  className="flex items-center gap-1.5 text-xs text-[var(--gold-bright)] hover:text-[var(--gold)] disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${rateStatus === 'loading' ? 'animate-spin' : ''}`} />
                  {rateStatus === 'loading' ? '获取中…' : '刷新汇率'}
                </button>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">
                  1 USD = {costCurRate.toFixed(4)} {costCurrency}
                </span>
                {rateStatus === 'done' && <span className="text-[10px] text-[var(--up)]">✓ 实时</span>}
                {rateStatus === 'error' && <span className="text-[10px] text-[var(--down)]">离线默认值</span>}
              </div>
              {lastUpdate && (
                <div className="text-[10px] text-[var(--text-muted)] mt-1">更新于 {lastUpdate}</div>
              )}
            </div>
          </section>

          {/* ===== 产品成本 ===== */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <SectionTitle icon={Tag} title="产品成本" sub={`以 ${costCurrency} 输入 · 自动换算 USD 存储`} noMargin />
              <button onClick={handleReset} className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
                <RotateCcw className="w-3 h-3" /> 默认
              </button>
            </div>

            <div className="space-y-1.5">
              {Object.entries(products).map(([name, usdCost]) => {
                const costInCur = usdCost * costCurRate;
                return (
                  <div key={name} className="group flex items-center gap-3 p-2.5 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors">
                    <div className="w-1 h-8 rounded-full bg-[var(--gold)] opacity-40" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[var(--text-primary)] truncate">{name}</div>
                      <div className="text-[10px] text-[var(--text-muted)] mt-0.5">≈ ${usdCost.toFixed(2)} USD</div>
                    </div>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] text-xs">
                        {CURRENCIES[costCurrency].symbol}
                      </span>
                      <input
                        type="number"
                        value={costInCur > 0 ? costInCur.toFixed(costCurrency === 'JPY' ? 0 : 2) : ''}
                        onChange={e => {
                          const v = parseFloat(e.target.value) || 0;
                          const usd = costCurrency === 'USD' ? v : v / costCurRate;
                          updateCost(name, usd);
                        }}
                        placeholder="0"
                        className="w-24 pl-7 pr-2 py-1.5 rounded-md bg-[var(--bg)] border border-[var(--border)] text-[var(--text-primary)] text-sm text-right tabular-nums outline-none focus:border-[var(--gold)]"
                      />
                    </div>
                    <button onClick={() => deleteOne(name)} className="text-[var(--text-tertiary)] hover:text-[var(--down)] opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {discoveredProducts.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-[rgba(212,160,86,0.06)] border border-[rgba(212,160,86,0.2)]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--gold-bright)]">
                    <Sparkles className="w-3.5 h-3.5" />
                    发现 {discoveredProducts.length} 个未配置产品（来自订单）
                  </div>
                  <button onClick={addAllDiscovered} className="text-[11px] text-[var(--gold-bright)] hover:text-[var(--gold)] underline">
                    全部添加
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {discoveredProducts.map(name => (
                    <button
                      key={name}
                      onClick={() => addDiscovered(name)}
                      className="chip chip-gold cursor-pointer hover:bg-[rgba(212,160,86,0.2)]"
                    >
                      <Plus className="w-3 h-3" />
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="产品名称"
                className="flex-1 px-3 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--gold)] placeholder-[var(--text-tertiary)]"
              />
              <input
                value={newCost}
                onChange={e => setNewCost(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addOne()}
                placeholder={`${CURRENCIES[costCurrency].symbol}成本`}
                className="w-24 px-3 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm text-right tabular-nums outline-none focus:border-[var(--gold)] placeholder-[var(--text-tertiary)]"
              />
              <button onClick={addOne} disabled={!newName.trim()} className="btn-icon disabled:opacity-30 disabled:cursor-not-allowed">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* ===== AI 生图模型配置 ===== */}
          <AIImageSection aiModels={aiModels} onUpdateAiModels={onUpdateAiModels} />
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="btn-ghost">取消</button>
          <button onClick={handleSave} className="btn-primary">
            <Save className="w-3.5 h-3.5" /> 保存
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, sub, noMargin }) {
  return (
    <div className={noMargin ? '' : 'mb-3'}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-[var(--gold)]" />
        <span className="text-[14px] font-semibold text-[var(--text-primary)]">{title}</span>
      </div>
      {sub && <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5 ml-6">{sub}</div>}
    </div>
  );
}

// ===================================================================
// AI 生图模型配置（多套预设）
// ===================================================================

const AI_PROVIDERS = [
  { key: 'evolink', label: 'EvoLink', defaultModel: 'gpt-image-2', defaultEndpoint: 'https://api.evolink.ai/v1/images/generations', signupUrl: 'https://evolink.ai/signup' },
  { key: 'openai', label: 'OpenAI', defaultModel: 'gpt-image-1', defaultEndpoint: 'https://api.openai.com/v1/images/generations', signupUrl: 'https://platform.openai.com' },
  { key: 'replicate', label: 'Replicate', defaultModel: 'black-forest-labs/flux-1.1-pro', defaultEndpoint: 'https://api.replicate.com/v1/predictions', signupUrl: 'https://replicate.com' },
  { key: 'together', label: 'Together AI', defaultModel: 'flux-1.1-pro', defaultEndpoint: 'https://api.together.xyz/v1/images/generations', signupUrl: 'https://together.ai' },
  { key: 'custom', label: '自定义', defaultModel: '', defaultEndpoint: '', signupUrl: '' }
];

function AIImageSection({ aiModels, onUpdateAiModels }) {
  const models = aiModels || [];
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [showKey, setShowKey] = useState({});

  const startAdd = () => {
    const id = `m_${Date.now()}`;
    setEditingId(id);
    setDraft({
      id,
      label: '',
      provider: 'evolink',
      model: 'gpt-image-2',
      apiKey: '',
      endpoint: 'https://api.evolink.ai/v1/images/generations'
    });
  };

  const startEdit = (m) => {
    setEditingId(m.id);
    setDraft({ ...m });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };

  const saveDraft = async () => {
    if (!draft.label.trim() || !draft.model.trim() || !draft.apiKey.trim()) {
      alert('请填写标签、模型名和 API Key');
      return;
    }
    const exists = models.find(m => m.id === draft.id);
    const next = exists
      ? models.map(m => m.id === draft.id ? draft : m)
      : [...models, draft];
    await onUpdateAiModels(next);
    cancelEdit();
  };

  const removeModel = async (id) => {
    if (!confirm('确定删除这个模型配置？')) return;
    await onUpdateAiModels(models.filter(m => m.id !== id));
  };

  const onProviderChange = (providerKey) => {
    const p = AI_PROVIDERS.find(x => x.key === providerKey);
    setDraft(d => ({
      ...d,
      provider: providerKey,
      model: d.model || p.defaultModel,
      endpoint: d.endpoint || p.defaultEndpoint
    }));
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon={Cpu} title="AI 生图模型" sub="预设多个模型配置（含 API Key）" noMargin />
        <button onClick={startAdd} className="btn-ghost text-xs">
          <Plus className="w-3 h-3" />
          添加模型
        </button>
      </div>

      {models.length === 0 && !draft && (
        <div className="p-4 rounded-lg bg-[var(--bg-elevated)] border border-dashed border-[var(--border)] text-center text-xs text-[var(--text-tertiary)]">
          还没有配置模型，点「添加模型」开始
        </div>
      )}

      <div className="space-y-2">
        {models.map(m => (
          <div key={m.id} className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[var(--gold-soft)] flex items-center justify-center flex-shrink-0">
                <Cpu className="w-4 h-4 text-[var(--gold-bright)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium text-[var(--text-primary)]">{m.label}</div>
                <div className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                  {AI_PROVIDERS.find(p => p.key === m.provider)?.label || m.provider} · <span className="font-mono">{m.model}</span>
                </div>
              </div>
              <button onClick={() => startEdit(m)} className="btn-icon w-8 h-8" title="编辑">
                <Tag className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => removeModel(m.id)} className="btn-icon w-8 h-8 hover:text-[var(--down)]" title="删除">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {draft && (
        <div className="mt-3 p-4 rounded-lg bg-[var(--bg-elevated)] border border-[var(--gold)] space-y-3 fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--gold-bright)]">{models.find(m => m.id === draft.id) ? '编辑模型' : '新模型'}</span>
            <button onClick={cancelEdit} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"><X className="w-3.5 h-3.5" /></button>
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">显示标签</label>
            <input
              value={draft.label}
              onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
              placeholder="如：EvoLink 标准版"
              className="w-full px-2.5 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">服务商（选了自动填默认值）</label>
            <select
              value={draft.provider}
              onChange={e => onProviderChange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--gold)]"
            >
              {AI_PROVIDERS.map(p => <option key={p.key} value={p.key}>{p.label}{p.defaultModel && ` (${p.defaultModel})`}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">模型名</label>
            <input
              value={draft.model}
              onChange={e => setDraft(d => ({ ...d, model: e.target.value }))}
              placeholder="gpt-image-2"
              className="w-full px-2.5 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-mono outline-none focus:border-[var(--gold)]"
            />
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">API Key</label>
            <div className="relative">
              <input
                type={showKey[draft.id] ? 'text' : 'password'}
                value={draft.apiKey}
                onChange={e => setDraft(d => ({ ...d, apiKey: e.target.value }))}
                placeholder="sk-xxxxxxxx"
                className="w-full px-2.5 py-1.5 pr-12 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm font-mono outline-none focus:border-[var(--gold)]"
              />
              <button
                onClick={() => setShowKey(s => ({ ...s, [draft.id]: !s[draft.id] }))}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                {showKey[draft.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-[var(--text-tertiary)] mb-1">API Endpoint（可选，一般自动填）</label>
            <input
              value={draft.endpoint}
              onChange={e => setDraft(d => ({ ...d, endpoint: e.target.value }))}
              placeholder="https://api.xxx.com/v1/images/generations"
              className="w-full px-2.5 py-1.5 rounded-md bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-xs font-mono outline-none focus:border-[var(--gold)]"
            />
          </div>

          {draft.provider !== 'custom' && (
            <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1.5">
              <Info className="w-3 h-3" />
              没有账号？<a href={AI_PROVIDERS.find(p => p.key === draft.provider)?.signupUrl} target="_blank" rel="noreferrer" className="text-[var(--gold-bright)] underline">点这里注册</a>
              · Key 仅你本人可见（存你的账户）
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={saveDraft} className="btn-primary text-xs flex-1">
              <Save className="w-3 h-3" /> 保存
            </button>
            <button onClick={cancelEdit} className="btn-ghost text-xs">取消</button>
          </div>
        </div>
      )}
    </section>
  );
}
