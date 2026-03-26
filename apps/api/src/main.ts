import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";

// Handle BigInt serialization for NestJS responses
(BigInt.prototype as unknown as Record<string, unknown>).toJSON = function () {
  return this.toString();
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: ["http://localhost:3000", "http://localhost:3002"],
    credentials: true
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true
    })
  );

  const port = Number(process.env.API_PORT ?? 8081);
  await app.listen(port);
}

void bootstrap();
