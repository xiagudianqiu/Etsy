# 部署指南 — 多用户版

完整部署一个支持几十~几百用户的 Etsy Profit Dashboard。

## 架构总览

```
浏览器（React）
   ↓ 登录 + 数据查询
Supabase
   - Auth（邮箱密码登录）
   - PostgreSQL（数据存储 + RLS 隔离）
   ↓ 上传 CSV 入队
Vercel Function /api/queue-csv
   ↓ 写入 mail_queue 表
Supabase mail_queue
   ↓ 每天 23:00 cron
Vercel Function /api/cron-send
   ↓ 调用 Resend
你的用户邮箱
```

## 第一次部署（约 30 分钟）

### 步骤 1: Supabase 项目（10 分钟）

#### 1.1 注册并创建项目

1. 访问 https://supabase.com → Sign up
2. 创建组织（personal 即可）
3. New project：
   - Name: `etsy-profit-dashboard`
   - Database password: 自动生成并复制保存
   - Region: 选 Asia (Tokyo) 或 Singapore（离中国用户近）
   - Plan: Free

等 1-2 分钟初始化完成。

#### 1.2 执行数据库迁移

1. 项目首页左侧 → **SQL Editor** → **New query**
2. 复制 `supabase/migrations/0001_init.sql` 全部内容粘贴
3. 点 **Run**（右下角）→ 应该看到 "Success. No rows returned"

验证：左侧 **Database → Tables** 应该看到 3 个表：`profiles`、`months`、`mail_queue`

#### 1.3 拿到 API 凭据

左侧 **Settings → API**，复制三个值：
- `Project URL`（形如 `https://xxx.supabase.co`）
- `anon public` key（前端用，公开 key，受 RLS 保护）
- `service_role` key（**保密！** 仅服务端用，绕过 RLS）

#### 1.4 关闭邮件验证（可选，简化注册）

左侧 **Authentication → Providers → Email**：
- **Confirm email**：建议**关闭**（用户注册即可用，无需点击邮件链接）
- 也可保持开启，增加安全性

### 步骤 2: Resend 邮件服务（5 分钟）

1. 访问 https://resend.com → Sign Up
2. 登录后左侧 **API Keys → Create API Key**
   - 权限选 **Sending access**
   - 复制 Key（形如 `re_xxxxxxxx`），**只显示一次**
3. 发件地址：
   - **默认**：可用 `onboarding@resend.dev`，但只能发到你注册 Resend 的邮箱
   - **生产环境**：需在 **Domains** 添加并验证自有域名

### 步骤 3: Vercel 部署（10 分钟）

1. 访问 https://vercel.com → Continue with GitHub → 授权
2. **Add New → Project** → 选择 `Etsy` 仓库 → **Import**
3. **Configure Project** 页面：
   - Framework Preset: 自动识别 Vite ✓
   - Build Command: `npm run build`（自动）
   - Output Directory: `dist`（自动）

4. **Environment Variables** 添加 6 个变量：

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `VITE_SUPABASE_URL` | Supabase Project URL | 前端 |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key | 前端 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key | 服务端 |
| `RESEND_API_KEY` | Resend API Key | 服务端 |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` 或已验证域名 | 服务端 |
| `CRON_SECRET` | 自己设的随机串（如 `my-secret-xyz-123`） | 防止恶意触发 cron |

5. 点 **Deploy** → 等 1-2 分钟

6. 部署后拿到地址，类似 `https://etsy-xxx.vercel.app`

#### 3.1 配置 Supabase Site URL

回到 Supabase **Authentication → URL Configuration**：
- **Site URL**: 你的 Vercel 部署地址
- **Redirect URLs**: 加入 `https://你的地址/**`

### 步骤 4: 验证

1. 打开 Vercel 部署地址 → 看到登录页 ✓
2. 注册一个测试账号（邮箱+密码）
3. 进入仪表盘（空状态）
4. 导入一个 CSV → 看到数据正常 ✓
5. 设置（齿轮）→ 邮件备份 → 开关打开 → 填邮箱 → 测试入队 ✓
6. 等到 23:00（北京时间），收到邮件 ✓
7. 或手动触发：访问 `https://你的地址/api/cron-send?token=你的CRON_SECRET`

### 步骤 5: 多用户测试

用另一个浏览器（或无痕模式）注册第二个账号 → 数据完全隔离 ✓

---

## 日常运维

### 查看 Cron 执行情况

Vercel 项目 → **Cron Jobs** → 看每天 23:00 执行记录

### 查看队列

Supabase **Table Editor → mail_queue** → 看待发/已发邮件

### 查看用户

Supabase **Authentication → Users** → 看注册用户列表
Supabase **Table Editor → profiles** → 看配额使用情况

### 调整配额

在 `src/hooks/useEtsyData.js` 改：
```js
const QUOTA_UPLOAD = 30;  // 改成你想要的数
const QUOTA_EMAIL = 31;
```

同时改 `api/queue-csv.js` 的 `EMAIL_QUOTA = 31`。

### 调整发送时间

`vercel.json` 的 cron schedule（UTC 时间，北京 = UTC + 8）：
- 北京 23:00 = `0 15 * * *`
- 北京 06:00 = `0 22 * * *`

---

## 成本预估

| 服务 | 免费层 | 几十用户 | 几百用户 |
|------|--------|----------|----------|
| Supabase | 500MB DB + 50K MAU | 完全够 | 够（数据约 1KB/用户/月） |
| Vercel | 100GB 流量 + 100万函数调用 | 完全够 | 完全够 |
| Resend | 3000 封/月 | 够 | **可能不够** |

**Resend 临界点**：
- 200 用户 × 平均每月发 15 封 = 3000 封（极限）
- 超过需升级 Resend Pro（$20/月 = 5 万封）

或者**降低人均限额**到 10-15 封/月，挤进免费层。

---

## 隐私与合规

⚠️ **重要**：多用户模式下你成为**数据控制者**，承担：

- 用户的 Etsy 销售数据存在你的 Supabase
- 用户邮箱地址受隐私法保护（GDPR/PIPL）
- 用户 CSV 内容在 Resend 服务器流转

**建议措施**：
1. 在网站加「隐私政策」页面，说明数据如何使用
2. 用户可随时删除自己账号（Supabase Auth 自带）
3. 不要保留不必要的 CSV 内容（cron 发送后立即标记 sent_at，可定期清理）

---

## 故障排查

### 登录页一直 loading
- Vercel 环境变量 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 没配置
- 浏览器 console 看具体报错

### 上传 CSV 失败
- 看浏览器 Network 标签，看 Supabase 请求状态
- 可能是 RLS 策略未启用或写错 → 重新跑迁移 SQL

### 邮件入队成功但 23:00 没发
- Vercel 项目 → Cron Jobs 看是否触发
- Logs 看 `/api/cron-send` 函数日志
- 检查 RESEND_API_KEY 是否正确

### 多用户互相能看到数据
- **严重 bug**！RLS 没生效
- Supabase SQL Editor 跑：`select * from pg_policies;` 看策略
- 重新跑 `0001_init.sql`

---

## 删除 / 备份

### 备份数据
Supabase **Database → Backups**（免费 7 天，付费 30 天）

### 完全删除
- 删 Vercel 项目
- 删 Supabase 项目
- Resend 账号保留即可（不收费）
