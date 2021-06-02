import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import * as firebase from 'firebase-admin';
export const FirebaseUser = createParamDecorator(
  (data, ctx: ExecutionContext): firebase.auth.UserRecord => {
    const req = ctx.switchToHttp().getRequest();
    return req.user;
  },
);
