import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Stripe } from 'stripe';
import { db } from '../auth/firebase';
import { Request } from 'express';
@Injectable()
export class StripeService {
  private stripe: Stripe;
  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(configService.get('STRIPE_SECRET'), {
      apiVersion: '2020-08-27',
    });
  }
  async createStripeCheckoutSession(
    line_items: Stripe.Checkout.SessionCreateParams.LineItem[],
  ) {
    const url = this.configService.get('WEBAPP_URL');

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      success_url: `${url}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${url}/failed`,
    });

    return session;
  }

  async createPaymentIntent(amount: number) {
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount,
      currency: 'inr',
      // receipt_email: 'hello@fireship.io',
    });

    paymentIntent.status;

    return paymentIntent;
  }

  /**
   * Validate the stripe webhook secret, then call the handler for the event type
   */
  async handleStripeWebhook(req: Request): Promise<any> {
    const signature = req.headers['stripe-signature'];
    const event = this.stripe.webhooks.constructEvent(
      req['rawBody'],
      signature,
      this.configService.get('STRIPE_WEBHOOK_SECRET'),
    );

    try {
      await this.webhookHandlers(event);
      return { received: true };
    } catch (err) {
      console.error(err);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }
  }

  /**
   * Business logic for specific webhook event types
   */
  private async webhookHandlers(event: Stripe.Event) {
    const { object: data } = event.data;
    const payment_intent: Stripe.PaymentIntent = data as Stripe.PaymentIntent;
    console.log(payment_intent);
    switch (event.type) {
      case 'payment_intent.succeeded':
        // Add your business logic here
        break;
      case 'payment_intent.payment_failed':
        // Add your business logic here
        break;
    }
  }

  /**
   * Gets the exsiting Stripe customer or creates a new record
   */
  private async getOrCreateCustomer(
    userId: string,
    params?: Stripe.CustomerCreateParams,
  ) {
    const userSnapshot = await db.collection('users').doc(userId).get();

    const { stripeCustomerId, email } = userSnapshot.data();

    // If missing customerID, create it
    if (!stripeCustomerId) {
      // CREATE new customer
      const customer = await this.stripe.customers.create({
        email,
        metadata: {
          firebaseUID: userId,
        },
        ...params,
      });
      await userSnapshot.ref.update({ stripeCustomerId: customer.id });
      return customer;
    } else {
      return (await this.stripe.customers.retrieve(
        stripeCustomerId,
      )) as Stripe.Customer;
    }
  }

  /**
   * Creates a SetupIntent used to save a credit card for later use
   */
  async createSetupIntent(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    return this.stripe.setupIntents.create({
      customer: customer.id,
    });
  }

  /**
   * Returns all payment sources associated to the user
   */
  async listPaymentMethods(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);

    return this.stripe.paymentMethods.list({
      customer: customer.id,
      type: 'card',
    });
  }
}
