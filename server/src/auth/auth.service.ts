import { Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthService {
  async validateUser(req: Request): Promise<any> {
    return req['currentUser'];
  }
}
