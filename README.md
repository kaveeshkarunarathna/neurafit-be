# NeuraFiT Backend

> 🧠 Production-ready REST API for the **NeuraFiT** AI-powered fitness platform

Built with **NestJS**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and structured for clean, modular, scalable architecture.

---

## 🚀 Features

| Module | Description |
|---------|------------|
| **Auth** | JWT + Refresh token authentication, bcrypt hashing |
| **Users** | Profile management with ownership guards |
| **Workouts** | AI-generated workout plans, session logging |
| **Meals** | AI meal plan generation, food image scanning |
| **AI Services** | Pose analysis, food recognition, workout & meal recommendations |
| **Progress** | Biometric tracking with trend analytics |
| **Analytics** | Workout stats, nutrition stats, user summary |
| **Health** | `/health` endpoint with DB status |

---

## 📋 Prerequisites

- Node.js >= 18
- PostgreSQL (running locally or remote)
- Redis (optional, for caching)

---

## ⚙️ Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your PostgreSQL and JWT credentials
```

### 3. Set up the database

```bash
# Generate Prisma client
npm run prisma:generate

# Create and apply migrations
npm run prisma:migrate
# Enter migration name: init
```

### 4. Run the application

```bash
# Development with hot-reload
npm run start:dev

# Production
npm run build && npm run start:prod
```

---

## 📚 API Documentation

Once running, open Swagger UI at:

```
http://localhost:3000/api/docs
```

All endpoints are documented with request/response schemas and authentication requirements.

---

## 🏗️ Project Structure

```
src/
├── auth/               # JWT auth, registration, login, refresh tokens
├── users/              # User CRUD and profile management
├── workouts/           # Workout plan generation and session logging
├── meals/              # Meal plan generation and nutrition logging
├── ai/                 # AI microservice integrations (mock)
├── progress/           # Progress tracking and trend analytics
├── analytics/          # Platform analytics and insights
├── common/             # Guards, decorators, filters, interceptors, DTOs
├── config/             # Environment configuration
├── database/           # Prisma service and module
├── health/             # Health check endpoint
└── main.ts             # Application bootstrap
```

---

## 🔑 Authentication Flow

```
POST /api/v1/auth/register   → Register + receive tokens
POST /api/v1/auth/login      → Login + receive tokens
POST /api/v1/auth/refresh    → Rotate refresh token (Bearer: <refreshToken>)
GET  /api/v1/auth/profile    → Get own profile (Bearer: <accessToken>)
POST /api/v1/auth/logout     → Invalidate refresh token
```

---

## 🤖 AI Integration

AI endpoints are **mocked** by default and return realistic responses. To connect to a real Python microservice:

1. Set `AI_SERVICE_URL=http://your-python-service:8000` in `.env`
2. Uncomment the `this.httpService.post(...)` lines in `src/ai/ai.service.ts`

---

## 🧪 Running Tests

```bash
# Unit tests
npm run test

# With coverage
npm run test:cov

# Watch mode
npm run test:watch
```

---

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `@nestjs/jwt` + `passport-jwt` | JWT authentication |
| `@prisma/client` | PostgreSQL ORM |
| `bcrypt` | Password hashing |
| `@nestjs/swagger` | API documentation |
| `class-validator` | DTO validation |
| `@nestjs/throttler` | Rate limiting |
| `@nestjs/axios` | HTTP client for AI services |

---

## 🌐 API Base URL

All API routes are prefixed with `/api/v1`

```
Health:      GET /health
Swagger:     GET /api/docs
Auth:        /api/v1/auth/*
Users:       /api/v1/users/*
Workouts:    /api/v1/workouts/*
Meals:       /api/v1/meals/*
AI:          /api/v1/ai/*
Progress:    /api/v1/progress/*
Analytics:   /api/v1/analytics/*
```

---

## 🔒 Security Features

- JWT access tokens (15 min expiry)
- Hashed refresh tokens stored in DB with rotation
- Global rate limiting (100 req / 60s)
- Input validation with whitelist enforcement
- Password hashing with bcrypt (12 rounds)
- Ownership checks on update/delete operations

---

## 📄 License

UNLICENSED — NeuraFiT private project
