# 部署指南 — Etsy Profit Dashboard

从 0 到上线，支持多用户的完整部署流程。预计 30-40 分钟。

> 适用：想让别人通过网址访问你的应用，支持几十~几百用户。

---

## 架构总览

```
浏览器（React）
   ↓ 登录 + 数据查询
Supabase
   ├─ Auth（邮箱密码登录）
   └─ PostgreSQL（数据存储 + RLS 行级隔离）
   ↓ 上传 CSV 入队
Vercel Serverless /api/queue-csv
   ↓ 写入 mail_queue 表
Supabase mail_queue
   ↓ 每天 23:00 Vercel Cron 触发
/api/cron-send
   ↓ 调用 Resend API
用户邮箱
```

---

## 第一步：Supabase 项目（10 分钟）

### 1.1 注册并创建项目

1. 打开 https://supabase.com → **Start your project**
2. 用 GitHub 或邮箱登录
3. 点 **New project**：
   - **Name**: `etsy-profit`（任意）
   - **Database password**: 点 "generate a password" 自动生成 → **务必保存到记事本**
   - **Region**: 选 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`（离中国近）
   - **Pricing Plan**: Free

### 1.2 安全选项（关键）

创建项目时下面有几个开关，**务必这样设**：

| 选项 | 设置 | 原因 |
|------|------|------|
| Enable Data API | ✅ 开 | 客户端需要 |
| Automatically expose new tables | ❌ **关** | 必须关，否则数据会暴露 |
| Enable automatic RLS | ✅ 开 | 新表自动启用行级安全 |

### 1.3 执行数据库迁移

1. 项目初始化完成后，左侧菜单点 **SQL Editor**（图标 `</>`）
2. 点 **New query**
3. 打开本仓库 `supabase/migrations/0001_init.sql`，全选复制
4. 粘贴到 SQL Editor 输入框
5. 点 **Run**
6. ⚠️ 如果弹出 "destructive operations" 警告，点 **"I understand, run this query"**（脚本只会建表，不会删数据，安全）

看到 "Success. No rows returned" 即成功。

验证：左侧 **Table Editor** 应能看到 `profiles` / `months` / `mail_queue` 三张表。

### 1.4 ⚠️ 关键：授权表访问权限（容易漏！）

Supabase 新版默认不授权用户角色访问表。**必须再跑一段 SQL**，否则上传会报 `permission denied for table months`。

在 SQL Editor 新建查询，粘贴运行：

```sql
grant usage on schema public to anon, authenticated;
grant all on table profiles to anon, authenticated;
grant all on table months to anon, authenticated;
grant all on table mail_queue to anon, authenticated;
grant usage, select on all sequences in schema public to anon, authenticated;
grant execute on function check_upload_quota(uuid, int) to anon, authenticated;
grant execute on function increment_upload_count(uuid) to anon, authenticated;
grant execute on function check_email_quota(uuid, int) to anon, authenticated;
grant execute on function increment_email_count(uuid) to anon, authenticated;
```

看到 Success 即成功。

### 1.5 关闭邮箱验证（推荐，简化注册）

默认注册后要点邮件链接确认，测试麻烦。关闭方法：

1. 左侧 **Authentication** → **Providers** → **Email**
2. **"Confirm email"** 开关 → **关掉**
3. **Save**

这样用户注册即可用，无需点链接。

### 1.6 拿到 API 凭据

左侧 **Settings**（齿轮）→ **API**，记录三个值：

| 名称 | 用途 | 示例 |
|------|------|------|
| **Project URL** | 前端 | `https://xppbjyrwozxozhagbpji.supabase.co` |
| **Publishable key**（旧版叫 anon） | 前端，公开 | `sb_publishable_xxxxx` |
| **Secret key**（旧版叫 service_role） | **仅服务端**，保密 | `sb_secret_xxxxx` |

⚠️ **Secret key 绝不能放进前端代码或推到 GitHub**，只在 Vercel 环境变量用。

### 1.7 配置回调地址（登录用）

左侧 **Authentication** → **URL Configuration**：

- **Site URL**: `http://localhost:5173`（本地开发）或你的 Vercel 地址（部署后改）
- **Redirect URLs**: 加入 `http://localhost:3000/**`, `http://localhost:5173/**`, `https://你的vercel域名/**`

