# Stage 1: Build Frontend (Vite)
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npx vite build

# Stage 2: Build Backend (Express TypeScript)
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci
COPY server/ ./
RUN npx prisma generate
RUN npx tsc

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/phishcentral.db"

# Copy server build & production dependencies
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci --only=production && npx prisma generate
COPY --from=server-builder /app/server/dist ./dist

# Copy client static assets into server public
COPY --from=client-builder /app/client/dist ./client/dist

# Setup persistent volume directory
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push && node dist/index.js"]
