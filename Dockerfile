# ─── Stage 1: Build Server ─────────────────────────────────────────
FROM node:20-alpine AS server-builder

WORKDIR /app/server
COPY server/package.json server/package-lock.json* ./
RUN npm ci

COPY server/ ./
RUN npx prisma generate
RUN npm run build

# ─── Stage 2: Build Client ────────────────────────────────────────
FROM node:20-alpine AS client-builder

WORKDIR /app/client
COPY client/package.json client/package-lock.json* ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ─── Stage 3: Production Runtime ──────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Install production server dependencies only
COPY server/package.json server/package-lock.json* ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy built server
COPY --from=server-builder /app/server/dist ./dist
COPY --from=server-builder /app/server/node_modules/.prisma ./node_modules/.prisma
COPY server/prisma ./prisma

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
