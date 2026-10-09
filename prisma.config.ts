import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  // Direct (unpooled) connection for Prisma CLI commands (migrations, db push)
  datasource: {
    url: env('DATABASE_URL_UNPOOLED'),
  },
})
