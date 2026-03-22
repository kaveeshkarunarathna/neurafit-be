import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // ─── CORS ──────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'PUT', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── Global Prefix ─────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1', { exclude: ['/health', '/api/docs'] });

  // ─── Global Validation Pipe ────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Strip unknown properties
      forbidNonWhitelisted: true, // Reject unknown properties
      transform: true, // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // ─── Global Filters & Interceptors ────────────────────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
    new ClassSerializerInterceptor(reflector),
  );

  // ─── Swagger ───────────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('NeuraFiT API')
    .setDescription(
      'Production-ready REST API for the NeuraFiT AI-powered fitness platform. ' +
        'Includes user management, workout planning, meal planning, AI integrations, progress tracking, and analytics.',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'refresh-token',
    )
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Users', 'User management')
    .addTag('Workouts', 'Workout plans and session logging')
    .addTag('Meals', 'Meal planning and nutrition logging')
    .addTag('AI Services', 'AI-powered recommendations and analysis')
    .addTag('Progress', 'Progress tracking and trend analytics')
    .addTag('Analytics', 'Platform-wide analytics and insights')
    .addTag('Health', 'Service health checks')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
    },
  });

  // ─── Start ─────────────────────────────────────────────────────────────────
  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(
    `\n🚀 NeuraFiT API is running at: http://localhost:${port}/api/v1`,
  );
  console.log(
    `📚 Swagger Docs:               http://localhost:${port}/api/docs`,
  );
  console.log(
    `❤️  Health Check:              http://localhost:${port}/health\n`,
  );
}

bootstrap().catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
