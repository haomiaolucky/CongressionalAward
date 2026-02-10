# Azure Blob Storage 搭建指南

本指南将帮助您在Azure上创建Storage Account并配置Blob存储来存储用户上传的图片。

## 📋 前置条件

- Azure订阅账户
- 已部署的Congressional Award Tracker应用

## 🚀 步骤1：创建Storage Account

### 方法1：通过Azure Portal（推荐）

1. **登录Azure Portal**
   - 访问 https://portal.azure.com
   - 使用您的Azure账户登录

2. **创建Storage Account**
   - 点击左上角 "创建资源" 或 "+Create a resource"
   - 搜索 "Storage Account"
   - 点击 "Create" 开始创建

3. **配置基本设置**
   ```
   订阅(Subscription): 选择您的订阅
   资源组(Resource Group): 
     - 选择现有的资源组（例如：congressional-award-rg）
     - 或创建新的资源组
   
   Storage Account名称: 
     - 输入唯一名称，例如：congressionalawardstore
     - 必须是小写字母和数字，3-24个字符
     - 名称必须全球唯一
   
   区域(Region): 
     - 选择与您的App Service相同的区域
     - 例如：East US, West US等
   
   性能(Performance): Standard（标准即可）
   
   冗余(Redundancy): 
     - LRS (Locally-redundant storage) - 最便宜，适合开发/测试
     - GRS (Geo-redundant storage) - 推荐生产环境
   ```

4. **高级设置**
   - **安全性**: 
     - 启用 "Enable blob public access" ✓
     - 保持其他默认设置
   
   - **网络**: 
     - 选择 "Enable public access from all networks"
     - 或选择 "Enable public access from selected virtual networks"

5. **数据保护**（可选）
   - 根据需要配置软删除等选项
   - 对于开发环境可以保持默认

6. **标记(Tags)**（可选）
   ```
   Environment: Production
   Project: CongressionalAward
   ```

7. **审查并创建**
   - 检查所有设置
   - 点击 "Create" 创建Storage Account
   - 等待部署完成（通常1-2分钟）

## 🔧 步骤2：创建Blob Container

1. **进入Storage Account**
   - 部署完成后，点击 "Go to resource"
   - 或从资源列表中找到您的Storage Account

2. **创建Container**
   - 在左侧菜单中找到 "Containers"（在Data storage下）
   - 点击 "+ Container"
   - 配置Container：
     ```
     名称(Name): proof-images
     公共访问级别: Blob (允许匿名读取Blob)
     ```
   - 点击 "Create"

## 🔑 步骤3：获取连接字符串

1. **访问Access Keys**
   - 在Storage Account中，找到 "Security + networking" → "Access keys"
   - 您会看到两个密钥（key1和key2）

2. **复制连接字符串**
   - 点击 "Show" 显示连接字符串
   - 点击复制图标复制 "Connection string" 
   - 连接字符串格式类似：
     ```
     DefaultEndpointsProtocol=https;AccountName=youraccountname;AccountKey=yourkey;EndpointSuffix=core.windows.net
     ```

3. **保存到.env文件**
   - 打开项目的 `.env` 文件
   - 添加以下配置：
     ```env
     # Azure Blob Storage Configuration
     AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=youraccountname;AccountKey=yourkey;EndpointSuffix=core.windows.net
     AZURE_STORAGE_CONTAINER_NAME=proof-images
     ```

## 📱 步骤4：配置CORS（跨域资源共享）

如果需要直接从浏览器上传（可选）：

1. 在Storage Account中，找到 "Settings" → "Resource sharing (CORS)"
2. 选择 "Blob service"
3. 添加CORS规则：
   ```
   Allowed origins: * (或您的域名)
   Allowed methods: GET, PUT, POST, DELETE
   Allowed headers: *
   Exposed headers: *
   Max age: 3600
   ```
4. 点击 "Save"

## 💰 步骤5：成本优化（可选）

1. **设置生命周期管理**
   - Storage Account → "Data management" → "Lifecycle management"
   - 创建规则自动删除旧文件或移至冷存储

2. **监控使用情况**
   - Storage Account → "Monitoring" → "Metrics"
   - 查看存储使用量和请求数

