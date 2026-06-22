import {
  LayoutDashboard, ShoppingCart, Coins,
  Settings, TrendingUp
} from 'lucide-react';

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: '仪表盘',
    icon: LayoutDashboard,
    desc: '店铺总览 · 健康度'
  },
  {
    id: 'orders',
    label: '订单',
    icon: ShoppingCart,
    desc: '订单 · 产品 · 费用'
  },
  {
    id: 'cost',
    label: '成本与广告',
    icon: Coins,
    desc: '成本 · ROI · 模拟'
  }
];

export default function Sidebar({ activePage, onPageChange, onSettingsClick, monthCount, orderCount }) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] border-r border-[var(--border)] bg-[var(--bg-elevated)] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#d4a056] to-[#8a6630] shadow-[0_2px_8px_rgba(212,160,86,0.3)]">
            <TrendingUp className="w-5 h-5 text-[#1a1208]" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-[14px] font-semibold text-[var(--text-primary)] leading-tight">Etsy Profit</h1>
            <p className="text-[10px] text-[var(--text-tertiary)] tracking-wider uppercase mt-0.5">LumiFlask</p>
          </div>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = activePage === item.id;
          const badge = item.id === 'orders' && orderCount > 0 ? orderCount
            : item.id === 'dashboard' && monthCount > 0 ? monthCount
            : null;
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`
                w-full flex items-start gap-3 px-3 py-3 rounded-xl transition-all relative text-left
                ${active
                  ? 'bg-[rgba(212,160,86,0.08)]'
                  : 'hover:bg-[rgba(255,255,255,0.03)]'
                }
              `}
            >
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-[2px] bg-[var(--gold-bright)] rounded-full" />
              )}
              <Icon
                className={`w-5 h-5 mt-0.5 flex-shrink-0 ${active ? 'text-[var(--gold-bright)]' : 'text-[var(--text-tertiary)]'}`}
                strokeWidth={active ? 2.25 : 2}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-[13.5px] font-medium ${active ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                    {item.label}
                  </span>
                  {badge !== null && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[rgba(255,255,255,0.05)] text-[var(--text-tertiary)] tabular-nums">
                      {badge}
                    </span>
                  )}
                </div>
                <div className="text-[10.5px] text-[var(--text-tertiary)] mt-0.5">{item.desc}</div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* 底部 */}
      <div className="px-3 py-3 border-t border-[var(--border)] space-y-1">
        <button
          onClick={onSettingsClick}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13.5px] font-medium text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text-primary)] transition-all"
        >
          <Settings className="w-4 h-4" />
          设置
        </button>
        <div className="px-3 py-2 flex items-center justify-between text-[10px] text-[var(--text-tertiary)]">
          <span>v1.0 · 本地存储</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--up)]" />
            <span>同步</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
