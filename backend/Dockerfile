# ── Stage 1: Build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY . .

# Placeholder URL — only needed for prisma generate at build time
ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build

# ── Stage 2: Production ────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma/generated ./prisma/generated

USER nestjs

EXPOSE 8080

CMD ["node", "dist/main"]

# ── Stage 3: Development (used via docker-compose override) ────
FROM node:20-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
COPY . .

ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate

CMD ["npm", "run", "start:dev"]
