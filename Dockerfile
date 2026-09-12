# Stage 1: Build Frontend (Vite)
FROM node:20-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Build Backend (Express TypeScript)
FROM node:20-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/prisma ./prisma/
RUN npm ci
COPY server/ ./
RUN npx prisma generate
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL="file:/app/data/phishcentral.db"

# Copy server package definition and prisma schema
COPY server/package*.json ./
COPY server/prisma ./prisma/

# Install production dependencies + prisma CLI for automatic db push on startup
RUN npm ci --omit=dev && npm install prisma@5.19.1 && npx prisma generate

# Copy server compiled code
COPY --from=server-builder /app/server/dist ./dist

# Copy local static assets (SVG logos, icons)
COPY server/public ./public

# Copy client compiled static assets
COPY --from=client-builder /app/client/dist ./client/dist

# Setup persistent volume directory for SQLite database
RUN mkdir -p /app/data

EXPOSE 3000
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
