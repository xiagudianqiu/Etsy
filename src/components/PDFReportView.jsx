import { useMemo } from 'react';
import { calculateOrderProfit } from '../utils/profitCalculator';
import { formatMoney, CURRENCIES } from '../utils/currency';

/**
 * PDF 报表视图 — 区块化结构，避免分页切割
 * 每个 [data-pdf-block] 元素是一个完整、不可分割的章节
 * pdfExporter 会逐个截图并智能翻页
 */
export default function PDFReportView({ monthKey, monthData, profitData, config, allMonthsSummary, adROI, selectedMonths = [] }) {
  if (!monthData || !profitData) return null;

  const displayCurrency = config?.displayCurrency || 'USD';
  const rates = config?.rates || {};
  const cur = CURRENCIES[displayCurrency] || CURRENCIES.USD;
  const fmt = (usd, decimals = 2) => formatMoney(usd, displayCurrency, rates, { decimals });
  const fmt0 = (usd) => formatMoney(usd, displayCurrency, rates, { decimals: 0 });

  const exRate = config?.exchangeRate || 7.2;
  const productCosts = config?.products || {};
  const orders = monthData.orders || [];
  const s = monthData.summary || {};

  const titleMonth = monthData.isMerged
    ? `全部 ${selectedMonths.length || (monthData.mergedMonths?.length || 2)} 个月合计`
    : (() => {
        if (!monthKey) return '';
        const [y, m] = monthKey.split('-');
        return `${y} 年 ${parseInt(m)} 月`;
      })();

  // 产品聚合
  const byProduct = useMemo(() => {
    const map = {};
    orders.forEach(o => {
      const p = o.product || '未识别';
      if (!map[p]) map[p] = { count: 0, sales: 0, fees: 0, costUSD: 0, profit: 0 };
      const costRMB = productCosts[p] ?? 95;
      const costUSD = costRMB > 30 ? costRMB / exRate : costRMB;
      map[p].count++;
      map[p].sales += o.sale || 0;
      map[p].fees += o.totalFees || 0;
      map[p].costUSD += costUSD;
      map[p].profit += calculateOrderProfit(o, productCosts, exRate);
    });
    return Object.entries(map).sort((a, b) => b[1].profit - a[1].profit);
  }, [orders, productCosts, exRate]);

  // 费用项
  const feeItems = [
    ['交易手续费', Math.max(0, s.totalTransactionFee || 0), '6.5% 销售佣金'],
    ['处理费', Math.max(0, s.totalProcessingFee || 0), '3% + $0.25'],
    ['销售税', Math.max(0, s.totalTax || 0), 'Etsy 代收'],
    ['运费标签', Math.max(0, s.totalShipping || 0), 'USPS 运单'],
    ['站内广告', Math.max(0, s.totalEtsyAds || 0), 'Etsy Ads'],
    ['站外广告', Math.max(0, s.totalOffsiteAds || 0), 'Offsite Ads'],
    ['上架费', Math.max(0, s.totalListingFee || 0), '$0.20/listing'],
    ['退款', Math.max(0, s.totalRefund || 0), '退给买家'],
    ['其他', Math.max(0, s.otherFees || 0), '订阅等']
  ].filter(([, v]) => v > 0.01);
  const maxFee = Math.max(...feeItems.map(([, v]) => v), 0.01);

  // 健康度
  const health = useMemo(() => {
    if (!s.totalSales) return null;
    const rate = profitData.profitRate || 0;
    const adCost = Math.max(0, s.totalEtsyAds || 0) + Math.max(0, s.totalOffsiteAds || 0);
    const adPct = (adCost / s.totalSales) * 100;
    const refundPct = (Math.max(0, s.totalRefund || 0) / s.totalSales) * 100;
    const rateScore = rate >= 45 ? 100 : rate >= 35 ? 80 : rate >= 25 ? 60 : rate >= 15 ? 40 : 20;
    const adScore = adPct < 3 ? 100 : adPct < 6 ? 80 : adPct < 10 ? 60 : adPct < 15 ? 40 : 20;
    const refundScore = refundPct > 10 ? 20 : refundPct > 5 ? 50 : refundPct > 2 ? 70 : refundPct > 0 ? 90 : 100;
    const absScore = profitData.profit >= 500 ? 100 : profitData.profit >= 300 ? 80 : profitData.profit >= 150 ? 60 : profitData.profit >= 50 ? 40 : 20;
    return {
      total: Math.round(rateScore * 0.35 + adScore * 0.25 + refundScore * 0.20 + absScore * 0.20),
      adPct, refundPct
    };
  }, [s, profitData]);

  const today = new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });

  // 订单分批：每页最多 14 行
  const ORDERS_PER_BLOCK = 14;
  const orderBatches = [];
  for (let i = 0; i < orders.length; i += ORDERS_PER_BLOCK) {
    orderBatches.push(orders.slice(i, i + ORDERS_PER_BLOCK));
  }

  // 共享样式
  const rootStyle = {
    width: '794px',
    background: '#fefdfb',
    color: '#1a1612',
    fontFamily: '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif',
    fontSize: '13px',
    lineHeight: 1.6
  };
  const blockStyle = { padding: '0 56px', background: '#fefdfb' };
  // 首个 block 加上下 padding，其他只加下 padding
  const firstBlockStyle = { ...blockStyle, paddingTop: '40px', paddingBottom: '12px' };
  const midBlockStyle = { ...blockStyle, paddingBottom: '12px', paddingTop: '4px' };

  return (
    <div id="pdf-report-root" style={rootStyle}>

      {/* ===== 区块 1：封面 + 核心指标 ===== */}
      <div data-pdf-block="cover" style={firstBlockStyle}>
        {/* 报头 */}
        <div style={{ borderBottom: '3px solid #d4a056', paddingBottom: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: '10px', color: '#a8967a', letterSpacing: '0.2em', marginBottom: '6px' }}>LUMIFLASK · ETSY PROFIT</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1612', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              利润分析报告
            </div>
            <div style={{ fontSize: '14px', color: '#6b5d52', marginTop: '6px' }}>{titleMonth}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '10px', color: '#a8967a' }}>
            <div>报告生成</div>
            <div style={{ color: '#6b5d52', marginTop: '3px', fontSize: '11px' }}>{today}</div>
            <div style={{ marginTop: '6px', color: '#6b5d52' }}>币种：{cur.name} ({cur.symbol})</div>
          </div>
        </div>

        {/* 核心指标 */}
        <SectionTitle>一、核心指标</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          <KPI label="销售额" value={fmt(profitData.totalSales)} sub={`${profitData.orderCount} 笔订单`} />
          <KPI label="Etsy 到账" value={fmt(profitData.netAmount)} sub={`扣费 ${fmt0(profitData.totalFees)}`} />
          <KPI label="净利润" value={fmt(profitData.profit)} sub={`≈ ¥${(profitData.profit * exRate).toFixed(0)}`} highlight />
          <KPI label="利润率" value={`${profitData.profitRate.toFixed(1)}%`} sub={profitData.profitRate >= 40 ? '健康' : profitData.profitRate >= 25 ? '可接受' : '偏低'} />
        </div>
      </div>

      {/* ===== 区块 2：利润全流程 ===== */}
      <div data-pdf-block="profit-flow" style={midBlockStyle}>
        <SectionTitle>二、利润全流程</SectionTitle>
        <div style={{ background: '#faf6ef', border: '1px solid #ebe0cc', borderRadius: '8px', padding: '18px 24px' }}>
          <FlowRow label="① 销售额（Gross Sales）" value={fmt(profitData.totalSales)} color="#1a1612" />
          <FlowRow label="② Etsy 扣除各项费用" value={`- ${fmt(profitData.totalFees)}`} color="#c0392b" />
          <FlowRow label="③ Etsy 实际到账（Net）" value={fmt(profitData.netAmount)} color="#1e8a4a" bold />
          <FlowRow label="④ 减去产品成本" value={`- ${fmt(profitData.productCostUSD)}`} color="#c0392b" />
          <div style={{ borderTop: '2px solid #d4a056', marginTop: '10px', paddingTop: '10px' }}>
            <FlowRow label="⑤ 实际净利润" value={fmt(profitData.profit)} color="#b8853d" bold large />
          </div>
        </div>
      </div>

      {/* ===== 区块 3：费用拆解 ===== */}
      <div data-pdf-block="fees" style={midBlockStyle}>
        <SectionTitle>三、费用拆解 · 钱去哪了</SectionTitle>
        <div style={{ border: '1px solid #ebe0cc', borderRadius: '8px', overflow: 'hidden' }}>
          {feeItems.map(([name, value, desc], i) => (
            <div key={name} style={{
              display: 'flex', alignItems: 'center', padding: '10px 18px',
              borderBottom: i < feeItems.length - 1 ? '1px solid #f0e8d6' : 'none',
              background: i % 2 ? '#faf8f3' : 'transparent'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12.5px', color: '#1a1612', fontWeight: 500 }}>{name}</div>
                <div style={{ fontSize: '10px', color: '#a8967a', marginTop: '2px' }}>{desc}</div>
              </div>
              <div style={{ width: '130px', marginRight: '14px' }}>
                <div style={{ height: '5px', background: '#f0e8d6', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(value / maxFee) * 100}%`, background: 'linear-gradient(90deg, #d4a056, #b8853d)', borderRadius: '3px' }} />
                </div>
              </div>
              <div style={{ width: '90px', textAlign: 'right', fontSize: '12.5px', color: '#c0392b', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {fmt(value)}
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 18px', background: '#faf6ef', borderTop: '2px solid #d4a056' }}>
            <span style={{ fontWeight: 600, color: '#1a1612' }}>费用合计</span>
            <span style={{ fontWeight: 700, color: '#c0392b', fontVariantNumeric: 'tabular-nums' }}>{fmt(profitData.totalFees)}</span>
          </div>
        </div>
      </div>

      {/* ===== 区块 4：产品利润 ===== */}
      <div data-pdf-block="products" style={midBlockStyle}>
        <SectionTitle>四、产品利润分析</SectionTitle>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
          <thead>
            <tr style={{ background: '#faf6ef' }}>
              {['产品', '销量', '销售额', '费用', '成本', '净利润', '利润率'].map((h, i) => (
                <th key={h} style={{ padding: '9px 10px', textAlign: i <= 1 ? 'left' : 'right', color: '#6b5d52', fontWeight: 600, fontSize: '10px', borderBottom: '2px solid #d4a056' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byProduct.map(([name, p]) => {
              const rate = p.sales > 0 ? (p.profit / p.sales) * 100 : 0;
              return (
                <tr key={name} style={{ borderBottom: '1px solid #f0e8d6' }}>
                  <td style={{ padding: '8px 10px', color: '#1a1612', fontWeight: 500 }}>{name}</td>
                  <td style={{ padding: '8px 10px', color: '#6b5d52', fontVariantNumeric: 'tabular-nums' }}>{p.count}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#1a1612', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.sales)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#c0392b', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.fees)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#6b5d52', fontVariantNumeric: 'tabular-nums' }}>{fmt(p.costUSD)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#b8853d', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmt(p.profit)}</td>
                  <td style={{ padding: '8px 10px', textAlign: 'right', color: '#6b5d52', fontVariantNumeric: 'tabular-nums' }}>{rate.toFixed(0)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===== 区块 5+：订单明细（分批，每批一个区块） ===== */}
      {orderBatches.map((batch, batchIdx) => (
        <div key={batchIdx} data-pdf-block={`orders-${batchIdx}`} style={midBlockStyle}>
          <SectionTitle>
            五、订单明细
            <span style={{ fontSize: '11px', fontWeight: 400, color: '#a8967a', marginLeft: '8px' }}>
              （共 {orders.length} 笔
              {orderBatches.length > 1 ? ` · 第 ${batchIdx + 1} / ${orderBatches.length} 部分` : ''}）
            </span>
          </SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10.5px' }}>
            <thead>
              <tr style={{ background: '#faf6ef' }}>
                {['订单号', '日期', '产品', '销售额', '费用', '成本', '利润', '率'].map((h, i) => (
                  <th key={h} style={{ padding: '8px 9px', textAlign: i <= 2 ? 'left' : 'right', color: '#6b5d52', fontWeight: 600, fontSize: '10px', borderBottom: '2px solid #d4a056' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batch.map(o => {
                const costRMB = productCosts[o.product] ?? 95;
                const costUSD = costRMB > 30 ? costRMB / exRate : costRMB;
                const profit = calculateOrderProfit(o, productCosts, exRate);
                const rate = o.sale > 0 ? (profit / o.sale) * 100 : 0;
                return (
                  <tr key={o.orderId} style={{ borderBottom: '1px solid #f0e8d6' }}>
                    <td style={{ padding: '7px 9px', color: '#a8967a', fontFamily: 'monospace', fontSize: '9.5px' }}>#{o.orderId}</td>
                    <td style={{ padding: '7px 9px', color: '#6b5d52' }}>{o.date}</td>
                    <td style={{ padding: '7px 9px', color: '#6b5d52' }}>{o.product || '-'}</td>
                    <td style={{ padding: '7px 9px', textAlign: 'right', color: '#1a1612', fontVariantNumeric: 'tabular-nums' }}>{fmt(o.sale)}</td>
                    <td style={{ padding: '7px 9px', textAlign: 'right', color: '#c0392b', fontVariantNumeric: 'tabular-nums' }}>{fmt(o.totalFees)}</td>
                    <td style={{ padding: '7px 9px', textAlign: 'right', color: '#6b5d52', fontVariantNumeric: 'tabular-nums' }}>{fmt(costUSD)}</td>
                    <td style={{ padding: '7px 9px', textAlign: 'right', color: profit >= 0 ? '#1e8a4a' : '#c0392b', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(profit)}</td>
                    <td style={{ padding: '7px 9px', textAlign: 'right', color: '#6b5d52', fontVariantNumeric: 'tabular-nums' }}>{rate.toFixed(0)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* ===== 区块：健康度 ===== */}
      {health !== null && (
        <div data-pdf-block="health" style={midBlockStyle}>
          <SectionTitle>六、运营健康度</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', background: '#faf6ef', border: '1px solid #ebe0cc', borderRadius: '8px', padding: '18px 24px' }}>
            <div style={{ textAlign: 'center', minWidth: '90px' }}>
              <div style={{ fontSize: '40px', fontWeight: 700, color: health.total >= 80 ? '#1e8a4a' : health.total >= 60 ? '#b8853d' : '#c0392b', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{health.total}</div>
              <div style={{ fontSize: '10px', color: '#a8967a', marginTop: '4px' }}>满分 100</div>
            </div>
            <div style={{ flex: 1, fontSize: '12px', color: '#6b5d52', lineHeight: 1.8 }}>
              <div>· 利润率 <strong style={{ color: '#1a1612' }}>{profitData.profitRate.toFixed(1)}%</strong> {profitData.profitRate >= 40 ? '— 健康水平' : profitData.profitRate >= 25 ? '— 可接受' : '— 偏低'}</div>
              <div>· 广告占比 <strong style={{ color: '#1a1612' }}>{health.adPct.toFixed(1)}%</strong></div>
              <div>· 退款率 <strong style={{ color: '#1a1612' }}>{health.refundPct.toFixed(1)}%</strong></div>
              <div>· 综合评级：<strong style={{ color: health.total >= 80 ? '#1e8a4a' : health.total >= 60 ? '#b8853d' : '#c0392b' }}>{health.total >= 80 ? '优秀' : health.total >= 60 ? '良好' : health.total >= 40 ? '注意' : '需改善'}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 区块：店铺累计（多月时） ===== */}
      {allMonthsSummary && allMonthsSummary.monthCount > 1 && (
        <div data-pdf-block="summary" style={midBlockStyle}>
          <SectionTitle>七、店铺累计（{allMonthsSummary.monthCount} 个月）</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <KPI label="累计销售额" value={fmt(allMonthsSummary.totalSales)} sub={`月均 ${fmt0(allMonthsSummary.totalSales / allMonthsSummary.monthCount)}`} />
            <KPI label="累计净利润" value={fmt(allMonthsSummary.totalProfit)} sub={`月均 ${fmt0(allMonthsSummary.avgMonthProfit)}`} highlight />
            <KPI label="平均利润率" value={`${allMonthsSummary.profitRate.toFixed(1)}%`} sub="综合所有月份" />
            <KPI label="累计订单" value={`${allMonthsSummary.totalOrders}`} sub={`客单价 ${fmt0(allMonthsSummary.avgOrderValue)}`} />
          </div>
        </div>
      )}

      {/* ===== 区块：页脚 ===== */}
      <div data-pdf-block="footer" style={{ ...blockStyle, paddingTop: '20px', paddingBottom: '32px' }}>
        <div style={{ borderTop: '1px solid #ebe0cc', paddingTop: '16px', textAlign: 'center', fontSize: '10px', color: '#a8967a' }}>
          本报告由 Etsy Profit Dashboard 自动生成 · 数据基于 Etsy Monthly Statement CSV · {cur.name}计价
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1612', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ display: 'inline-block', width: '4px', height: '15px', background: '#d4a056', borderRadius: '2px' }} />
      {children}
    </div>
  );
}

function KPI({ label, value, sub, highlight }) {
  return (
    <div style={{ background: highlight ? '#faf6ef' : '#fcfaf5', border: highlight ? '1px solid #d4a056' : '1px solid #ebe0cc', borderRadius: '8px', padding: '12px 14px' }}>
      <div style={{ fontSize: '10px', color: '#a8967a', marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '18px', fontWeight: 700, color: highlight ? '#b8853d' : '#1a1612', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: '10px', color: '#a8967a', marginTop: '5px' }}>{sub}</div>
    </div>
  );
}

function FlowRow({ label, value, color, bold, large }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0' }}>
      <span style={{ fontSize: large ? '14px' : '12.5px', color: '#6b5d52', fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: large ? '22px' : '14px', fontWeight: bold ? 700 : 600, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  );
}