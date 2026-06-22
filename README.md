# Etsy Profit Dashboard

Etsy 销售数据分析 · 本地利润仪表盘

为 Etsy 卖家打造的一站式利润分析工具。导入月度账单 CSV，自动计算真实到手利润，
按多月合并、可调币种、批量产品成本配置，并生成专业 PDF 报告。

数据完全本地存储，不上传任何销售信息。

## 功能

### 数据导入
- 拖拽批量上传 Etsy Monthly Statement CSV
- 智能解析：自动识别订单、关联费用（两遍扫描处理 Etsy 行序）
- 自动从订单标题识别产品类型

### 仪表盘
- **HERO 焦点区** — 巨大净利润数字 + 环比 + 智能洞察
- **KPI 行** — 销售额/到账/利润/客单价，每张卡带 sparkline 微图
- **运营健康度** — 4 维加权评分（利润率/广告占比/退款率/利润规模）
- **现金流时间线** — 模拟 Etsy 14 天打款延迟
- **费用拆解** — 9 类费用透明展示
- **销售日历热力图** — GitHub-style 按日上色 + 月份翻阅

### 月份选择
- 单选 / 多选 / 全部 — 所有数据自动合并视图

### 成本与广告
- 产品成本管理 — 自动从订单发现产品 + 多币种输入
- 成本敏感度模拟 — 滑块调成本/汇率，实时看利润变化
- 广告 ROI 分析 — 站内外广告效率

### 多币种
- 7 种币种切换：USD/CNY/EUR/GBP/JPY/HKD/SGD
- 实时汇率获取（多 API 容灾）
- 切换瞬间所有金额按汇率联动

### 导出
- CSV 月度报表
- 专业 PDF 报告（区块化截图，避免分页切割，带实时进度）

## 技术栈

- **React 19** + **Vite** + **Tailwind CSS 4**
- **Recharts** — 图表与 sparkline
- **PapaParse** — CSV 解析
- **jsPDF** + **html2canvas** — PDF 导出
- **LocalStorage** — 本地数据持久化（无后端、无数据库）

## 环境要求

- Node.js ≥ 18
- npm ≥ 9（或 pnpm / yarn）

## 开发

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（热更新）
npm run dev
# → 访问 http://localhost:5173

# 3. 生产构建
npm run build
# → 输出到 dist/

# 4. 本地预览生产构建
npm run preview

# 5. 代码检查
npm run lint
```

## 使用说明

### 第一次使用

1. **导入数据** — 点击右上角「导入」按钮，把 Etsy Monthly Statement CSV 拖进去
   - 文件名格式需为 `etsy_statement_2026_4.csv`（程序从文件名提取月份）
   - 支持一次拖入多个文件批量导入
2. **配置成本** — 点右上角齿轮 → 设置
   - 选择「成本输入币种」（默认人民币）
   - 系统会自动发现订单里的产品，点「全部添加」后输入每个产品的成本
   - 点「刷新汇率」获取实时汇率
3. **查看仪表盘** — 所有利润数据自动计算

### 月份选择

- 顶部月份栏：点单个月份看单月，点多个月看合计，点「全部 N 月」看所有
- 日历组件右上角有独立的翻页器（不影响全局选择）

### 导出报表

- **CSV** — 月份栏的「CSV」按钮，下载该月完整明细
- **PDF** — 月份栏的「PDF」按钮，下载专业报告（带进度提示）

## 部署

### 静态托管（推荐）

构建后 `dist/` 是纯静态文件，可托管到任何静态服务：

**Vercel**
```bash
npm i -g vercel
vercel
```

**Netlify**
```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

**GitHub Pages**
```bash
npm run build
# 把 dist/ 内容推到 gh-pages 分支
```

**本地直接打开**
```bash
npm run build
# dist/ 文件夹双击 index.html 即可用（注：需配置 base 路径或用 preview）
npm run preview
```

### 自定义构建

修改 `vite.config.js` 可调整构建配置：
```js
export default defineConfig({
  base: '/your-sub-path/',  // 部署到子路径时
  plugins: [react(), tailwindcss()],
})
```

## 项目结构

```
src/
├── components/
│   ├── Sidebar.jsx          # 左侧导航（三大块）
│   ├── Topbar.jsx           # 顶栏 + 币种切换 + 导入按钮
│   ├── MonthSelector.jsx    # 月份多选 + 全部 + 对比
│   ├── HeroSection.jsx      # 净利润焦点区
│   ├── KPIRow.jsx           # 4 张 KPI 卡片
│   ├── KPICard.jsx          # 单张 KPI 卡（含 sparkline）
│   ├── Sparkline.jsx        # 通用微图
│   ├── HealthScore.jsx      # 运营健康度评分
│   ├── CashflowTimeline.jsx # 现金流时间线
│   ├── FeeBreakdown.jsx     # 费用拆解
│   ├── SalesHeatmap.jsx     # 销售日历热力图
│   ├── MonthlyTrendChart.jsx# 月度趋势柱状图
│   ├── ProductBreakdown.jsx # 产品利润分析
│   ├── OrderList.jsx        # 订单明细表（分页）
│   ├── RecentOrders.jsx     # 最新订单卡片
│   ├── CostSensitivity.jsx  # 成本敏感度模拟
│   ├── SettingsModal.jsx    # 设置（币种/汇率/产品成本）
│   ├── FileUploader.jsx     # CSV 拖拽上传
│   ├── PDFReportView.jsx    # PDF 报表视图
│   └── PDFProgressOverlay.jsx # PDF 导出进度
├── hooks/
│   ├── useEtsyData.js       # 核心数据管理（含多月合并）
│   └── useLocalStorage.js   # LocalStorage 封装
├── utils/
│   ├── csvParser.js         # CSV 解析（两遍扫描）
│   ├── profitCalculator.js  # 利润计算
│   ├── dailyAggregator.js   # 日聚合（sparkline 数据源）
│   ├── currency.js          # 多币种 + 汇率获取
│   ├── MoneyContext.jsx     # 货币上下文
│   ├── exporter.js          # CSV 导出
│   └── pdfExporter.js       # PDF 导出（区块化）
├── App.jsx
├── main.jsx
└── index.css                # 暖金主题样式
```

## 数据与隐私

- **所有数据保存在浏览器 LocalStorage**，不上传服务器
- `*.csv` 在 `.gitignore` 中排除，销售数据不会被提交到 git
- 汇率获取走公开 API（open.er-api.com），只请求汇率数字，不发送任何业务数据
- 清除浏览器数据 / 删除 LocalStorage 的 `etsy-profit-data` 键即可清空全部数据

## 利润计算逻辑

```
净利润 = Etsy 到账净额(Net) − 产品成本(USD)

其中：
  Etsy 到账净额 = 销售额 − 所有 Etsy 费用
  产品成本 = 各订单产品成本之和（按配置币种换算为 USD）

利润率 = 净利润 / 销售额 × 100%
```

费用类别（9 类）：交易手续费、处理费、销售税、运费标签、站内广告、站外广告、上架费、退款、其他。

## 许可证

MIT License — 详见 [LICENSE](./LICENSE)

---

为 LumiFlask 店铺打造 · Built with [Claude Code](https://claude.com/claude-code)
