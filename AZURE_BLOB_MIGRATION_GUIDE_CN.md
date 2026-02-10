# Azure Blob Storage 迁移指南（中文版）

## 📝 概述

本指南帮助您将Congressional Award Tracker应用从本地文件存储迁移到Azure Blob Storage。

## ✅ 已完成的工作

代码已经更新以支持Azure Blob Storage，系统会自动检测配置：

- ✅ 安装了 `@azure/storage-blob` SDK
- ✅ 创建了 `server/utils/azureBlobStorage.js` 模块
- ✅ 更新了 `server/middleware/upload.js` 支持双存储模式
- ✅ 更新了 `server/server.js` 在启动时初始化Blob Storage
- ✅ 更新了 `.env.example` 添加配置示例

## 🚀 快速开始步骤

### 步骤1：在Azure上创建Storage Account

详细步骤请参考：[AZURE_BLOB_STORAGE_SETUP.md](./AZURE_BLOB_STORAGE_SETUP.md)

**快速摘要：**
1. 登录 https://portal.azure.com
2. 创建资源 → Storage Account
3. 配置：
   - 名称：如 `congressionalawardstore`（必须全球唯一）
   - 区域：与App Service相同
   - 性能：Standard
   - 冗余：LRS（开发）或GRS（生产）
4. 创建Container：
   - 名称：`proof-images`
   - 访问级别：Blob（允许匿名读取）

### 步骤2：获取连接字符串

1. 进入Storage Account
2. Security + networking → Access keys
3. 点击"Show"显示Connection string
4. 复制连接字符串

### 步骤3：配置环境变量

#### 本地开发环境

编辑 `.env` 文件，添加：

```env
# Azure Blob Storage Configuration
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=你的账户名;AccountKey=你的密钥;EndpointSuffix=core.windows.net
AZURE_STORAGE_CONTAINER_NAME=proof-images
```

#### Azure App Service

1. 打开Azure Portal → 您的App Service
2. Settings → Configuration
3. Application settings → New application setting
4. 添加两个设置：
   ```
   名称: AZURE_STORAGE_CONNECTION_STRING
   值: [粘贴连接字符串]
   
   名称: AZURE_STORAGE_CONTAINER_NAME
   值: proof-images
   ```
5. 保存并重启

### 步骤4：重启应用并测试

```bash
# 本地环境
npm start

# 查看启动日志，应该看到：
# ✅ Azure Blob Storage initialized
# ✅ Azure Blob container created
# 📦 Storage: Azure Blob Storage
```

## 🔄 工作原理

### 自动检测机制

系统会自动判断使用哪种存储方式：

```javascript
// 如果配置了AZURE_STORAGE_CONNECTION_STRING
→ 使用Azure Blob Storage
→ 文件URL: https://yourstore.blob.core.windows.net/proof-images/filename.jpg

// 如果未配置
→ 使用本地文件系统
→ 文件路径: /uploads/proofs/filename.jpg
```

### 上传流程

1. **接收文件** - Multer接收文件到内存（memoryStorage）
2. **处理文件**：
   - 图片：压缩和调整大小（最大1920x1920，质量85%）
   - PDF：保持原样
3. **存储文件**：
   - **Azure模式**：上传到Blob Storage，返回blob URL
   - **本地模式**：保存到 `/uploads/proofs/` 目录

### 图片压缩

无论使用哪种存储方式，图片都会自动压缩：
- 最大尺寸：1920x1920像素
- 格式：JPEG
- 质量：85%
- 通常可减少70-80%的文件大小

## 📊 成本预估

### 小型应用（每月）
```
假设：
- 100个用户
- 每用户上传5张图片
- 平均每张500KB压缩后200KB

存储成本：
- 500张图片 × 200KB = 100MB
- 成本：$0.002/月

事务成本：
- 500次上传 + 2500次浏览
- 成本：$0.01/月

总计：约$0.50-1/月
```

### 中型应用（每月）
```
假设：
- 500个用户
- 每用户上传10张图片
- 平均每张200KB

存储成本：
- 5000张图片 × 200KB = 1GB
- 成本：$0.02/月

事务成本：
- 5000次上传 + 25000次浏览
- 成本：$0.02/月

总计：约$2-5/月
```

