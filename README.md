# NeuraFiT Backend

> 🧠 Production-ready REST API for the **NeuraFiT** AI-powered fitness platform

Built with **NestJS**, **TypeScript**, **PostgreSQL + pgvector**, **Prisma ORM**, and **Gemini AI** — fully containerized with Docker.

---

## 🚀 Features

| Module | Description |
|---------|------------|
| **Auth** | JWT + Refresh token authentication, bcrypt hashing |
| **Users** | Profile management with ownership guards |
| **Workouts** | AI-generated workout plans, session logging |
| **Meals** | AI meal plan generation, food image scanning |
| **AI Services** | Chatbot, pose analysis, food recognition, workout & meal recommendations |
| **Progress** | Biometric tracking with trend analytics |
| **RAG** | Retrieval-Augmented Generation with pgvector for grounded AI responses |
| **Analytics** | Workout stats, nutrition stats, user summary |
| **Health** | `/health` endpoint with DB status |

---

## 📋 Prerequisites

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- A [Gemini API Key](https://aistudio.google.com/apikey) (for AI features)

> **No need** to install Node.js, PostgreSQL, or Redis locally — everything runs inside containers.

---

## ⚡ Quick Start (Docker)

### 1. Clone and navigate to the backend

```bash
cd neurafit-be
```

### 2. Create your `.env` file

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
# ─── App ───────────────────────────────────────────────
PORT=3333
NODE_ENV=development

# ─── Database (matches docker-compose.yml defaults) ────
DATABASE_URL=postgresql://postgres:password@db:5432/neurafit

# ─── JWT Secrets ───────────────────────────────────────
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# ─── AI ────────────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key-here

# ─── Redis ─────────────────────────────────────────────
REDIS_URL=redis://redis:6379

# ─── Frontend URL (CORS) ──────────────────────────────
FRONTEND_URL=http://localhost:3000
```

> ⚠️ **Important:** The `DATABASE_URL` must use `db` as the hostname (not `localhost`) — this is the Docker service name defined in `docker-compose.yml`.

### 3. Start all services

```bash
docker compose up -d --build
```

This starts three containers:

| Service | Image | Port | Description |
|---------|-------|------|-------------|
| `db` | `pgvector/pgvector:pg16` | `5432` | PostgreSQL 16 with pgvector extension |
| `redis` | `redis:7-alpine` | `6379` | Redis cache |
| `app` | Custom (multi-stage build) | `3333` | NestJS API server |

The `app` container will:
1. Wait for `db` and `redis` to be healthy
2. Run `prisma db push` to sync the database schema
3. Start the NestJS server

### 4. Verify it's running

```bash
# Check container status
docker compose ps

# Check API health
curl http://localhost:3333/health

# View logs
docker compose logs -f app
```

### 5. Access the API

```
🚀 API:         http://localhost:3333/api/v1
📚 Swagger Docs: http://localhost:3333/api/docs
❤️  Health:      http://localhost:3333/health
```

---

## 🧠 Seed the RAG Knowledge Base

After the containers are running, seed the knowledge base to enable RAG-enhanced AI responses:

```bash
docker compose exec app npx ts-node src/rag/seed-knowledge.ts
```

This populates the `knowledge_chunks` table with verified nutrition, exercise, and health data — embedding each entry using the Gemini embedding model.

---

## 🔄 Common Docker Commands

```bash
# Start all services (detached)
docker compose up -d

# Rebuild after code changes
docker compose up -d --build

# Stop all services
docker compose down

# Stop and remove volumes (⚠️ deletes all data)
docker compose down -v

# View real-time logs
docker compose logs -f app

# View database logs
docker compose logs -f db

# Open a shell inside the app container
docker compose exec app sh

# Run Prisma Studio (database browser)
docker compose exec app npx prisma studio

# Run tests inside the container
docker compose exec app npm run test

# Run tests with coverage
docker compose exec app npm run test:cov
```

---

## 🚢 Production Deployment

For production, use `docker-compose.prod.yml` with environment variables:

### 1. Set production environment variables

```bash
export POSTGRES_USER=neurafit_user
export POSTGRES_PASSWORD=strong-db-password
export POSTGRES_DB=neurafit
export REDIS_PASSWORD=strong-redis-password
export JWT_SECRET=your-production-jwt-secret
export JWT_REFRESH_SECRET=your-production-refresh-secret
export FRONTEND_URL=https://your-frontend-domain.com
export GOOGLE_AI_API_KEY=your-gemini-api-key
export PORT=3000
```

### 2. Deploy

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Key differences from development:

| Aspect | Development | Production |
|--------|-------------|------------|
| Restart policy | `unless-stopped` | `always` |
| DB ports | Exposed (`5432`) | **Not exposed** (internal only) |
| Redis | No password | Password protected |
| Credentials | Hardcoded defaults | Environment variables |
| NODE_ENV | `development` | `production` |

---

## 🐳 Docker Architecture

### Multi-Stage Dockerfile

The `Dockerfile` uses a 3-stage build to minimize the production image size:

```
Stage 1 (deps)       → Install all npm dependencies
Stage 2 (build)      → Generate Prisma client, build NestJS, prune dev deps
Stage 3 (production) → Copy only dist/, node_modules/, and prisma/ into a clean Alpine image
```

**Security:** The production image runs as a non-root user (`appuser`).

### Docker Compose Services

```
┌─────────────────────────────────────┐
│           Docker Network            │
│                                     │
│  ┌─────────┐  ┌───────┐  ┌──────┐  │
│  │   app   │──│  db   │  │redis │  │
│  │ :3333   │  │ :5432 │  │:6379 │  │
│  └─────────┘  └───────┘  └──────┘  │
│       │                             │
└───────┼─────────────────────────────┘
        │
   Host: localhost:3333
```

- **db**: PostgreSQL 16 with `pgvector` extension pre-installed for vector similarity search
- **redis**: Redis 7 for caching (Alpine variant for smaller footprint)
- **app**: NestJS API with Prisma ORM, auto-migrates on startup

---

## 🏗️ Project Structure

```
neurafit-be/
├── Dockerfile                # Multi-stage production build
├── docker-compose.yml        # Development environment
├── docker-compose.prod.yml   # Production environment
├── prisma/
│   └── schema.prisma         # Database schema (7 models, 6 enums)
└── src/
    ├── auth/                 # JWT auth, registration, login, refresh tokens
    ├── users/                # User CRUD and profile management
    ├── workouts/             # Workout plan generation and session logging
    ├── meals/                # Meal plan generation and nutrition logging
    ├── ai/                   # Gemini AI integrations (chat, recommendations, analysis)
    ├── rag/                  # RAG pipeline (embeddings, vector search, knowledge seeder)
    ├── progress/             # Progress tracking and trend analytics
    ├── analytics/            # Platform analytics and insights
    ├── common/               # Guards, decorators, filters, interceptors, DTOs
    ├── config/               # Environment configuration
    ├── database/             # Prisma service and module
    ├── health/               # Health check endpoint
    └── main.ts               # Application bootstrap
```

---

## 🌐 API Endpoints

All API routes are prefixed with `/api/v1`:

```
Health:      GET  /health
Swagger:     GET  /api/docs
Auth:        POST /api/v1/auth/register
             POST /api/v1/auth/login
             POST /api/v1/auth/refresh
             GET  /api/v1/auth/profile
             POST /api/v1/auth/logout
Users:       GET  /api/v1/users/profile
             GET  /api/v1/users/:id
             PATCH /api/v1/users/:id
             DELETE /api/v1/users/:id
Workouts:    POST /api/v1/workouts/generate
             POST /api/v1/workouts/log
             GET  /api/v1/workouts/history
             PATCH /api/v1/workouts/log/:id
             DELETE /api/v1/workouts/log/:id
             DELETE /api/v1/workouts/plan/:id
Meals:       POST /api/v1/meals/generate
             POST /api/v1/meals/log
             POST /api/v1/meals/scan
             GET  /api/v1/meals/history
             GET  /api/v1/meals/plans
             PATCH /api/v1/meals/log/:id
             DELETE /api/v1/meals/log/:id
             DELETE /api/v1/meals/plan/:id
AI:          POST /api/v1/ai/chat
             GET  /api/v1/ai/chat/history
             POST /api/v1/ai/workout/recommend
             POST /api/v1/ai/meal/recommend
             POST /api/v1/ai/pose/analyze
             POST /api/v1/ai/food/analyze
Progress:    POST /api/v1/progress/log
             GET  /api/v1/progress/history
             GET  /api/v1/progress/analytics
             PATCH /api/v1/progress/:id
             DELETE /api/v1/progress/:id
```

---

## 🔒 Security Features

- JWT access tokens (15 min expiry) + refresh tokens (7 day expiry)
- Hashed refresh tokens stored in DB with rotation
- Global rate limiting (100 req / 60s)
- Input validation with whitelist enforcement
- Password hashing with bcrypt (12 rounds)
- Ownership checks on update/delete operations
- Non-root user in Docker production image
- Internal-only database access in production

---

## 🧪 Running Tests

```bash
# Inside Docker
docker compose exec app npm run test
docker compose exec app npm run test:cov
docker compose exec app npm run test:watch

# Locally (requires Node.js 18+ and running DB)
npm run test
npm run test:cov
```

---

## 🔧 Troubleshooting

| Issue | Solution |
|-------|----------|
| `db` container not starting | Check if port 5432 is already in use: `lsof -i :5432` |
| `app` exits immediately | Check logs: `docker compose logs app` — likely a missing `.env` variable |
| Prisma migration errors | Reset DB: `docker compose exec app npx prisma db push --force-reset` |
| `GEMINI_API_KEY` not working | Ensure it's set in `.env` and the container was rebuilt: `docker compose up -d --build` |
| Can't connect to DB locally | Use `localhost:5432` (not `db:5432`) — `db` is only resolvable inside Docker |
| RAG search returns empty | Run the seeder: `docker compose exec app npx ts-node src/rag/seed-knowledge.ts` |

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `@nestjs/jwt` + `passport-jwt` | JWT authentication |
| `@prisma/client` | PostgreSQL ORM |
| `@google/genai` | Gemini AI (chat, recommendations, analysis, embeddings) |
| `bcrypt` | Password hashing |
| `@nestjs/swagger` | API documentation |
| `class-validator` | DTO validation |
| `@nestjs/throttler` | Rate limiting |
| `multer` | File upload handling |

---

## 📄 License

UNLICENSED — NeuraFiT private project
