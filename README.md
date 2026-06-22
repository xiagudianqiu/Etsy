# Etsy Profit Dashboard

> Etsy 销售数据多用户利润分析仪表盘 · 暖金高级风 · React + Supabase

为 Etsy 卖家打造的一站式利润分析平台。导入月度账单 CSV，自动计算真实到手利润，
按多月合并、可调币种、批量产品成本配置，生成专业 PDF 报告，并可每天 23:00 自动邮件备份。

**多用户架构**：每个卖家账号独立隔离，支持几十~几百用户同时使用。

🌐 在线版本：部署到 Vercel 后访问你的域名（见 [部署文档](./docs/DEPLOYMENT.md)）

---

## 截图预览

- 🔐 邮箱密码登录页（暖金 + 渐变光晕）
- 📊 仪表盘：HERO 焦点 + 4 KPI 卡片（带 sparkline） + 健康度评分 + 现金流时间线
- 📅 销售日历热力图（GitHub-style）+ 月份翻阅
- 📦 产品利润分析（冠军徽章）
- 📋 订单明细（分页/搜索/排序）
- ⚙ 设置：7 种币种切换、产品成本管理、邮件备份配置
- 📄 PDF 导出（带实时进度遮罩）

---

## 功能清单

### 📥 数据导入
- 拖拽 / 点击批量上传 Etsy Monthly Statement CSV
- 智能解析：两遍扫描处理 Etsy 行序问题（费用行先于 Sale 行）
- 自动从 Transaction fee 标题识别产品类型（如 `40oz Stanley LSF`、`64oz Stanley`、`32oz 粉色蝴蝶结`）
- 每个文件独立显示状态（✓ 成功 / ✕ 失败 + 错误原因）

### 📊 仪表盘
- **HERO 焦点区** — 巨大净利润数字 + 环比 + 自动洞察（手续费占比/明星产品/广告效率）
- **KPI 行** — 销售额 / 净利润 / 到账 / 客单价 / 订单数，每张卡带 sparkline 微图
- **运营健康度** — 4 维加权评分（利润率 35% + 广告占比 25% + 退款率 20% + 利润规模 20%）
- **现金流时间线** — 模拟 Etsy 14 天打款延迟，区分"本月已到账"vs"等待到账"
- **费用拆解** — 9 类费用全透明（手续费/处理费/税/运费/站内广告/站外广告/Listing/退款/其他）
- **销售日历热力图** — GitHub-style 按日上色，悬停看订单明细
- **月度趋势柱状图** — 当前月金色高亮
- **产品冠军表** — 按利润排序，第一名带奖杯徽章
- **订单明细表** — 分页 / 搜索 / 排序

### 📅 月份选择
- **单选** — 看单月数据
- **多选** — 选两个或多个月，自动合并视图
- **全部 N 月** — 一键看所有数据合计
- KPI 卡片在多月模式自动显示「月均」+「累计」字段

### 💱 多币种支持
- 7 种货币切换：USD / CNY / EUR / GBP / JPY / HKD / SGD
- 实时汇率获取（多 API 容灾：open.er-api.com + exchangerate-api.com）
- 切换瞬间所有金额（仪表盘 / 订单 / 产品 / 费用 / PDF）按汇率联动
- 顶栏快速切换器 + 设置里完整切换

### 🏷 产品成本管理
- 设置面板自动扫描订单，发现未配置的产品 → 一键「全部添加」
- 多币种输入成本（默认 CNY），内部自动换算 USD 存储
- 成本敏感度模拟器：拖滑块 ±¥30/件 或 ±0.5 汇率，实时看利润变化

### 📨 邮件备份（可选）
- 上传 CSV 后入队到 Supabase `mail_queue` 表
- Vercel Cron 每天 23:00（北京时间）批量打包成一封邮件发到用户邮箱
- 邮件正文含文件清单 + 当日合计销售/利润/订单数
- 多个 CSV 作为多附件（不会刷屏）

### 📤 报表导出
- **CSV 导出** — 月度报表（概览 + 费用拆解 + 订单明细）
- **PDF 导出** — 区块化设计，避免分页切割，带实时进度遮罩，浅色专业风

### 🔐 多用户隔离
- Supabase Auth 邮箱密码登录
- Row Level Security（RLS）从数据库层强制隔离 — 任何查询自动带 `where user_id = current_user`
- 每月配额：30 次上传 + 31 封邮件，每月 1 号自动重置
- 侧边栏显示当前用户邮箱 + 配额进度条 + 登出按钮

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 前端 | React 19, Vite 7, Tailwind CSS 4 |
| 数据 | Supabase（PostgreSQL + Auth + RLS） |
| 图表 | Recharts 3 |
| CSV | PapaParse |
| PDF | jsPDF + html2canvas（区块化截图） |
| 后端 | Vercel Serverless Functions |
| 邮件 | Resend |
| 部署 | Vercel（含 Cron） |
| 图标 | Lucide React |

---

## 项目结构

