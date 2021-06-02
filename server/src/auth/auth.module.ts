import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthStrategy } from './firebase.strategy';

@Module({
  providers: [AuthService, FirebaseAuthStrategy],
})
export class AuthModule {}
