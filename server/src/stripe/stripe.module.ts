import { Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';

@Module({
  imports: [AuthModule],
  controllers: [StripeController],
  providers: [StripeService],
})
export class StripeModule {}
