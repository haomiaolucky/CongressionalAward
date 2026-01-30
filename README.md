# Congressional Award Tracker

一个帮助学生追踪志愿服务时间、个人发展、体育健身和探险活动的 Web 应用，用于申请美国国会奖（Congressional Award）。

## 技术栈

- **后端**: Node.js + Express
- **数据库**: Azure MySQL Database
- **前端**: HTML5, CSS3, JavaScript
- **身份验证**: JWT (JSON Web Tokens)
- **邮件服务**: Nodemailer (SMTP)

## 主要功能

- 学生注册，需管理员审批后才能登录
- 追踪四个类别的活动时间（志愿服务、个人发展、体育健身、探险）
- 活动记录提交后，通过邮件通知督导员审批
- 实时显示进度和当前达到的奖项级别
- 管理员面板管理学生、活动和督导员

## 数据库设计

数据库架构在 `database/schema.sql` 中定义，包含以下表：

1. **Users** - 用户认证和基本信息
2. **Students** - 学生详细资料
3. **Supervisors** - 活动督导员
4. **Activities** - 组织提供的活动
5. **HourLogs** - 学生活动提交记录

详细的系统架构文档请参考 `DESIGN.md`。

## 前置要求

- Node.js 14.x 或更高版本
- MySQL 8.0 或更高版本（Azure MySQL Database）
- npm 包管理器

## 安装步骤

### 1. 安装依赖

由于您的系统未安装 Node.js，请先安装：

**下载 Node.js:**
访问 https://nodejs.org/ 下载 LTS 版本并安装

**验证安装:**
```bash
node --version
npm --version
```

### 2. 安装项目依赖

```bash
npm install
```

这将安装 `package.json` 中列出的所有依赖包。

### 3. 配置环境变量

复制 `.env.example` 创建 `.env` 文件：

```bash
copy .env.example .env
```

编辑 `.env` 文件，填入您的配置：

```env
# 服务器配置
PORT=3000
NODE_ENV=development

# Azure MySQL 数据库配置
DB_HOST=your-server.mysql.database.azure.com
DB_USER=your_username@your-server
DB_PASSWORD=your_password
DB_NAME=congressional_award_tracker
DB_PORT=3306

# JWT 密钥（请生成一个随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this

# JWT 过期时间
JWT_EXPIRES_IN=7d

# 邮件配置（以 Gmail 为例）
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Congressional Award Tracker <noreply@example.com>

# 应用 URL
APP_URL=http://localhost:3000

# 管理员邮箱
ADMIN_EMAIL=admin@example.com

# 验证令牌过期时间（小时）
TOKEN_EXPIRY_HOURS=168
```

### 4. 设置数据库

#### 在 Azure 创建 MySQL 数据库：

1. 登录 Azure Portal
2. 创建 Azure Database for MySQL
3. 配置防火墙规则允许您的 IP 访问
4. 记录连接信息

#### 执行数据库脚本：

**方法 1: 使用 MySQL 客户端**
```bash
mysql -h your-server.mysql.database.azure.com -u your-username@your-server -p congressional_award_tracker < database/schema.sql
```

**方法 2: 使用 Azure Portal**
在 Query Editor 中直接粘贴并执行 `database/schema.sql` 内容

#### 更新管理员密码：

运行以下 Node.js 代码生成密码哈希：

```javascript
const bcrypt = require('bcrypt');
bcrypt.hash('Admin123!', 10, (err, hash) => {
  console.log(hash);
});
```

然后在数据库中更新 Users 表的管理员密码：

```sql
UPDATE Users 
SET PasswordHash = '生成的哈希值' 
WHERE Email = 'admin@congressionalaward.org';
```

## 运行应用

### 开发模式

```bash
npm run dev
```

或

```bash
npm start
```

应用将在 `http://localhost:3000` 启动

### 访问应用

- **首页**: http://localhost:3000
- **学生登录**: http://localhost:3000/login
- **学生注册**: http://localhost:3000/register
- **学生仪表板**: http://localhost:3000/dashboard
- **管理员面板**: http://localhost:3000/admin

## API 端点

### 认证
- `POST /api/auth/register` - 学生注册
- `POST /api/auth/login` - 登录（返回 JWT token）
- `GET /api/auth/me` - 获取当前用户信息

### 学生
- `GET /api/students/dashboard` - 获取仪表板摘要
- `GET /api/students/activities` - 列出可用活动
- `GET /api/students/supervisors` - 列出活跃的督导员

### 活动记录
- `POST /api/logs` - 创建新记录
- `GET /api/logs` - 获取学生的所有记录
- `PUT /api/logs/:id` - 更新待审批的记录
- `DELETE /api/logs/:id` - 删除待审批的记录
- `GET /api/logs/verify` - 督导员验证端点（通过邮件链接）

