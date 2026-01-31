# 管理员功能设置和测试指南

## 📋 概述

本指南将帮助你设置和测试新的管理员功能。

## 🔧 设置步骤

### 1. 数据库更新

确保你的数据库已经包含以下表和字段：

#### AdminUsers 表
```sql
CREATE TABLE AdminUsers (
    AdminID INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Name VARCHAR(255),
    CreatedBy INT,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    IsActive BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (CreatedBy) REFERENCES Users(UserID),
    INDEX idx_email (Email)
);
```

#### Students 表更新（添加 Status 字段）
```sql
ALTER TABLE Students ADD COLUMN Status ENUM('Pending', 'Active', 'Inactive') DEFAULT 'Active';
```

#### 插入第一个管理员
```sql
-- 替换为你的管理员邮箱
INSERT INTO AdminUsers (Email, Name) VALUES 
('your-admin-email@example.com', 'System Admin');
```

### 2. 注册管理员账户

1. 确保你的邮箱已添加到 `AdminUsers` 表
2. 访问 http://localhost:3000/register
3. 使用管理员邮箱注册（可以填写任意学生信息，这些信息不会被保存）
4. 系统会自动识别你是管理员

### 3. 登录管理员账户

1. 访问 http://localhost:3000/login
2. 使用管理员邮箱和密码登录
3. 系统会自动重定向到 http://localhost:3000/admin

## ✨ 功能清单

### 📊 Dashboard 统计
- ✅ 总学生数
- ✅ 待审批数
- ✅ 待处理日志数
- ✅ 活跃活动数
- ✅ 总记录小时数

### 👥 待审批学生
- ✅ 查看所有待审批的学生注册
- ✅ 批准学生注册
- ✅ 拒绝学生注册

### 🎓 学生管理
- ✅ 查看所有已批准的学生
- ✅ 搜索学生（按姓名或邮箱）
- ✅ 按状态筛选（Active/Inactive）
- ✅ 激活学生
- ✅ 停用学生
- ✅ 查看学生等级和统计

### 👨‍🏫 Supervisor 管理
- ✅ 查看所有 Supervisor
- ✅ 添加新 Supervisor
- ✅ 编辑 Supervisor 信息
- ✅ 删除 Supervisor（软删除/硬删除）
- ✅ 查看 Supervisor 状态

### 🎯 Activities 管理
- ✅ 查看所有活动
- ✅ 添加新活动
- ✅ 编辑活动信息
- ✅ 设置活动类别
- ✅ 分配默认 Supervisor
- ✅ 设置价格、地点、申请链接
- ✅ 激活/停用活动

### 👑 管理员用户管理
- ✅ 查看所有管理员用户
- ✅ 添加新管理员邮箱
- ✅ 激活/停用管理员
- ✅ 查看创建者和创建时间

## 🧪 测试步骤

### 测试 1: 管理员注册和登录
1. 在数据库中添加你的邮箱到 `AdminUsers` 表
2. 访问注册页面并注册
3. 登录后应该自动跳转到 `/admin`
4. 确认可以看到管理员仪表板

### 测试 2: 学生审批
1. 创建一个新的学生账户（使用非管理员邮箱）
2. 在管理员面板中，切换到"Pending Approvals"标签
3. 批准或拒绝该学生
4. 确认统计数据更新

### 测试 3: 学生激活/停用
1. 切换到"Students"标签
2. 选择一个学生并停用
3. 确认状态变为 Inactive
4. 重新激活该学生
5. 确认状态变为 Active

### 测试 4: Supervisor 管理
1. 切换到"Supervisors"标签
2. 点击"Add Supervisor"添加新 Supervisor
3. 填写姓名、邮箱和角色
4. 编辑刚创建的 Supervisor
5. 尝试删除 Supervisor

### 测试 5: Activities 管理
1. 切换到"Activities"标签
2. 点击"Add Activity"添加新活动
3. 填写所有字段（名称、类别、Supervisor等）
4. 编辑刚创建的活动
5. 停用该活动

### 测试 6: 管理员用户管理
1. 切换到"Admin Users"标签
2. 点击"Add Admin"添加新管理员邮箱
3. 确认该邮箱出现在列表中
4. 该用户可以使用此邮箱注册成为管理员
5. 测试激活/停用功能

### 测试 7: 搜索和筛选
1. 在"Students"标签中
2. 使用搜索框搜索学生姓名
3. 使用状态筛选器筛选 Active/Inactive 学生
4. 确认结果正确显示

