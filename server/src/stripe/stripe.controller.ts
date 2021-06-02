import {
  Controller,
  Post,
  Body,
  Request,
  HttpCode,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { StripeService } from './stripe.service';
import { Request as ExpressRequest } from 'express';
import * as firebase from 'firebase-admin';
import { FirebaseUser } from 'src/auth/firebase-user.decorator';

@Controller('stripe')
export class StripeController {
  constructor(private stripeService: StripeService) {}
  @Post()
  async test(@Body('amount') amount: number) {
    return { with_tax: amount * 7 };
  }

  @Post('checkout')
  async checkout(@Body('line_items') line_items: any[]) {
    return this.stripeService.createStripeCheckoutSession(line_items);
  }

  @Post('payments')
  async payments(@Body('amount') amount: number) {
    return this.stripeService.createPaymentIntent(amount);
  }

  @Post('hooks')
  @HttpCode(200)
  async hooks(@Request() request: ExpressRequest) {
    return this.stripeService.handleStripeWebhook(request);
  }

  @Get('wallet')
  @UseGuards(AuthGuard('firebase-auth'))
  async getWallets(@FirebaseUser() user: firebase.auth.UserRecord) {
    const wallet = await this.stripeService.listPaymentMethods(user.uid);
    return wallet.data;
  }

  @Post('wallet')
  @UseGuards(AuthGuard('firebase-auth'))
  async setWallet(@FirebaseUser() user: firebase.auth.UserRecord) {
    return this.stripeService.createSetupIntent(user.uid);
  }
}