### 管理员（需要管理员权限）
- `GET /api/admin/pending-users` - 列出待审批的注册
- `PUT /api/admin/approve-user/:id` - 批准学生
- `PUT /api/admin/reject-user/:id` - 拒绝学生
- `GET /api/admin/students` - 列出所有学生及统计
- `GET /api/admin/activities` - 管理活动
- `POST /api/admin/activities` - 创建活动
- `GET /api/admin/supervisors` - 管理督导员
- `POST /api/admin/supervisors` - 创建督导员
- `GET /api/admin/stats` - 获取统计数据

## 默认管理员账户

数据库初始化后，使用以下账户登录管理员面板：

- **邮箱**: admin@congressionalaward.org
- **密码**: 您自己设置的密码（需要在数据库中更新）

## 国会奖级别

### 证书
- **铜牌证书**: 30小时志愿服务，15小时个人发展，15小时体育健身，1次探险
- **银牌证书**: 60小时志愿服务，30小时个人发展，30小时体育健身，2次探险
- **金牌证书**: 90小时志愿服务，45小时个人发展，45小时体育健身，3次探险

### 奖章
- **铜牌奖章**: 100小时志愿服务，50小时个人发展，50小时体育健身，1晚以上探险
- **银牌奖章**: 200小时志愿服务，100小时个人发展，100小时体育健身，2晚以上探险
- **金牌奖章**: 400小时志愿服务，200小时个人发展，200小时体育健身，4晚以上探险

## 邮件配置

应用使用邮件用于：
- 新注册的管理员通知
- 督导员的活动验证邮件
- 学生的批准确认邮件

### Gmail 配置：
1. 启用两步验证
2. 生成应用专用密码
3. 在 `.env` 中使用该密码

### 其他邮件服务：
- **SendGrid**: 使用 API 密钥
- **Azure Communication Services**: 使用连接字符串

## 部署到 Azure

### 方法 1: Azure App Service (推荐，最简单)

1. **创建 App Service:**
```bash
az webapp create --resource-group myResourceGroup --plan myAppServicePlan --name congressional-award-tracker --runtime "NODE|18-lts"
```

2. **配置环境变量:**
在 Azure Portal 的 Configuration 中添加所有 `.env` 变量

3. **部署代码:**
```bash
# 使用 Git
git init
git add .
git commit -m "Initial commit"
az webapp deployment source config-local-git --name congressional-award-tracker --resource-group myResourceGroup
git remote add azure <deployment-url>
git push azure main

# 或使用 VS Code Azure 扩展
```

4. **访问应用:**
https://congressional-award-tracker.azurewebsites.net

### 方法 2: Docker 容器

1. **创建 Dockerfile**（已包含在项目中）

2. **构建并推送镜像:**
```bash
docker build -t congressional-award-tracker .
docker tag congressional-award-tracker myregistry.azurecr.io/congressional-award-tracker
docker push myregistry.azurecr.io/congressional-award-tracker
```

3. **在 Azure 容器实例中运行**

### 生产环境检查清单

- [ ] 更新所有密码和密钥
- [ ] 设置 NODE_ENV=production
- [ ] 配置 HTTPS
- [ ] 启用 CORS 仅允许信任的域名
- [ ] 配置数据库备份
- [ ] 设置应用监控
- [ ] 配置日志记录
- [ ] 测试邮件服务
- [ ] 测试数据库连接
- [ ] 配置防火墙规则

## 故障排除

### 数据库连接问题
- 验证 Azure MySQL 防火墙规则
- 检查连接字符串格式
- 确保 SSL 配置正确

### 邮件不发送
- 验证 SMTP 凭据
- 检查防火墙设置
- 先用简单的邮件客户端测试

### JWT Token 错误
- 确保 `.env` 中设置了 JWT_SECRET
- 检查 token 过期设置
- 验证 Authorization header 格式

## 项目结构

```
congressional-award-tracker/
├── server/                    # 后端代码
│   ├── config/               # 配置文件
│   │   └── db.js            # 数据库连接
│   ├── controllers/          # 控制器
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── adminController.js
│   │   └── logController.js
│   ├── middleware/           # 中间件
│   │   └── auth.js          # 认证中间件
│   ├── routes/              # 路由
│   │   ├── auth.js
│   │   ├── students.js
│   │   ├── logs.js
│   │   └── admin.js
│   ├── utils/               # 工具函数
│   │   ├── emailService.js
│   │   └── tokenGenerator.js
│   └── server.js            # 主服务器文件
├── public/                   # 前端静态文件
│   ├── css/
│   │   └── style.css
│   ├── js/
│   ├── index.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   └── admin.html
├── database/                 # 数据库
│   └── schema.sql           # 数据库架构
├── package.json             # 依赖包
├── .env.example             # 环境变量模板
├── DESIGN.md                # 系统设计文档
└── README.md                # 本文件
```

## 开发团队

如需帮助或报告问题，请联系系统管理员。

## 许可证

本项目为教育用途的专有软件。