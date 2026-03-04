import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import "reflect-metadata";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.ALLOWED_ORIGIN ?? "http://localhost:5173",
    methods: ["GET", "PUT", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  const port = process.env.PORT ?? 3334;
  await app.listen(port);
  console.log(`🚀 treino-api running on http://localhost:${port}`);
}

bootstrap();
