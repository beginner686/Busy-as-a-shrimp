# AI 资源共享平台（初始框架）

基于业务图，搭建了第一版可扩展项目骨架，目标是快速进入 **Phase 1（用户 + 资源 + 匹配）**。

## 文档索引

- [技术需求文档 TRD](./technical-requirements.md)
- [系统架构](./architecture.md)
- [API V1 清单](./api-v1.md)
- [开发里程碑](./roadmap.md)

## 目录结构

```text
.
├─ apps
│  ├─ api               # NestJS 后端 API
│  ├─ web               # H5 Web（Next.js）
│  ├─ admin             # 管理后台（Next.js）
│  └─ miniprogram       # 小程序端（Taro 目录占位）
├─ services
│  └─ ai-engine-python  # 小龙虾AI调度引擎（Python）
├─ packages
│  └─ database          # Prisma 数据模型
├─ docs                 # 架构、接口、开发里程碑文档
└─ infra                # Nginx 与部署配置
```

## 快速开始

1. 复制环境变量
```bash
cp .env.example .env
```

2. 启动基础依赖
```bash
pnpm infra:up
```

3. 安装依赖并分别启动
```bash
pnpm install
pnpm dev:api
pnpm dev:web
pnpm dev:admin
```

4. 可选：容器方式同时启动应用
```bash
pnpm infra:up:all
```

## 当前状态

- 完成：项目框架、模块分层、接口占位、数据库核心表、AI引擎调度骨架
- 待完成：短信/微信登录、实名校验接入、内容审核供应商接入、支付与佣金结算实装