---

## 第二步：Resend 邮件服务（5 分钟）

### 2.1 注册并拿 API Key

1. 打开 https://resend.com → **Sign Up**
2. 左侧 **API Keys** → **Create API Key**：
   - 权限选 **Sending access**
   - 复制 Key（形如 `re_xxxxxxxx`），**只显示一次**
3. 记录 `RESEND_API_KEY`

### 2.2 发件邮箱

- **默认可用**：`onboarding@resend.dev`，但只能发到你 Resend 注册邮箱
- **生产环境**：需在 **Domains** 添加并验证自有域名（如 `mail.yourdomain.com`），可发到任意邮箱

记录 `RESEND_FROM_EMAIL`。

---

## 第三步：本地开发配置（可选，先本地测试）

```bash
# 1. 克隆仓库
git clone https://github.com/xiagudianqiu/Etsy.git
cd Etsy

# 2. 安装依赖
npm install

# 3. 创建环境变量文件
cp .env.example .env.local
```

编辑 `.env.local`，填入：

```env
VITE_SUPABASE_URL=https://你的项目.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxx
```

启动：

```bash
npm run dev
# → http://localhost:5173
```

打开浏览器：
1. 看到登录页 → 注册账号
2. 上传一个 Etsy CSV → 应显示 ✓ 成功
3. 仪表盘出来数据 → 成功

⚠️ **本地测试的限制**：邮件备份功能本地无法用（需要 Vercel Cron），但其他都能测。

---

## 第四步：部署到 Vercel（10 分钟）

### 4.1 导入仓库

1. 打开 https://vercel.com → **Continue with GitHub**
2. **Add New** → **Project** → 选择 `Etsy` 仓库 → **Import**

### 4.2 配置项目

- Framework Preset: Vite（自动识别）
- Build Command: `npm run build`（自动）
- Output Directory: `dist`（自动）

### 4.3 ⚠️ 关键：添加 6 个环境变量

在 **Environment Variables** 区域逐个添加：

| 变量名 | 值 | 用途 |
|--------|-----|------|
| `VITE_SUPABASE_URL` | Supabase Project URL | 前端打包用 |
| `VITE_SUPABASE_ANON_KEY` | Supabase Publishable key | 前端打包用 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Secret key | 服务端绕过 RLS |
| `RESEND_API_KEY` | Resend API Key | 发邮件 |
| `RESEND_FROM_EMAIL` | `onboarding@resend.dev` 或已验证域名 | 发件人 |
| `ADMIN_EMAIL` | 你的收件邮箱（如 `you@example.com`） | CSV 自动备份接收方 |
| `CRON_SECRET` | 自己设的随机串，如 `my-secret-xyz-123` | 防 cron 被恶意触发 |

### 4.4 部署

点 **Deploy** → 等 1-2 分钟。

部署成功后拿到域名，如 `https://etsy-xxx.vercel.app`。

### 4.5 更新 Supabase 回调地址

回到 Supabase **Authentication → URL Configuration**：
- **Site URL** 改成你的 Vercel 域名
- **Redirect URLs** 加入 `https://你的vercel域名/**`

### 4.6 验证

1. 打开 Vercel 域名 → 看到登录页 ✓
2. 注册账号 → 进入空仪表盘 ✓
3. 上传 CSV → 数据正常显示 ✓
4. 设置 → 邮件备份 → 开关打开 → 填邮箱 → 测试入队 ✓
5. 等到 23:00 收到邮件 ✓（或手动触发见下）

---

## 手动触发 Cron（测试用）

不想等到 23:00？手动访问：

```
https://你的vercel域名/api/cron-send?token=你的CRON_SECRET
```

会立即把队列里的 CSV 发送并清空。

每月配额重置手动触发：

```
https://你的vercel域名/api/reset-quota?token=你的CRON_SECRET
```

---

## 配额说明

| 项 | 默认值 | 修改位置 |
|---|---|---|
| 每月上传次数 | 30 | `src/hooks/useEtsyData.js` 的 `QUOTA_UPLOAD` |
| 每月邮件次数 | 31 | `src/hooks/useEtsyData.js` 的 `QUOTA_EMAIL` + `api/queue-csv.js` 的 `EMAIL_QUOTA` |

