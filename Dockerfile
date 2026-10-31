FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build frontend
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV WEB_DATABASE_URL=mysql://build:build@localhost/build
RUN bun run build

# Run server
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder --chown=bun:bun /app/dist ./dist
COPY --from=builder --chown=bun:bun /app/node_modules ./node_modules
COPY --from=builder --chown=bun:bun /app/src ./src
COPY --from=builder --chown=bun:bun /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=bun:bun /app/prisma/web ./prisma/web
COPY --chown=bun:bun package.json ./
COPY --chown=bun:bun tsconfig.json ./

USER bun

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["bun", "-e", "fetch('http://127.0.0.1:3000/api/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["sh", "-c", "bun run db:migrate && bun run db:reconcile-oauth-client && exec bun src/server/index.ts"]
