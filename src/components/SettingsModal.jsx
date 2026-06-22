import { useState, useEffect, useMemo } from 'react';
import { X, Save, RotateCcw, Trash2, Plus, Sparkles, RefreshCw, Tag, Coins, Mail, Send, Info } from 'lucide-react';
import { CURRENCIES, DEFAULT_RATES, fetchRates } from '../utils/currency';
import { sendTestEmail } from '../utils/mailBackup';

const DEFAULT_PRODUCTS = {
  '40oz Stanley LSF': 140,
  '40oz LSF': 95,
  '40oz LSF 粉花': 110,
  '64oz Stanley': 120,
  '40oz Stanley 银钛': 130,
  '32oz 粉色蝴蝶结': 110,
  '32oz': 100
};

export default function SettingsModal({ isOpen, onClose, config, onSave, orders, mailConfig, onUpdateMailConfig, quota }) {
  const [products, setProducts] = useState({});
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [displayCurrency, setDisplayCurrency] = useState('USD');
  const [costCurrency, setCostCurrency] = useState('CNY');  // 输入成本时用的币种
  const [rates, setRates] = useState(DEFAULT_RATES);
  const [exchangeRate, setExchangeRate] = useState(7.2);  // 兼容旧逻辑
  const [rateStatus, setRateStatus] = useState('idle');   // idle|loading|done|error
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

  // 从订单中自动发现未配置的产品
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
    // 新成本按 costCurrency 输入，保存时转 USD
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

  // 当前 costCurrency 下的汇率显示
  const costCurRate = rates[costCurrency] || DEFAULT_RATES[costCurrency] || 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-strong)] w-full max-w-2xl max-h-[88vh] overflow-hidden shadow-2xl flex flex-col">
        {/* 头部 */}
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

            {/* 显示币种 */}
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

            {/* 成本输入币种 */}
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

            {/* 汇率获取 */}
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

            {/* 已配置产品列表 */}
            <div className="space-y-1.5">
              {Object.entries(products).map(([name, usdCost]) => {
                // 显示为成本币种
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

            {/* 自动发现的产品 */}
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

            {/* 手动添加 */}
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

          {/* ===== 邮件备份 ===== */}
          <MailBackupSection mailConfig={mailConfig} updateMailConfig={onUpdateMailConfig} quota={quota} />
        </div>

        {/* 底部 */}
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
// 邮件备份配置（多用户版：数据来自 Supabase profiles 表）
// ===================================================================
function MailBackupSection({ mailConfig, updateMailConfig, quota }) {
  const [localEnabled, setLocalEnabled] = useState(mailConfig?.enabled || false);
  const [localTo, setLocalTo] = useState(mailConfig?.to || '');
  const [testStatus, setTestStatus] = useState(null);

  // 同步外部 mailConfig
  useEffect(() => {
    setLocalEnabled(mailConfig?.enabled || false);
    setLocalTo(mailConfig?.to || '');
  }, [mailConfig?.enabled, mailConfig?.to]);

  const update = async (patch) => {
    if (patch.enabled !== undefined) {
      setLocalEnabled(patch.enabled);
      await updateMailConfig({ mailEnabled: patch.enabled });
    }
    if (patch.to !== undefined) {
      setLocalTo(patch.to);
    }
  };

  // 邮箱输入失焦时保存
  const handleToBlur = async () => {
    if (localTo !== mailConfig?.to) {
      await updateMailConfig({ mailTo: localTo });
    }
  };

  const handleTest = async () => {
    if (localTo !== mailConfig?.to) {
      await updateMailConfig({ mailTo: localTo });
    }
    setTestStatus({ type: 'sending', text: '入队中...' });
    const result = await sendTestEmail();
    if (result.ok) {
      setTestStatus({ type: 'success', text: `✓ 已入队，今晚 23:00 发送` });
    } else {
      setTestStatus({ type: 'error', text: `失败：${result.error}` });
    }
    setTimeout(() => setTestStatus(null), 8000);
  };

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(localTo);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle icon={Mail} title="邮件备份" sub="上传 CSV 后入队，每天 23:00 统一发送" noMargin />
        <button
          onClick={() => update({ enabled: !localEnabled })}
          className={`relative w-11 h-6 rounded-full transition-colors ${localEnabled ? 'bg-[var(--gold)]' : 'bg-[var(--border-strong)]'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${localEnabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {localEnabled && (
        <div className="space-y-3">
          {/* 收件邮箱 */}
          <div>
            <label className="block text-xs text-[var(--text-tertiary)] mb-1.5">收件邮箱</label>
            <input
              type="email"
              value={localTo}
              onChange={e => setLocalTo(e.target.value)}
              onBlur={handleToBlur}
              placeholder="your-email@example.com"
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm outline-none focus:border-[var(--gold)] placeholder-[var(--text-tertiary)]"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              失焦自动保存。注：默认 onboarding@resend.dev 只能发到你 Resend 账户邮箱
            </p>
          </div>

          {/* 配额显示 */}
          {quota && (
            <div className="p-3 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border)]">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-secondary)]">本月邮件配额</span>
                <span className="tabular-nums text-[var(--text-primary)] font-medium">
                  {quota.emails} / {quota.emailLimit}
                </span>
              </div>
              <div className="h-1.5 mt-2 rounded-full bg-[var(--bg)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#d4a056] to-[#f5b955]"
                  style={{ width: `${Math.min(100, (quota.emails / quota.emailLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* 测试按钮 */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTest}
              disabled={!validEmail || testStatus?.type === 'sending'}
              className="btn-ghost text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-3 h-3" />
              {testStatus?.type === 'sending' ? '入队中...' : '测试入队'}
            </button>
            {testStatus && (
              <span className={`text-xs ${
                testStatus.type === 'success' ? 'text-[var(--up)]' :
                testStatus.type === 'error' ? 'text-[var(--down)]' :
                'text-[var(--gold-bright)]'
              }`}>
                {testStatus.text}
              </span>
            )}
          </div>

          {/* 发送机制说明 */}
          <div className="p-3 rounded-lg bg-[rgba(212,160,86,0.06)] border border-[rgba(212,160,86,0.15)] flex gap-2">
            <Info className="w-3.5 h-3.5 text-[var(--gold)] flex-shrink-0 mt-0.5" />
            <div className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              <div className="font-medium text-[var(--gold-bright)] mb-1">⏰ 每天 23:00 定时批量发送</div>
              上传的 CSV 不会立即发，而是暂存在服务器队列，当天 23:00（北京时间）统一打包成一封邮件发到你的邮箱。
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
