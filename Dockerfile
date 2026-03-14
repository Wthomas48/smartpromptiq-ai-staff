# ─── Stage 1: Build Server ─────────────────────────────────────────
FROM node:20-alpine AS server-builder

WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci --ignore-scripts

COPY server/prisma ./prisma
RUN npx prisma generate

COPY server/ ./
RUN npx tsc

# ─── Stage 2: Build Client ────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci

COPY client/ ./
# Remove any stale build artifacts
RUN rm -f tsconfig.tsbuildinfo
RUN npm run build

# ─── Stage 3: Production Runtime ──────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install production server dependencies only
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm ci --omit=dev --ignore-scripts

# Copy Prisma schema + generate client in production
COPY server/prisma ./prisma
RUN npx prisma generate

# Copy built server
COPY --from=server-builder /app/server/dist ./dist

# Copy built client (served as static files)
COPY --from=client-builder /app/client/dist /app/client/dist

# Create uploads directory
RUN mkdir -p /app/uploads

WORKDIR /app/server

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads

EXPOSE 3001

# Run database migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