## ✅ 步骤6：验证配置

### 方法A：通过Azure Portal

1. 进入Container "proof-images"
2. 尝试手动上传一个测试图片
3. 上传成功后，点击图片获取URL
4. 在浏览器中打开URL，确认可以访问

### 方法B：通过应用程序

1. 确保 `.env` 文件已正确配置
2. 重启应用服务器
3. 在应用中提交一个带图片的活动日志
4. 检查服务器日志，应该看到：
   ```
   ✅ Azure Blob Storage initialized
   ✅ Image compressed: image.jpg (500KB → 200KB)
   ✅ File uploaded to Azure Blob Storage
   ```

## 🔒 步骤7：生产环境安全建议

1. **使用Managed Identity**（推荐）
   - 启用App Service的System Assigned Managed Identity
   - 授予Storage Blob Data Contributor角色
   - 无需在代码中存储连接字符串

2. **限制网络访问**
   - 配置防火墙规则，只允许您的App Service访问
   - Storage Account → "Security + networking" → "Networking"

3. **启用软删除**
   - Storage Account → "Data management" → "Data protection"
   - 启用blob和container的软删除

4. **定期轮换访问密钥**
   - 定期更新Access Keys
   - 使用key2时轮换key1，反之亦然

## 🔄 步骤8：将配置部署到Azure App Service

1. **通过Azure Portal**
   - 打开您的App Service
   - Settings → "Configuration" → "Application settings"
   - 点击 "+ New application setting"
   - 添加：
     ```
     名称: AZURE_STORAGE_CONNECTION_STRING
     值: [粘贴您的连接字符串]
     ```
   - 添加：
     ```
     名称: AZURE_STORAGE_CONTAINER_NAME
     值: proof-images
     ```
   - 点击 "Save"
   - 等待App Service重启

2. **通过Azure CLI**
   ```bash
   az webapp config appsettings set \
     --resource-group congressional-award-rg \
     --name your-app-name \
     --settings AZURE_STORAGE_CONNECTION_STRING="your-connection-string" \
     AZURE_STORAGE_CONTAINER_NAME="proof-images"
   ```

## 📊 监控和维护

### 查看存储使用情况

1. Storage Account → "Monitoring" → "Metrics"
2. 选择指标：
   - Used capacity（已使用容量）
   - Transactions（事务数）
   - Egress（出站流量）

### 查看成本

1. Storage Account → "Cost analysis"
2. 查看每日/每月的成本明细

### 备份重要数据

1. 启用blob版本控制
2. 配置Azure Backup（可选）
3. 定期导出重要数据

## 🆘 常见问题

### Q1: 上传失败，显示403错误
**A:** 检查Container的公共访问级别，确保设置为"Blob"

### Q2: 找不到连接字符串
**A:** 
1. 确保在Access Keys页面点击了"Show"
2. 如果密钥被隐藏，检查您的Azure权限

### Q3: 成本太高怎么办？
**A:**
1. 使用Cool或Archive存储层存储旧文件
2. 启用生命周期管理自动清理
3. 压缩图片减少存储空间
4. 考虑使用CDN减少直接访问

### Q4: 如何迁移现有的本地文件？
**A:** 参考下一节的迁移脚本

## 📦 预估成本

基于美国东部区域（2024年价格）：

```
存储（Hot tier）:
- 前 50GB: $0.0184/GB/月
- 每月 1000 个文件 × 500KB = 0.5GB
- 成本: ~$0.01/月

事务：
- 写入: $0.05/10,000 次
- 读取: $0.004/10,000 次
- 每月 1000 次上传 + 10000 次查看
- 成本: ~$0.01/月

总计: 约 $0.50-2/月（小型应用）
```

## ✨ 完成！

现在您的Azure Blob Storage已经配置完成，应用将自动使用Blob Storage存储上传的图片！

## 📚 相关资源

- [Azure Storage官方文档](https://docs.microsoft.com/azure/storage/)
- [Blob Storage定价](https://azure.microsoft.com/pricing/details/storage/blobs/)
- [Azure Storage SDK for Node.js](https://docs.microsoft.com/azure/storage/blobs/storage-quickstart-blobs-nodejs)