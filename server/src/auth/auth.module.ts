import { Module } from '@nestjs/common';
import { FirebaseAuthStrategy } from './firebase.strategy';

@Module({
  providers: [FirebaseAuthStrategy],
})
export class AuthModule {}