## 🔐 权限控制

### 自动权限识别
- ✅ 注册时自动检查 `AdminUsers` 表
- ✅ 如果邮箱在表中，自动设置为 Admin
- ✅ 否则设置为 Student

### 登录重定向
- ✅ Admin → `/admin`
- ✅ Student (Active) → `/dashboard`
- ✅ Student (Pending/Inactive) → `/pending-activation`

### API 权限保护
- ✅ 所有 `/api/admin/*` 端点要求 Admin 角色
- ✅ 使用 JWT token 验证
- ✅ 无效 token 自动重定向到登录页

## 📝 API 端点列表

### 学生管理
- `GET /api/admin/pending-users` - 获取待审批学生
- `PUT /api/admin/approve-user/:id` - 批准学生
- `PUT /api/admin/reject-user/:id` - 拒绝学生
- `GET /api/admin/students` - 获取所有学生
- `PUT /api/admin/students/:id/activate` - 激活学生
- `PUT /api/admin/students/:id/deactivate` - 停用学生

### Supervisor 管理
- `GET /api/admin/supervisors` - 获取所有 Supervisor
- `POST /api/admin/supervisors` - 添加 Supervisor
- `PUT /api/admin/supervisors/:id` - 更新 Supervisor
- `DELETE /api/admin/supervisors/:id` - 删除 Supervisor

### Activities 管理
- `GET /api/admin/activities` - 获取所有活动
- `POST /api/admin/activities` - 添加活动
- `PUT /api/admin/activities/:id` - 更新活动
- `DELETE /api/admin/activities/:id` - 停用活动

### 管理员用户管理
- `GET /api/admin/admin-users` - 获取所有管理员
- `POST /api/admin/admin-users` - 添加管理员邮箱
- `PUT /api/admin/admin-users/:id/activate` - 激活管理员
- `PUT /api/admin/admin-users/:id/deactivate` - 停用管理员

### 统计数据
- `GET /api/admin/stats` - 获取仪表板统计

## 🎨 用户界面特性

### 美观的统计卡片
- 5个渐变色统计卡片
- 实时数据更新
- 清晰的视觉层次

### 标签页导航
- 5个功能标签页
- 平滑切换动画
- 保持状态

### 模态对话框
- 添加/编辑 Supervisor
- 添加/编辑 Activity
- 添加管理员
- 响应式设计

### 数据表格
- 清晰的数据展示
- 操作按钮分组
- 状态徽章
- 响应式布局

### 搜索和筛选
- 实时搜索
- 状态筛选
- 客户端筛选（快速响应）

## 🚨 常见问题

### Q: 我无法访问管理员页面
A: 确保：
1. 你的邮箱在 `AdminUsers` 表中
2. 你使用该邮箱注册并登录
3. JWT token 有效

### Q: 学生注册后无法看到待审批列表
A: 检查：
1. 学生的 `Users.Status` 是否为 'Pending'
2. 学生的 `Users.Role` 是否为 'Student'

### Q: 无法删除 Supervisor
A: 如果 Supervisor 有关联的记录：
1. 系统会自动软删除（设置 IsActive = false）
2. 不会真正从数据库删除

### Q: 添加管理员后无法登录
A: 新管理员需要：
1. 首先在管理员面板中添加邮箱到 `AdminUsers` 表
2. 然后使用该邮箱注册账户
3. 系统会自动识别并设置为管理员

## 🔄 工作流程示例

### 添加新管理员的完整流程：
1. 现有管理员登录
2. 切换到"Admin Users"标签
3. 点击"Add Admin"
4. 输入新管理员的邮箱和姓名
5. 新管理员使用该邮箱注册
6. 系统自动设置为 Admin 角色
7. 新管理员可以访问 `/admin`

### 学生注册审批流程：
1. 学生在前端注册
2. 系统创建账户并设置 Status = 'Approved'（可以登录）
3. 但 Student 记录需要管理员审批
4. 管理员在"Pending Approvals"中批准
5. 学生可以正常使用系统

## 📞 支持

如有问题，请检查：
1. 浏览器控制台错误
2. 服务器日志
3. 数据库连接
4. API 响应状态

## 🎉 完成！

现在你已经拥有一个功能完整的管理员系统，可以管理：
- 学生激活/停用
- Supervisor 增删改
- Activities 增删改
- 管理员用户管理

祝使用愉快！