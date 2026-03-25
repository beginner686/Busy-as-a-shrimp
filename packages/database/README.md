# Database Package

## 目标

对齐需求图中的核心业务表：

- users
- resources
- matches
- captain_commissions
- invite_records
- contents

## 使用

1. 设置 `DATABASE_URL`
2. 执行 `pnpm --filter @airp/database prisma generate`
3. 执行 `pnpm --filter @airp/database prisma db push`

