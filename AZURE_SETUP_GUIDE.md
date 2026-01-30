# Azure MySQL 数据库设置指南

本指南将帮助您在 Azure 上创建和配置 MySQL 数据库。

## 步骤 1: 登录 Azure Portal

1. 访问 https://portal.azure.com
2. 使用您的 Microsoft 账户登录

## 步骤 2: 创建 MySQL 数据库

### 方法 A: 使用 Azure Portal（图形界面）

1. **创建资源**
   - 在 Azure Portal 首页，点击 "创建资源"（Create a resource）
   - 在搜索框中输入 "Azure Database for MySQL"
   - 选择 "Azure Database for MySQL flexible server"（推荐）或 "Single Server"
   - 点击 "创建"（Create）

2. **配置基本信息**
   - **订阅**（Subscription）: 选择您的 Azure 订阅
   - **资源组**（Resource Group）: 
     - 新建资源组，命名为 `congressional-award-rg`
     - 或选择现有资源组
   - **服务器名称**（Server name）: `congressional-award-mysql`（必须全球唯一）
   - **区域**（Region）: 选择离您最近的区域（如 `East US`, `West US 2`）
   - **MySQL 版本**（MySQL version）: 选择 `8.0`

3. **配置计算和存储**
   - **工作负载类型**（Workload type）: 
     - 开发/测试: 选择 "Development"
     - 生产环境: 选择 "Production"
   - **计算层**（Compute tier）:
     - 开发: `Burstable` (B1ms - 1 vCore, 2 GiB RAM) - 约 $12/月
     - 生产: `General Purpose` - 根据需要选择
   - **存储**（Storage）: 
     - 开始可以选择 20 GB
     - 启用自动增长（Auto-grow）

4. **配置管理员账户**
   - **管理员用户名**（Admin username）: `dbadmin`（记住这个）
   - **密码**（Password）: 创建一个强密码（至少8个字符，包含大小写字母、数字和特殊字符）
   - **确认密码**: 再次输入密码
   - ⚠️ **重要**: 请将用户名和密码保存到安全的地方！

5. **配置网络**
   - **连接方法**（Connectivity method）: 
     - 选择 "公共访问"（Public access）
   - **防火墙规则**（Firewall rules）:
     - ✅ **必须勾选** "允许来自 Azure 服务的公共访问"（Allow public access from any Azure service within Azure to this server）
     - ✅ **强烈建议勾选** "添加当前客户端 IP 地址"（Add current client IP address）
     
   ⚠️ **重要说明**:
   - **必须添加您的 IP 地址**才能从本地电脑连接数据库（开发和测试）
   - 如果您计划部署到 Azure App Service，也需要勾选 "允许来自 Azure 服务的访问"
   - 创建后如果忘记添加，可以在 "网络"（Networking）设置中随时添加
   - 您的 IP 地址改变后（如更换网络），需要重新添加新的 IP

6. **其他设置**（可选）
   - **备份**（Backup）: 保持默认设置（7天保留期）
   - **高可用性**（High availability）: 开发环境可以关闭，生产环境建议启用

7. **查看和创建**
   - 点击 "查看 + 创建"（Review + create）
   - 检查所有设置
   - 点击 "创建"（Create）
   - 等待 3-5 分钟，数据库服务器将被创建

### 方法 B: 使用 Azure CLI（命令行）

如果您安装了 Azure CLI，可以使用以下命令：