超额时用户会看到提示，下月 1 号 Vercel Cron 自动重置。

---

## 日常运维

### 查看 Cron 执行

Vercel 项目 → **Cron Jobs** → 看每日 23:00 执行记录

### 查看用户数据

- **Supabase → Authentication → Users**：注册用户列表
- **Supabase → Table Editor → profiles**：配额使用情况
- **Supabase → Table Editor → mail_queue**：邮件队列状态

### 查看 Vercel 日志

Vercel 项目 → **Functions** → 点 `api/cron-send` → **Logs** 看执行日志

---

## 成本预估

| 服务 | 免费层 | 50 用户 | 200 用户 |
|------|--------|---------|----------|
| Supabase | 500MB + 50K MAU | 完全够 | 够 |
| Vercel | 100GB + 100万调用 | 完全够 | 够 |
| Resend | 3000 封/月 | 够 | ⚠️ 可能不够 |

**Resend 临界点**：200 用户 × 平均每月 15 封 = 3000 封（免费极限）。
超量两个选择：
1. 升级 Resend Pro（$20/月 = 5 万封）
2. 把人均邮件配额降到 10-15 封/月

---

## 故障排查

### 登录页一直 loading
- Vercel 环境变量 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` 没配
- F12 看 console 报错

### 注册提示 "Email not confirmed"
- Supabase 默认开了邮箱验证，去 **Authentication → Providers → Email** 关掉 "Confirm email"
- 或去邮箱点确认链接

### 上传报 `permission denied for table months`
- **漏跑第 1.4 步的授权 SQL**！回 Supabase SQL Editor 跑那段 `grant ...` 语句

### 多用户能看到别人数据
- **严重 bug**！RLS 没生效
- Supabase SQL Editor 跑 `select * from pg_policies;` 检查策略
- 确认 1.2 步 "Enable automatic RLS" 开了
- 重新跑 `0001_init.sql`

### 邮件入队成功但 23:00 没发
- Vercel → Cron Jobs 看 `cron-send` 是否触发
- Vercel → Functions → `api/cron-send` → Logs 看日志
- 检查 `RESEND_API_KEY` 是否正确
- 检查 `CRON_SECRET` 是否配了

### 邮件发出去了但收不到
- 用的是 `onboarding@resend.dev`？只能发到 Resend 注册邮箱
- 检查垃圾邮件
- 想发任意邮箱：Resend → Domains → 添加并验证自有域名

### 本地 dev 报错"未配置 Supabase"
- `.env.local` 没创建或填错
- 重启 `npm run dev`（环境变量改动需重启）

---

## 安全提醒

1. **Secret key 永远不要**：
   - 放进前端代码
   - 推到 GitHub
   - 贴在聊天/issue 里
   - 只存在 Vercel 环境变量

2. **`.env.local` 已在 `.gitignore`**，不会被提交

3. **如果 Secret key 泄露了**：立刻去 Supabase → Settings → API → 删除旧 key → 创建新 key → 更新 Vercel 环境变量 → 重新部署

4. **CSV 文件**：`.gitignore` 已排除 `*.csv`，销售数据不会被提交

---

## 删除 / 备份

### 备份用户数据
Supabase → Database → Backups（免费 7 天，付费 30 天）

### 完全下线
1. 删 Vercel 项目
2. 删 Supabase 项目
3. Resend 账号保留（不收费）

---

## 一键检查清单

部署前确认：

- [ ] Supabase 项目已创建，Region 选亚洲
- [ ] 跑了 `0001_init.sql`，Table Editor 看到 3 张表
- [ ] 跑了授权 SQL（第 1.4 步），否则上传报权限错误
- [ ] 关掉了邮箱验证（第 1.5 步），否则注册要点链接
- [ ] Resend 注册并拿到 API Key
- [ ] Vercel 导入仓库并配了 6 个环境变量
- [ ] 部署后 Supabase Site URL 改成 Vercel 域名
- [ ] 测试注册 + 上传 CSV 成功
- [ ] 测试邮件入队（等 23:00 或手动触发 cron）

全部打勾就上线成功！🎉
