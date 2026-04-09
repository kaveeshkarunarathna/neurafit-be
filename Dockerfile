# ---- Stage 1: Install dependencies ----
FROM node:20-alpine AS deps

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

# ---- Stage 2: Build the application ----
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma Client (native binaries must match the container OS)
RUN npx prisma generate

# Build the NestJS application
RUN npm run build

# Prune dev dependencies so only production deps remain
RUN npm prune --production

# Re-generate Prisma Client after pruning so the engine binaries stay
RUN npx prisma generate

# ---- Stage 3: Production image ----
FROM node:20-alpine AS production

WORKDIR /app

# Add non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy only what's needed to run
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/prisma ./prisma

# Switch to non-root user
USER appuser

EXPOSE ${PORT:-3000}

# Run migrations then start the server
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