```bash
# 登录 Azure
az login

# 创建资源组
az group create --name congressional-award-rg --location eastus

# 创建 MySQL 服务器
az mysql flexible-server create \
  --resource-group congressional-award-rg \
  --name congressional-award-mysql \
  --location eastus \
  --admin-user dbadmin \
  --admin-password "YourStrongPassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 20 \
  --version 8.0 \
  --public-access 0.0.0.0

# 配置防火墙（允许 Azure 服务）
az mysql flexible-server firewall-rule create \
  --resource-group congressional-award-rg \
  --name congressional-award-mysql \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## 步骤 3: 获取连接信息

创建完成后：

1. 在 Azure Portal 中，转到您的 MySQL 服务器资源
2. 在左侧菜单中找到 "连接字符串"（Connection strings）或 "概述"（Overview）
3. 记录以下信息：
   - **服务器名称**（Server name）: `congressional-award-mysql.mysql.database.azure.com`
   - **管理员用户名**（Admin username）: `dbadmin`（或您设置的用户名）
   - **端口**（Port）: `3306`

## 步骤 4: 创建数据库

### 方法 A: 使用 Azure Portal Query Editor

1. 在您的 MySQL 服务器页面，点击左侧菜单的 "查询编辑器"（Query editor）
2. 输入管理员用户名和密码登录
3. 在查询窗口中执行：
```sql
CREATE DATABASE congressional_award_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```
4. 点击 "运行"（Run）

### 方法 B: 使用 MySQL Workbench（推荐）

1. **下载并安装 MySQL Workbench**
   - 访问 https://dev.mysql.com/downloads/workbench/
   - 下载并安装适合您操作系统的版本

2. **连接到 Azure MySQL**
   - 打开 MySQL Workbench
   - 点击 "+" 创建新连接
   - 配置连接：
     - **Connection Name**: Azure Congressional Award DB
     - **Hostname**: `congressional-award-mysql.mysql.database.azure.com`
     - **Port**: `3306`
     - **Username**: `dbadmin`
     - **Password**: 点击 "Store in Keychain" 输入密码
   - 点击 "Test Connection" 测试连接
   - 点击 "OK" 保存连接

3. **创建数据库**
   - 双击刚才创建的连接
   - 在查询窗口中执行：
```sql
CREATE DATABASE congressional_award_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE congressional_award_tracker;
```

4. **执行数据库架构脚本**
   - 打开项目中的 `database/schema.sql` 文件
   - 复制全部内容
   - 粘贴到 MySQL Workbench 查询窗口
   - 点击 "执行"（Execute）按钮（⚡图标）
   - 等待脚本执行完成

### 方法 C: 使用命令行（如果您有 MySQL 客户端）

```bash
# 连接到 Azure MySQL
mysql -h congressional-award-mysql.mysql.database.azure.com -u dbadmin -p

# 输入密码后，创建数据库
CREATE DATABASE congressional_award_tracker CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE congressional_award_tracker;

# 退出
exit

# 从文件导入架构
mysql -h congressional-award-mysql.mysql.database.azure.com -u dbadmin -p congressional_award_tracker < database/schema.sql
```

## 步骤 5: 配置应用的 .env 文件

在项目根目录，复制 `.env.example` 为 `.env`，然后编辑：

```env
# Azure MySQL 数据库配置
DB_HOST=congressional-award-mysql.mysql.database.azure.com
DB_USER=dbadmin
DB_PASSWORD=YourStrongPassword123!
DB_NAME=congressional_award_tracker
DB_PORT=3306
```

⚠️ **重要提示**:
- 对于 Azure MySQL Flexible Server，用户名格式是 `username`
- 对于 Azure MySQL Single Server，用户名格式是 `username@servername`

## 步骤 6: 更新管理员密码

数据库创建后，需要为应用的管理员账户设置密码：

1. **生成密码哈希**

在项目目录下创建一个临时文件 `generate-hash.js`:

```javascript
const bcrypt = require('bcrypt');

const password = 'Admin123!'; // 更改为您想要的密码
bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Password hash:');
  console.log(hash);
  console.log('\nCopy this hash and use it in the SQL UPDATE statement.');
});
```

运行：
```bash
npm install bcrypt
node generate-hash.js
```

2. **更新数据库中的管理员密码**

在 MySQL Workbench 或 Query Editor 中执行：

```sql
UPDATE Users 
SET PasswordHash = '复制上面生成的哈希值'
WHERE Email = 'admin@congressionalaward.org';
```

然后您可以使用以下账户登录管理员面板：
- **邮箱**: admin@congressionalaward.org
- **密码**: Admin123!（或您设置的密码）

## 步骤 7: 测试连接

运行应用测试数据库连接：

```bash
npm start
```

如果看到：
```
✅ Database connected successfully
```

说明连接成功！

## 常见问题排查

### 问题 0: 创建数据库时部署失败（DeploymentFailed）

**错误信息示例**:
```
DeploymentFailed: The resource write operation failed to complete successfully, 
because it reached terminal provisioning state 'Failed'.
```

**常见原因和解决方案**:

1. **服务器名称已被占用**
   - Azure MySQL 服务器名称必须全球唯一
   - **解决**: 更改服务器名称，尝试：
     - `congressional-award-mysql-2026`
     - `congressional-award-mysql-yourname`
     - `ca-tracker-mysql-random123`

2. **区域配额限制**
   - 您的订阅在该区域可能没有配额
   - **解决**: 
     - 更换区域（如从 East US 改为 West US 2）
     - 或联系 Azure 支持增加配额

3. **订阅权限不足**
   - 您的账户可能没有创建资源的权限
   - **解决**: 
     - 检查您是否是订阅的 Owner 或 Contributor
     - 联系订阅管理员授予权限

4. **网络配置问题**
   - 防火墙规则配置可能有冲突
   - **解决**: 
     - 先不添加任何防火墙规则
     - 创建成功后再添加

5. **资源组问题**
   - 资源组可能有策略限制
   - **解决**: 
     - 创建一个新的资源组
     - 使用不同的命名

**推荐的重试步骤**:

```bash
# 方法 1: 使用 Azure Portal（推荐）
1. 删除失败的部署（如果有）
2. 更改服务器名称为唯一的名称
3. 选择不同的区域（如 West US 2）
4. 重新创建

