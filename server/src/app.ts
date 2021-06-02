import { ExpressAdapter } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { INestApplication } from '@nestjs/common';

export const createNestServer = async (
  expressInstance = express(),
): Promise<INestApplication> => {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );
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

  return app.init();
};
