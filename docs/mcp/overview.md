# Model Context Protocol (MCP) - 官方文档概述

## 什么是 MCP？

Model Context Protocol (MCP) 是一个**开源标准**，用于连接 AI 应用程序与外部系统。该协议作为标准化接口（类似于设备的 USB-C），使 AI 工具能够与数据源、应用程序和工作流程集成。

## 公告信息

- **发布日期**: 2024年11月25日
- **开发者**: David Soria Parra 和 Justin Spahr-Summers
- **许可证**: MIT License
- **官方网站**: https://modelcontextprotocol.io
- **GitHub**: https://github.com/modelcontextprotocol

## 核心功能

MCP 支持以下实际应用场景：

1. **个人生产力工具集成**: AI 助手访问 Google Calendar、Notion 等工具
2. **设计文件代码生成**: 例如 Claude Code 与 Figma 的集成
3. **企业数据查询**: 企业聊天机器人查询组织数据库
4. **AI 驱动设计**: 在 3D 建模软件中创建 AI 驱动的设计

## 三大核心组件

### 1. 规范和 SDK
- TypeScript SDK
- Python SDK
- Java SDK（开发中）
- 所有代码在 GitHub 上开源

### 2. 本地 MCP 服务器支持
- 集成到 Claude Desktop 应用中
- 所有 Claude.ai 计划都支持通过桌面应用连接 MCP 服务器

### 3. 开源服务器仓库
预构建的企业系统服务器：
- Google Drive
- Slack
- GitHub
- Git
- Postgres
- Puppeteer

## 利益相关者的价值

### 开发者
- 简化集成流程
- 减少复杂性
- 统一标准接口

### AI 应用
- 访问扩展的生态系统
- 增强功能性
- 标准化数据访问

### 最终用户
- 更强大的 AI 助手
- 个性化数据访问
- 无缝集成体验

## 解决的问题

**当前挑战**: 每个数据源都需要自定义实现，创建了碎片化的集成。

**MCP 解决方案**: 提供通用的开放标准，用于连接 AI 系统与数据源，简化 AI 系统访问必要信息的方式。

## 开发路径

MCP 文档提供两条主要开发路径：

1. **构建服务器**: 暴露您的数据和工具
2. **开发应用**: 连接到 MCP 服务器

## 早期采用者

### 企业
- **Block**: 已集成 MCP
- **Apollo**: 已集成 MCP

### 开发工具
以下开发工具正在增强其平台以利用 MCP 协议：
- Zed
- Replit
- Codeium
- Sourcegraph

## 快速开始

### 安装预构建服务器
开发者可以从官方仓库安装预构建的 MCP 服务器。

### 遵循快速启动指南
官方文档提供详细的快速启动指南，帮助开发者快速上手。

### 贡献开源
欢迎为开源仓库做出贡献，详细指南请参考 CONTRIBUTING.md 文件。

## 仓库结构

MCP 规范仓库包含以下内容：

### 核心组件
1. **MCP 规范** - 正式协议定义
2. **协议模式** - TypeScript 和 JSON Schema 格式
3. **官方文档** - 使用 Mintlify 构建

### 文档目录结构
- **about** - 概述和介绍材料
- **community** - 社区相关文档
- **development** - 开发指南和资源
- **docs** - 核心文档文件
- **specification** - 协议规范
- **tutorials** - 分步学习教程
- **sdk/java** - Java SDK 文档
- **snippets** - 代码示例和可重用片段
- **examples.mdx** - 使用示例
- **faqs.mdx** - 常见问题解答
- **clients.mdx** - 客户端实现指南

### 主要文档文件
- `clients.mdx` - 客户端实现指南
- `examples.mdx` - 使用示例
- `faqs.mdx` - 常见问题
- `docs.json` - 文档元数据/配置

## 技术细节

### 架构模式
MCP 强调其在创建更强大、集成的 AI 体验方面的作用，涵盖企业和消费者应用程序。

### 模式格式
协议模式首先用 TypeScript 定义，但也提供 JSON Schema 格式，以实现更广泛的工具兼容性。

- **版本**: 2025-06-18
- **主要语言**: TypeScript (94.9%)

## 项目统计

- **Stars**: 6.2k+ (规范仓库)
- **Forks**: 1.1k+
- **Commits**: 2,216+
- **Contributors**: 280+

## 相关资源

### 官方链接
- **官方文档**: https://modelcontextprotocol.io
- **Anthropic 公告**: https://www.anthropic.com/news/model-context-protocol
- **规范仓库**: https://github.com/modelcontextprotocol/specification
- **TypeScript SDK**: https://github.com/modelcontextprotocol/typescript-sdk

### 学习资源
- **Anthropic 课程**: https://anthropic.skilljar.com/introduction-to-model-context-protocol
  - 综合指南和教程

## 入门建议

对于刚接触 MCP 的开发者：
1. 首先访问官方文档网站 (modelcontextprotocol.io) 进行全面了解
2. 选择 TypeScript/JavaScript SDK 进行开发
3. 查看预构建服务器示例以了解最佳实践
4. 参加 Anthropic 的免费在线课程深入学习

## 更新和维护

该项目由 Anthropic 维护，活跃开发中，欢迎社区贡献。所有贡献者都应参考项目的 CONTRIBUTING.md 文件以获取详细指南。

---

*本文档基于 MCP 官方资源编译，最后更新: 2025-01-08*
