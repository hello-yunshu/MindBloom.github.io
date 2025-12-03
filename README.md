# 🌱 MindBloom

[![GitHub license](https://img.shields.io/github/license/hello-yunshu/MindBloom.github.io?style=flat-square)](https://github.com/hello-yunshu/MindBloom.github.io/blob/main/LICENSE)
[![GitHub last commit](https://img.shields.io/github/last-commit/hello-yunshu/MindBloom.github.io?style=flat-square)](https://github.com/hello-yunshu/MindBloom.github.io/commits/main)
[![Website](https://img.shields.io/website?down_color=red&down_message=offline&style=flat-square&up_color=green&up_message=online&url=https%3A%2F%2Fhello-yunshu.github.io%2FMindBloom.github.io%2F)](https://hello-yunshu.github.io/MindBloom.github.io/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

> **当学习不再是一场表演，知识才会真正生长。**  
> 一个专注于学习心理健康与成长的数字伴侣，帮助学习者从"表演式学习"回归"真实成长"，在知识探索中重拾内在喜悦与平衡。

![MindBloom Preview](https://via.placeholder.com/800x400/4a86cf/ffffff?text=MindBloom+Interface+Preview) <!-- 替换为实际截图 -->

## ✨ 核心价值

我们相信，真正的学习不应伴随着焦虑与自我怀疑。MindBloom 通过科学的心理追踪、个性化的任务引导和可视化的成长记录，帮助您重建健康的学习心理。

## 🌟 主要功能

- **🌱 情绪追踪**  
  实时记录学习过程中的情绪变化，识别影响效率的心理模式
  
- **📊 可视化成长**  
  将无形的心理变化转化为直观图表，让进步清晰可感
  
- **🎯 个性化任务**  
  基于"小步前进"原则，生成符合当前心理状态的学习任务
  
- **💡 洞察报告**  
  周/月度心理分析，提供针对性改善建议
  
- **🧘 冥想指导**  
  专为学习者设计的短时冥想，缓解学习焦虑与压力

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| **核心** | HTML5, CSS3, JavaScript (ES6+) |
| **框架** | Chart.js (数据可视化), Luxon (日期处理) |
| **样式** | CSS Variables, Flexbox, Grid Layout |
| **部署** | GitHub Pages, GitHub Actions |
| **设计** | Material Design Principles, WCAG 2.1 可访问性标准 |

## 🚀 快速开始

### 系统要求

- Node.js 16.x 或更高版本
- MySQL 8.0 或更高版本
- Git

### 本地安装与运行

#### 1. 克隆仓库

```bash
git clone https://github.com/hello-yunshu/MindBloom.github.io.git
cd MindBloom.github.io
```

#### 2. 安装依赖

```bash
# 安装项目依赖
npm install
```

#### 3. 配置环境变量

复制 `.env` 文件并根据需要修改配置：

```bash
# 复制示例环境变量文件
cp .env .env.local
```

编辑 `.env.local` 文件，配置以下关键参数：

- **数据库配置**
  - `DB_HOST`: 数据库主机地址（默认：localhost）
  - `DB_PORT`: 数据库端口（默认：3306）
  - `DB_USER`: 数据库用户名（默认：root）
  - `DB_PASSWORD`: 数据库密码（必填，需要修改）
  - `DB_NAME`: 数据库名称（默认：mindbloom）

- **应用配置**
  - `DEFAULT_USERNAME`: 默认用户名（默认：admin）
  - `DEFAULT_PASSWORD`: 默认密码（默认：mindbloom2025，建议修改）

- **AI配置（可选）**
  - `QWEN_API_KEY`: Qwen API密钥（可选，不配置则使用模拟AI）

- **定时任务配置**
  - `SCHEDULE_TIME`: 每日AI内容生成时间（默认：23:00）

#### 4. 启动MySQL数据库

确保MySQL服务已经启动。如果尚未安装MySQL，可以参考以下链接安装：
- [MySQL安装指南](https://dev.mysql.com/doc/refman/8.0/en/installing.html)

#### 5. 启动后端服务器

```bash
# 启动开发服务器
npm run dev
```

服务器将在 `http://localhost:3000` 启动。

#### 6. 访问网站

在浏览器中打开以下地址：

```
http://localhost:3000
```

或直接打开 `index.html` 文件（需要确保后端服务器正在运行）：

```bash
# 在浏览器中打开
open index.html  # macOS
# 或
start index.html  # Windows
# 或
xdg-open index.html  # Linux
```

### 开发脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动后端开发服务器 |
| `npm run frontend-dev` | 启动前端静态服务器（可选） |
| `npm run lint` | 运行代码检查 |
| `npm run prettier` | 格式化代码 |

### 项目结构

```
MindBloom.github.io/
├── index.html          # 主页面
├── style.css           # 样式文件
├── main.js             # 前端JavaScript
├── server.js           # 后端服务器
├── package.json        # 项目配置
├── .env                # 环境变量配置
└── README.md           # 项目说明
```

### 核心功能说明

#### 1. 用户认证
- 默认用户名：`admin`
- 默认密码：`mindbloom2025`
- 可在用户设置中修改用户名和密码

#### 2. 数据管理
- 情绪数据自动保存到MySQL数据库
- 任务完成情况实时统计
- 支持数据导出功能

#### 3. AI建议
- 每日自动生成AI学习建议
- 基于用户的情绪和任务数据
- 支持手动刷新AI建议

#### 4. 主题切换
- 自动跟随系统主题（明/暗模式）
- 无需手动设置

### 数据库迁移

系统会自动创建所需的数据库和表结构，包括：
- `users`: 用户信息
- `mood_data`: 情绪数据
- `task_data`: 任务数据
- `ai_suggestions`: AI建议
- `quotes`: 引用数据

### 安全建议

1. **修改默认密码**：首次登录后请立即修改默认密码
2. **保护API密钥**：不要将Qwen API密钥提交到版本控制系统
3. **配置CORS**：在生产环境中，请将`CORS_ORIGIN`配置为特定域名
4. **定期备份数据**：建议定期备份MySQL数据库

### 常见问题

#### Q: 数据库连接失败怎么办？
A: 请检查以下几点：
1. MySQL服务是否正在运行
2. `.env`文件中的数据库配置是否正确
3. 数据库用户是否有创建数据库和表的权限

#### Q: AI建议无法生成怎么办？
A: 请检查：
1. Qwen API密钥是否配置正确
2. 网络连接是否正常
3. 日志中是否有相关错误信息

#### Q: 如何修改定时任务执行时间？
A: 修改`.env`文件中的`SCHEDULE_TIME`参数，格式为`HH:MM`

### 贡献指南

欢迎提交Issue和Pull Request！

1. Fork本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开Pull Request

### 许可证

本项目采用MIT许可证 - 查看[LICENSE](LICENSE)文件了解详情。

### 联系方式

如有问题或建议，欢迎通过以下方式联系我们：

- GitHub Issues: [提交问题](https://github.com/hello-yunshu/MindBloom.github.io/issues)
- 邮箱: contact@mindbloom.ai