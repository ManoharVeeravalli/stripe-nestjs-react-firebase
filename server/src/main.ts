import { createNestServer } from './app';

async function bootstrap() {
  const app = await createNestServer();
  app.listen(process.env.PORT || 3001);
}
bootstrap();
