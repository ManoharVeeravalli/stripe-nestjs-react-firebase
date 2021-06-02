import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Stripe } from 'stripe';
import { db } from '../auth/firebase';
import * as firebase from 'firebase-admin';
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
    /**
     * Business logic for specific webhook event types
     */
    const webhookHandlers = {
      'payment_intent.succeeded': async (data: Stripe.PaymentIntent) => {
        // Add your business logic here
      },
      'payment_intent.payment_failed': async (data: Stripe.PaymentIntent) => {
        // Add your business logic here
      },
      'customer.subscription.deleted': async (data: Stripe.Subscription) => {
        const customer = (await this.stripe.customers.retrieve(
          data.customer as string,
        )) as Stripe.Customer;
        const userId = customer.metadata.firebaseUID;
        const userRef = db.collection('users').doc(userId);

        await userRef.update({
          activePlans: firebase.firestore.FieldValue.arrayRemove(
            data['plan'].id,
          ),
        });
      },
      'customer.subscription.created': async (data: Stripe.Subscription) => {
        const customer = (await this.stripe.customers.retrieve(
          data.customer as string,
        )) as Stripe.Customer;
        const userId = customer.metadata.firebaseUID;
        const userRef = db.collection('users').doc(userId);

        await userRef.update({
          activePlans: firebase.firestore.FieldValue.arrayUnion(
            data['plan'].id,
          ),
        });
      },
      'invoice.payment_succeeded': async (data: Stripe.Invoice) => {
        // Add your business logic here
      },
      'invoice.payment_failed': async (data: Stripe.Invoice) => {
        const customer = (await this.stripe.customers.retrieve(
          data.customer as string,
        )) as Stripe.Customer;
        const userSnapshot = await db
          .collection('users')
          .doc(customer.metadata.firebaseUID)
          .get();
        await userSnapshot.ref.update({ status: 'PAST_DUE' });
      },
    };
    webhookHandlers[event.type](event.data);
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

  /**
   * Attaches a payment method to the Stripe customer,
   * subscribes to a Stripe plan, and saves the plan to Firestore
   */
  async createSubscription(
    userId: string,
    plan: string,
    payment_method: string,
  ) {
    const customer = await this.getOrCreateCustomer(userId);

    // Attach the  payment method to the customer
    await this.stripe.paymentMethods.attach(payment_method, {
      customer: customer.id,
    });

    // Set it as the default payment method
    await this.stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: payment_method },
    });

    const subscription = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ plan }],
      expand: ['latest_invoice.payment_intent'],
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const payment_intent = invoice.payment_intent as Stripe.PaymentIntent;

    // Update the user's status
    if (payment_intent.status === 'succeeded') {
      await db
        .collection('users')
        .doc(userId)
        .set(
          {
            stripeCustomerId: customer.id,
            activePlans: firebase.firestore.FieldValue.arrayUnion(plan),
          },
          { merge: true },
        );
    }

    return subscription;
  }

  /**
   * Cancels an active subscription, syncs the data in Firestore
   */
  async cancelSubscription(userId: string, subscriptionId: string) {
    const customer = await this.getOrCreateCustomer(userId);
    if (customer.metadata.firebaseUID !== userId) {
      throw new UnauthorizedException(
        'Firebase UID does not match Stripe Customer',
      );
    }
    const subscription = await this.stripe.subscriptions.del(subscriptionId);

    // Cancel at end of period
    // const subscription = stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    if (subscription.status === 'canceled') {
      await db
        .collection('users')
        .doc(userId)
        .update({
          activePlans: firebase.firestore.FieldValue.arrayRemove(
            subscription['plan'].id,
          ),
        });
    }

    return subscription;
  }

  /**
   * Returns all the subscriptions linked to a Firebase userID in Stripe
   */
  async listSubscriptions(userId: string) {
    const customer = await this.getOrCreateCustomer(userId);
    const subscriptions = await this.stripe.subscriptions.list({
      customer: customer.id,
    });

    return subscriptions;
  }
}