## 🧪 测试验证

### 1. 本地测试

```bash
# 启动服务器
npm start

# 检查日志
# 应该看到：✅ Azure Blob Storage initialized
```

### 2. 上传测试

1. 登录应用
2. 提交活动日志并上传图片
3. 检查服务器日志：
   ```
   ✅ Image compressed: photo.jpg (500KB → 200KB)
   ✅ File uploaded to Azure Blob Storage: photo.jpg
   ```

### 3. 访问测试

1. 查看supervisor收到的验证邮件
2. 点击"View attachment"链接
3. 应该能直接在浏览器中查看图片
4. URL格式：`https://yourstore.blob.core.windows.net/proof-images/filename.jpg`

## 🔍 故障排除

### 问题1：启动时显示 "Azure Storage not configured"

**原因**：未配置连接字符串

**解决**：
1. 检查 `.env` 文件是否包含 `AZURE_STORAGE_CONNECTION_STRING`
2. 确保连接字符串格式正确
3. 重启服务器

### 问题2：上传失败，出现403错误

**原因**：Container访问权限不正确

**解决**：
1. 进入Azure Portal → Storage Account → Containers
2. 选择 `proof-images`
3. Change access level → Blob (anonymous read access)

### 问题3：图片无法访问

**原因**：防火墙或网络访问限制

**解决**：
1. Storage Account → Networking
2. 确保允许公共网络访问
3. 或添加您的IP地址到允许列表

### 问题4：本地开发环境无法连接

**原因**：网络或防火墙

**解决**：
1. 暂时注释掉 `.env` 中的 `AZURE_STORAGE_CONNECTION_STRING`
2. 系统会自动回退到本地存储
3. 在生产环境再启用Azure Storage

## 🔐 安全建议

### 开发环境
- ✅ 可以使用连接字符串（Connection String）
- ✅ 设置公共读取访问（Blob level）

### 生产环境
- ✅ 使用Managed Identity（推荐）
- ✅ 限制网络访问
- ✅ 启用软删除
- ✅ 定期轮换密钥
- ✅ 启用日志和监控

## 📁 文件兼容性

### 现有的本地文件

系统完全向后兼容：

```
旧的本地文件：
- 路径：/uploads/proofs/old-file.jpg
- 继续工作，无需迁移
- 邮件中的链接格式：http://your-domain.com/uploads/proofs/old-file.jpg

新的Blob文件：
- 路径：https://store.blob.core.windows.net/proof-images/new-file.jpg
- 直接从Azure CDN提供
- 更快的访问速度
```

### 可选：迁移现有文件

如需将现有本地文件迁移到Blob Storage，可以使用Azure Storage Explorer或Azure CLI。

## 🎯 性能优势

使用Azure Blob Storage后：

- ✅ **持久性**：文件永不丢失
- ✅ **可扩展性**：支持TB级存储
- ✅ **高可用性**：99.9%+ SLA
- ✅ **CDN加速**：全球快速访问
- ✅ **自动备份**：地理冗余
- ✅ **成本优化**：按使用量付费

## 📚 相关文档

- [详细设置指南](./AZURE_BLOB_STORAGE_SETUP.md)
- [Azure Storage官方文档](https://docs.microsoft.com/azure/storage/)
- [定价计算器](https://azure.microsoft.com/pricing/calculator/)

## ❓ 常见问题

**Q: 必须使用Azure Blob Storage吗？**
A: 不是。如果不配置，系统会自动使用本地存储。但在Azure生产环境强烈推荐使用Blob Storage。

**Q: 可以先在本地测试吗？**
A: 可以。配置后重启服务器即可，无需修改代码。

**Q: 已有的文件怎么办？**
A: 现有文件继续工作，新上传会自动使用Blob Storage。

**Q: 如何切换回本地存储？**
A: 删除或注释 `.env` 中的 `AZURE_STORAGE_CONNECTION_STRING` 即可。

**Q: 成本会很高吗？**
A: 对于小型应用，通常每月只需几美元甚至更少。

## ✨ 完成！

现在您的应用已经完全支持Azure Blob Storage！

如有问题，请查看详细文档或联系技术支持。