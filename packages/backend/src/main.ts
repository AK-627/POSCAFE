import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import * as dotenv from 'dotenv';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

// Load environment variables
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // Global exception filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Sky Nether Café Management API')
    .setDescription('API documentation for Sky Nether Café Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('tenants', 'Tenant management')
    .addTag('users', 'User management')
    .addTag('menu', 'Menu management')
    .addTag('tables', 'Table management')
    .addTag('orders', 'Order management')
    .addTag('kitchen', 'Kitchen display system')
    .addTag('payments', 'Payment processing')
    .addTag('customers', 'Customer management')
    .addTag('staff', 'Staff management')
    .addTag('reports', 'Reports and analytics')
    .addTag('audit', 'Activity logging and audit trail')
    .addTag('notifications', 'Notification system')
    .addTag('subscriptions', 'Subscription management')
    .addTag('export', 'Data export and backup')
    .addTag('printers', 'Printer integration')
    .addTag('offline', 'Offline mode support')
    .addTag('sync', 'Real-time synchronization')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Start server
  const port = process.env.PORT || 4000;
  await app.listen(port);
  
  console.log(`🚀 Application is running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});