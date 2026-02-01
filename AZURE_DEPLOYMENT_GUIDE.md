# Azure 部署完整指南

## 📋 目录
1. [准备工作](#准备工作)
2. [部署 MySQL 数据库](#部署-mysql-数据库)
3. [部署 Node.js 应用](#部署-nodejs-应用)
4. [配置邮件服务](#配置邮件服务)
5. [配置域名和 SSL](#配置域名和-ssl)
6. [常见问题](#常见问题)

---

## 准备工作

### 1. 需要的账号
- [Azure 账号](https://azure.microsoft.com/)（免费试用或付费）
- GitHub 账号（用于代码部署）

### 2. 安装工具
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
- Git
- Node.js 18+ 和 npm

### 3. 准备代码
```bash
# 创建 .gitignore（如果没有）
echo "node_modules/" > .gitignore
echo ".env" >> .gitignore
echo "uploads/" >> .gitignore

# 初始化 Git 仓库
git init
git add .
git commit -m "Initial commit"

# 推送到 GitHub
git remote add origin https://github.com/YOUR_USERNAME/CongressionalAward.git
git push -u origin main
```

---

## 部署 MySQL 数据库

### 方式 1: Azure Database for MySQL（推荐）

#### 步骤 1: 创建数据库服务器
1. 登录 [Azure Portal](https://portal.azure.com/)
2. 点击 "Create a resource"
3. 搜索 "Azure Database for MySQL"
4. 选择 "Flexible Server"（灵活服务器）

**配置：**
- **服务器名称**: `congressional-award-db`
- **区域**: 选择离用户最近的（如 `East US` 或 `West US`）
- **计算+存储**: 
  - Burstable B1ms（适合开发/测试）
  - 或 General Purpose 2vCore（适合生产）
- **管理员用户名**: `dbadmin`
- **密码**: 设置强密码（至少8个字符）
- **MySQL 版本**: 8.0

#### 步骤 2: 配置防火墙
1. 进入创建的数据库服务器
2. 左侧菜单 → "Networking"
3. 添加防火墙规则：
   - **规则名**: `AllowAllAzureServices`
   - 勾选 "Allow public access from any Azure service"
   - **可选**: 添加你的 IP 地址（用于本地连接）

#### 步骤 3: 创建数据库
```bash
# 使用 Azure CLI
az mysql flexible-server db create \
  --resource-group YOUR_RESOURCE_GROUP \
  --server-name congressional-award-db \
  --database-name congressional_award_tracker
```

**或者使用 MySQL Workbench：**
- Host: `congressional-award-db.mysql.database.azure.com`
- Port: `3306`
- Username: `dbadmin`
- Password: `你的密码`

#### 步骤 4: 导入数据库 Schema
```bash
# 连接到数据库
mysql -h congressional-award-db.mysql.database.azure.com \
  -u dbadmin \
  -p \
  congressional_award_tracker < database/schema.sql
```

#### 步骤 5: 记录连接信息
```
DB_HOST=congressional-award-db.mysql.database.azure.com
DB_USER=dbadmin
DB_PASSWORD=你的密码
DB_NAME=congressional_award_tracker
DB_PORT=3306
```

---

## 部署 Node.js 应用

### 方式 1: Azure App Service（推荐，最简单）

#### 步骤 1: 创建 App Service
1. Azure Portal → "Create a resource"
2. 搜索 "Web App"
3. 点击 "Create"

**配置：**
- **应用名称**: `congressional-award-app`（会变成 URL: `https://congressional-award-app.azurewebsites.net`）
- **运行时堆栈**: Node 18 LTS
- **操作系统**: Linux
- **区域**: 选择与数据库相同的区域
- **定价计划**: 
  - F1 Free（开发测试）
  - B1 Basic（小型生产）
  - S1 Standard（推荐生产）

#### 步骤 2: 配置部署
**使用 GitHub Actions（推荐）：**

1. 在 App Service 中：
   - Settings → Configuration → Deployment Center
   - 选择 "GitHub"
   - 授权 GitHub 账号
   - 选择仓库和分支（main）

2. Azure 会自动创建 `.github/workflows/main.yml`

**手动创建部署文件**（如果自动创建失败）：

创建 `.github/workflows/azure-deploy.yml`：
```yaml
name: Deploy to Azure App Service

on:
  push:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: 'congressional-award-app'
        publish-profile: ${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: .
```

3. 获取发布配置文件：
   - App Service → Get publish profile（下载）
   - GitHub 仓库 → Settings → Secrets → New repository secret
   - Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
   - Value: 粘贴下载的文件内容

#### 步骤 3: 配置环境变量
在 Azure App Service 中：
1. Settings → Configuration → Application settings
2. 添加以下变量：

```
NODE_ENV=production
PORT=8080

# 数据库配置
DB_HOST=congressional-award-db.mysql.database.azure.com
DB_USER=dbadmin
DB_PASSWORD=你的数据库密码
DB_NAME=congressional_award_tracker
DB_PORT=3306

# JWT 密钥（生成随机字符串）
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# 邮件配置（见下一节）
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Congressional Award Tracker <noreply@congressionalaward.org>

# 应用 URL
APP_URL=https://congressional-award-app.azurewebsites.net

# 管理员邮箱
ADMIN_EMAIL=admin@example.com

# Token 过期时间（小时）
TOKEN_EXPIRY_HOURS=168
```

3. 点击 "Save"
4. 重启应用

#### 步骤 4: 配置启动命令
1. Settings → Configuration → General settings
2. **Startup Command**: `node server/server.js`
3. Save

---

## 配置邮件服务

### 选项 1: Gmail（最简单，适合小规模）

#### 步骤 1: 启用 2FA
1. 登录 Gmail
2. Google 账户 → 安全性
3. 开启"两步验证"

#### 步骤 2: 生成应用专用密码
1. Google 账户 → 安全性 → 应用专用密码
2. 选择"邮件"和"其他（自定义名称）"
3. 输入 "Congressional Award App"
4. 复制生成的16位密码

#### 步骤 3: 配置环境变量
```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=生成的16位密码（去掉空格）
EMAIL_FROM=Congressional Award <your-email@gmail.com>
```

**限制**: Gmail 限制每天500封邮件

### 选项 2: SendGrid（推荐生产环境）

#### 步骤 1: 创建 SendGrid 账号
1. 访问 [SendGrid](https://sendgrid.com/)
2. 注册免费账号（每天100封邮件）
3. 验证邮箱

#### 步骤 2: 创建 API Key
1. Settings → API Keys
2. Create API Key
3. 选择 "Full Access"
4. 复制 API Key（只显示一次！）

#### 步骤 3: 配置环境变量
```
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=你的SendGrid_API_Key
EMAIL_FROM=Congressional Award <noreply@yourdomain.com>
```

### 选项 3: Azure Communication Services

1. Azure Portal → Create resource → "Communication Services"
2. 创建资源
3. 获取连接字符串
4. 配置 Email 服务

---

## 配置域名和 SSL

### 步骤 1: 添加自定义域名（可选）
1. App Service → Custom domains
2. Add custom domain
3. 输入你的域名（如 `app.congressionalaward.org`）
4. 按指示添加 DNS 记录到你的域名提供商：
   - Type: CNAME
   - Name: app
   - Value: congressional-award-app.azurewebsites.net

### 步骤 2: 添加 SSL 证书
1. App Service → TLS/SSL settings
2. Private Key Certificates (.pfx) → Create App Service Managed Certificate
3. 选择你的域名
4. 创建证书（免费）

### 步骤 3: 绑定证书
1. Custom domains → 点击你的域名旁的 "Add binding"
2. 选择刚创建的证书
3. TLS/SSL Type: SNI SSL
4. Add Binding

### 步骤 4: 强制 HTTPS
1. TLS/SSL settings → HTTPS Only → On

---

## 文件上传配置

### 使用 Azure Blob Storage（推荐生产环境）

**为什么需要？**
- App Service 的文件系统不持久化
- 重启或重新部署会丢失上传的文件

#### 步骤 1: 创建 Storage Account
1. Azure Portal → Create resource → Storage account
2. 配置：
   - Name: `congressionalawardstorage`
   - Performance: Standard
   - Redundancy: LRS (本地冗余)

#### 步骤 2: 创建 Container
1. Storage account → Containers
2. New container
   - Name: `proofs`
   - Public access level: Blob (匿名读取)

#### 步骤 3: 获取连接字符串
1. Storage account → Access keys
2. 复制 Connection string

#### 步骤 4: 修改代码使用 Azure Storage
需要安装 `@azure/storage-blob`:
```bash
npm install @azure/storage-blob
```

创建 `server/utils/azureStorage.js`:
```javascript
const { BlobServiceClient } = require('@azure/storage-blob');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = 'proofs';

async function uploadToAzure(file) {
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  const blobName = `${Date.now()}-${file.originalname}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype }
  });
  
  return blockBlobClient.url;
}

module.exports = { uploadToAzure };
```

添加环境变量：
```
AZURE_STORAGE_CONNECTION_STRING=你的连接字符串
```

---

## 测试部署

### 1. 检查应用是否运行
```bash
curl https://congressional-award-app.azurewebsites.net
```

### 2. 查看日志
```bash
# 使用 Azure CLI
az webapp log tail --name congressional-award-app --resource-group YOUR_RESOURCE_GROUP

# 或在 Portal
App Service → Log stream
```

### 3. 测试数据库连接
访问：`https://congressional-award-app.azurewebsites.net/api/auth/health`

---

## 监控和维护

### 1. 启用 Application Insights
1. App Service → Application Insights → Turn on
2. 创建新资源或使用现有
3. 查看性能、错误、使用情况

### 2. 设置警报
1. Monitor → Alerts → New alert rule
2. 配置条件（如响应时间 > 5秒，错误率 > 5%）
3. 配置通知（邮件、短信）

### 3. 自动扩展（可选）
1. App Service → Scale out
2. 配置规则：
   - CPU > 70% → 增加实例
   - CPU < 30% → 减少实例

---

## 成本估算

### 免费/开发层
- **App Service**: F1 Free（1GB RAM，1GB 存储）
- **MySQL**: B1ms（$12/月）
- **Storage**: 前 5GB 免费
- **SendGrid**: 100封邮件/天免费
- **总计**: ~$12/月

### 小型生产环境
- **App Service**: B1 Basic（$13/月）
- **MySQL**: GP 2vCore（$80/月）
- **Storage**: $0.18/GB
- **SendGrid**: $15/月（40,000封邮件）
- **总计**: ~$110/月

### 中型生产环境
- **App Service**: S1 Standard（$70/月）
- **MySQL**: GP 4vCore（$160/月）
- **Storage**: $20/月
- **SendGrid**: $80/月（100,000封邮件）
- **总计**: ~$330/月

---

## 常见问题

### 1. 应用无法连接数据库
**检查：**
- MySQL 防火墙规则是否允许 Azure 服务
- 数据库连接字符串是否正确
- 用户名格式：`dbadmin`（不需要 @servername）

### 2. 文件上传后消失
**原因**: App Service 文件系统不持久化
**解决**: 使用 Azure Blob Storage

### 3. 邮件发送失败
**检查：**
- Gmail 应用专用密码是否正确
- 防火墙是否阻止 SMTP（端口587）
- SendGrid API Key 是否有效

### 4. 部署后显示 "Service Unavailable"
**检查：**
- 查看日志：`az webapp log tail`
- 检查 package.json 的 start 脚本
- 确认端口配置为 `process.env.PORT || 3000`

### 5. npm install 失败
**原因**: sharp 等本地依赖编译问题
**解决**: 在 package.json 添加：
```json
{
  "engines": {
    "node": "18.x",
    "npm": "9.x"
  }
}
```

---

## 快速部署检查清单

- [ ] 创建 Azure MySQL 数据库
- [ ] 导入 database schema
- [ ] 创建 App Service
- [ ] 配置 GitHub 部署
- [ ] 添加所有环境变量
- [ ] 配置邮件服务
- [ ] 测试数据库连接
- [ ] 测试邮件发送
- [ ] 配置自定义域名（可选）
- [ ] 启用 HTTPS
- [ ] 设置 Azure Blob Storage（生产环境）
- [ ] 配置监控和警报
- [ ] 创建管理员账号

---

## 有用的命令

```bash
# 查看应用日志
az webapp log tail --name congressional-award-app --resource-group YOUR_RG

# 重启应用
az webapp restart --name congressional-award-app --resource-group YOUR_RG

# 查看环境变量
az webapp config appsettings list --name congressional-award-app --resource-group YOUR_RG

# 设置环境变量
az webapp config appsettings set \
  --name congressional-award-app \
  --resource-group YOUR_RG \
  --settings KEY=VALUE

# SSH 进入容器
az webapp ssh --name congressional-award-app --resource-group YOUR_RG
```

---

## 支持和帮助

- [Azure 文档](https://docs.microsoft.com/azure)
- [Azure 支持](https://azure.microsoft.com/support)
- [Stack Overflow - Azure](https://stackoverflow.com/questions/tagged/azure)

---

**祝部署顺利！🚀**