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

- React 19 + Vite + Tailwind CSS 4
- Recharts（图表）+ PapaParse（CSV 解析）
- jsPDF + html2canvas（PDF 导出）
- LocalStorage（本地数据持久化）

## 开发

```bash
npm install
npm run dev      # 启动 http://localhost:5173
npm run build    # 生产构建
```

## 数据说明

所有数据保存在浏览器 LocalStorage，不上传服务器。`*.csv` 在 `.gitignore` 中排除，
不会被提交到 git 仓库。

---

为 LumiFlask 店铺打造 · Built with [Claude Code](https://claude.com/claude-code)
