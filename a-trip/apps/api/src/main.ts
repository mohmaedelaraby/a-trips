import 'reflect-metadata';
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  // Session cookies are httpOnly, so the browser attaches them itself — this
  // is what makes req.cookies readable in the auth guard below.
  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('A Trip API')
    .setDescription('Hotels booking API for A Trip (phase 1 - hotels only)')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  // Without this the container never shuts down cleanly. Node runs as PID 1
  // here, and PID 1 gets no default signal disposition from the kernel: an
  // unhandled SIGTERM is simply ignored, so `docker stop` waits out the grace
  // period and then SIGKILLs. That severs in-flight booking transactions while
  // they hold FOR UPDATE locks, and skips OnModuleDestroy entirely — the Prisma
  // pool is never drained and the hold sweeper's interval is never cleared.
  //
  // enableShutdownHooks registers the signal handlers that run those hooks, so
  // a stop closes the server, finishes what is in flight, and exits promptly.
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  new Logger('Bootstrap').log(`API listening on http://localhost:${port}/api`);
}

void bootstrap();
