# Multi-stage build for Next.js application
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Build arguments for environment variables
ARG JWT_SECRET
ARG ORACLE_USER
ARG ORACLE_PASSWORD
ARG ORACLE_CONNECTION_STRING
ARG NEXT_PUBLIC_BASE_URL
ARG EMPLOYEE_DATA_SOURCE
ARG SMTP_HOST
ARG SMTP_PORT
ARG SMTP_FROM_EMAIL
ARG ADMIN_EMAIL

# Set environment variables for build
ENV JWT_SECRET=${JWT_SECRET}
ENV ORACLE_USER=${ORACLE_USER}
ENV ORACLE_PASSWORD=${ORACLE_PASSWORD}
ENV ORACLE_CONNECTION_STRING=${ORACLE_CONNECTION_STRING}
ENV NEXT_PUBLIC_BASE_URL=${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}
ENV EMPLOYEE_DATA_SOURCE=${EMPLOYEE_DATA_SOURCE:-RPTDBUAT}
ENV SMTP_HOST=${SMTP_HOST}
ENV SMTP_PORT=${SMTP_PORT:-25}
ENV SMTP_FROM_EMAIL=${SMTP_FROM_EMAIL}
ENV ADMIN_EMAIL=${ADMIN_EMAIL}

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Next.js application
ENV NODE_ENV=production
RUN npm run build

# Production image, copy all files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