```
etsy-profit-dashboard/
├── api/                              # Vercel Serverless 函数
│   ├── _lib/supabase.js              # 服务端 admin 客户端
│   ├── queue-csv.js                  # CSV 入队（身份验证+配额检查）
│   ├── cron-send.js                  # 每天 23:00 批量发送
│   └── reset-quota.js                # 每月 1 号重置配额
├── docs/
│   └── DEPLOYMENT.md                 # 部署指南
├── public/                           # 静态资源
├── src/
│   ├── components/                   # React 组件
│   │   ├── AuthGuard.jsx             # 登录守卫
│   │   ├── AuthPage.jsx              # 登录/注册页
│   │   ├── Sidebar.jsx               # 侧边栏（用户信息 + 配额）
│   │   ├── Topbar.jsx                # 顶栏（币种切换 + 导入）
│   │   ├── MonthSelector.jsx         # 月份多选 + 全部 + 对比
│   │   ├── HeroSection.jsx           # HERO 焦点区
│   │   ├── KPIRow.jsx                # KPI 行（带 sparkline）
│   │   ├── HealthScore.jsx           # 健康度评分
│   │   ├── CashflowTimeline.jsx      # 现金流时间线
│   │   ├── FeeBreakdown.jsx          # 费用拆解
│   │   ├── SalesHeatmap.jsx          # 销售日历热力图
│   │   ├── MonthlyTrendChart.jsx     # 月度趋势柱状图
│   │   ├── ProductBreakdown.jsx      # 产品利润分析
│   │   ├── OrderList.jsx             # 订单明细表
│   │   ├── RecentOrders.jsx          # 最新订单卡片
│   │   ├── CostSensitivity.jsx       # 成本敏感度模拟
│   │   ├── SettingsModal.jsx         # 设置面板
│   │   ├── FileUploader.jsx          # CSV 拖拽上传
│   │   ├── PDFReportView.jsx         # PDF 报表视图
│   │   ├── PDFProgressOverlay.jsx    # PDF 导出进度
│   │   └── ...
│   ├── hooks/
│   │   ├── useAuth.js                # 认证 hook
│   │   └── useEtsyData.js            # 核心数据管理（Supabase）
│   ├── utils/
│   │   ├── supabase.js               # Supabase 客户端
│   │   ├── csvParser.js              # CSV 解析（两遍扫描）
│   │   ├── profitCalculator.js       # 利润计算
│   │   ├── dailyAggregator.js        # 日聚合（sparkline 数据）
│   │   ├── currency.js               # 多币种 + 汇率
│   │   ├── MoneyContext.jsx          # 货币上下文
│   │   ├── mailBackup.js             # 邮件备份调用
│   │   ├── exporter.js               # CSV 导出
│   │   └── pdfExporter.js            # PDF 导出
│   ├── App.jsx
│   ├── main.jsx                      # 顶层（含 AuthGuard）
│   └── index.css                     # 暖金主题
├── supabase/
│   └── migrations/
│       └── 0001_init.sql             # 数据库迁移（建表 + RLS + 函数）
├── .env.example                      # 环境变量模板
├── .gitignore                        # 已排除 *.csv 等
├── vercel.json                       # Vercel 配置 + Cron
├── package.json
└── README.md                         # 本文件
```

---

## 本地开发

### 环境要求
- Node.js ≥ 18
- npm ≥ 9
- Supabase 账号（免费）

### 步骤

```bash
# 1. 克隆仓库
git clone https://github.com/xiagudianqiu/Etsy.git
cd Etsy

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入 Supabase URL 和 anon key（详见部署文档）

# 4. 在 Supabase 后台跑 supabase/migrations/0001_init.sql

# 5. 启动 dev server
npm run dev
# → 访问 http://localhost:5173
```

详细的 Supabase 配置见 [部署文档](./docs/DEPLOYMENT.md)。

### 其他命令
```bash
npm run build       # 生产构建
npm run preview     # 本地预览生产构建
npm run lint        # 代码检查
```

---

## 利润计算逻辑

```
净利润 = Etsy 到账净额 − 产品成本(USD)

其中：
  Etsy 到账净额 = 销售额 − 所有 Etsy 费用（手续费+处理费+税+运费+广告+退款...）
  产品成本 = 各订单产品成本之和（按配置币种换算为 USD）

利润率 = 净利润 / 销售额 × 100%
```

费用类别（9 类）：交易手续费、处理费、销售税、运费标签、站内广告、站外广告、上架费、退款、其他。

---

## 数据隐私

- ✅ **多用户隔离**：Supabase RLS 从数据库层保证任何用户只能看到自己的数据
- ✅ **本地优先**：所有计算在浏览器完成，不依赖第三方分析服务
- ✅ **CSV 排除**：`.gitignore` 已排除 `*.csv`，销售数据不会被提交到 Git
- ✅ **可关闭邮件备份**：默认关闭，用户在设置中手动开启
- ⚠ **数据控制者**：多用户模式下，部署者承担数据合规责任，建议加隐私政策页

---

## 已知限制

| 项 | 限制 | 说明 |
|---|---|---|
| Supabase 免费层 | 500MB DB + 50K MAU | 几百用户够用 |
| Vercel 免费层 | 100GB 流量 + 100万函数调用 | 完全够 |
| Resend 免费层 | 3000 封邮件/月 | 约 100 用户 × 30 封 = 临界 |
| 单 CSV 大小 | < 5 MB | Etsy 月账单一般 < 50 KB |
| 单次上传 | 多个文件 | 已支持批量 |

---

## 部署

部署到 Vercel（让别人能访问）的完整步骤见 **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**。

简要：
1. 注册 Supabase → 跑 SQL 建表
2. 注册 Resend → 拿邮件 API Key
3. 部署 Vercel → 配 6 个环境变量
4. 访问你的 Vercel 域名

---

## 许可证

MIT License — 详见 [LICENSE](./LICENSE)

---

## 致谢

- [Supabase](https://supabase.com) — 开源 Firebase 替代
- [Vercel](https://vercel.com) — 免费托管 + Serverless
- [Resend](https://resend.com) — 现代邮件 API
- [Recharts](https://recharts.org) — React 图表
- 暖金主题配色灵感来自 Linear 与高端金融报表

为 LumiFlask 店铺打造 · Built with [Claude Code](https://claude.com/claude-code)