# 方法 2: 使用 Azure CLI
# 首先删除失败的资源组（如果需要）
az group delete --name congressional-award-rg --yes

# 在不同区域创建
az group create --name congressional-award-rg --location westus2

# 使用新名称创建 MySQL
az mysql flexible-server create \
  --resource-group congressional-award-rg \
  --name ca-mysql-unique-$(date +%s) \
  --location westus2 \
  --admin-user dbadmin \
  --admin-password "YourStrongPassword123!" \
  --sku-name Standard_B1ms \
  --tier Burstable \
  --storage-size 20 \
  --version 8.0 \
  --public-access 0.0.0.0
```

**快速检查清单**:
- [ ] 服务器名称是否全球唯一？
- [ ] 区域是否有配额？（尝试不同区域）
- [ ] 是否有适当的订阅权限？
- [ ] 密码是否符合复杂度要求？（至少8字符，包含大小写、数字、特殊字符）
- [ ] 订阅是否已激活且有效？

**如果问题仍然存在**:
1. 查看 Azure Portal 的 "活动日志"（Activity Log）获取详细错误
2. 尝试使用 Azure CLI 创建（通常会给出更详细的错误信息）
3. 联系 Azure 支持

### 问题 1: 无法连接到数据库（最常见）

**原因**: 防火墙没有允许您的 IP 地址

**解决方案**:
1. 在 Azure Portal 中，转到您的 MySQL 服务器
2. 点击左侧菜单的 "网络"（Networking）
3. 在 "防火墙规则" 部分：
   - ✅ 勾选 "允许来自 Azure 服务和资源的公共访问"（如果要部署到 Azure）
   - 点击 "添加当前客户端 IP 地址"按钮
   - 或手动添加 IP 规则：
     - 规则名称：MyHome 或 MyOffice
     - 起始 IP：您的 IP 地址（可以在 https://whatismyip.com 查看）
     - 结束 IP：相同的 IP 地址
4. 点击 "保存"
5. 等待 1-2 分钟，防火墙规则生效

**开发环境临时解决方案**（不安全，仅用于测试）:
- 添加 IP 范围 `0.0.0.0` 到 `255.255.255.255`
- ⚠️ 这会允许任何 IP 访问，生产环境绝对不要这样做！

**如何查看您的 IP 地址**:
- 访问 https://whatismyip.com
- 或在命令行运行：`curl ifconfig.me`

### 问题 2: SSL 连接错误

如果遇到 SSL 相关错误，在 `server/config/db.js` 中添加：

```javascript
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: false  // 添加这行
  },
  // ... 其他配置
});
```

### 问题 3: 用户名格式错误

- **Flexible Server**: 使用 `dbadmin`
- **Single Server**: 使用 `dbadmin@congressional-award-mysql`

### 问题 4: 忘记管理员密码

在 Azure Portal 中：
1. 转到您的 MySQL 服务器
2. 点击 "重置密码"（Reset password）
3. 设置新密码

## 成本估算

**开发/测试环境**（Burstable B1ms）:
- 计算: ~$12/月
- 存储: ~$2/月 (20GB)
- 备份: ~$1/月
- **总计**: 约 $15/月

**生产环境**（General Purpose 2 vCores）:
- 计算: ~$140/月
- 存储: 根据使用量
- 高可用性: +100%
- **总计**: 约 $280-400/月

💡 **节省成本的建议**:
- 开发时使用 Burstable 层
- 不需要时停止服务器（Flexible Server 支持）
- 使用保留实例获得折扣

## 安全最佳实践

1. ✅ 使用强密码（至少 12 个字符）
2. ✅ 限制防火墙规则到特定 IP
3. ✅ 启用 SSL/TLS 连接
4. ✅ 定期备份数据库
5. ✅ 使用 Azure Key Vault 存储密码（生产环境）
6. ✅ 启用审计日志
7. ✅ 定期更新 MySQL 版本

## 下一步

数据库设置完成后：

1. ✅ 配置 `.env` 文件
2. ✅ 运行 `npm install`
3. ✅ 运行 `npm start`
4. ✅ 访问 http://localhost:3000
5. ✅ 使用管理员账户登录

如有问题，请参考 `README.md` 中的故障排除部分。