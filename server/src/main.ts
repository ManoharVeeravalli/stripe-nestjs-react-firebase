import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if (process.env.NODE_ENV !== 'production') {
    app.enableCors({
      origin: '*',
    });
  }
  app.use(
    express.json({
      verify: (req, res, buffer) => (req['rawBody'] = buffer),
    }),
  );
  await app.listen(3001);
}
bootstrap();
