import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import Stripe from 'stripe';
import { BookingStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private stripe?: Stripe;

  constructor(private prisma: PrismaService) {}

  private getStripe(): Stripe {
    if (this.stripe) return this.stripe;

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }

    this.stripe = new Stripe(secretKey, {
      // apiVersion intentionally omitted to use the library default
    });

    return this.stripe;
  }

  async createPaymentIntent(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { court: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');

    if (booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException('Booking already confirmed');
    }

    const amount = booking.court.price;

    const existingPayment = await this.prisma.payment.findUnique({
      where: { bookingId },
      select: {
        bookingId: true,
        stripeIntentId: true,
        status: true,
        currency: true,
      },
    });

    if (
      existingPayment?.status === PaymentStatus.PROCESSING &&
      existingPayment.stripeIntentId
    ) {
      try {
        const intent = await this.getStripe().paymentIntents.retrieve(
          existingPayment.stripeIntentId,
        );

        if (intent.status === 'succeeded') {
          throw new BadRequestException('Payment already succeeded');
        }

        if (intent.status !== 'canceled' && intent.client_secret) {
          return {
            clientSecret: intent.client_secret,
            paymentIntentId: intent.id,
          };
        }
      } catch {
        // fallthrough to creating a new PaymentIntent
      }
    }

    await this.prisma.payment.upsert({
      where: { bookingId },
      update: {
        amount,
        status: PaymentStatus.REQUIRES_PAYMENT,
      },
      create: {
        bookingId,
        amount,
        currency: 'usd',
        status: PaymentStatus.REQUIRES_PAYMENT,
      },
    });

    const intent = await this.getStripe().paymentIntents.create({
      amount,
      currency: existingPayment?.currency ?? 'usd',
      metadata: { bookingId },
      automatic_payment_methods: { enabled: true },
    });

    await this.prisma.payment.update({
      where: { bookingId },
      data: {
        stripeIntentId: intent.id,
        status: PaymentStatus.PROCESSING,
      },
    });

    return {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET is not set');
    }

    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const event = this.getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingIdFromMetadata = intent.metadata?.bookingId;
      const bookingId =
        bookingIdFromMetadata ??
        (
          await this.prisma.payment.findUnique({
            where: { stripeIntentId: intent.id },
            select: { bookingId: true },
          })
        )?.bookingId;

      if (!bookingId) return { received: true };

      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { bookingId },
          data: { status: PaymentStatus.SUCCEEDED },
        }),
        this.prisma.booking.update({
          where: { id: bookingId },
          data: { status: BookingStatus.CONFIRMED },
        }),
      ]);
    }

    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const bookingIdFromMetadata = intent.metadata?.bookingId;
      const bookingId =
        bookingIdFromMetadata ??
        (
          await this.prisma.payment.findUnique({
            where: { stripeIntentId: intent.id },
            select: { bookingId: true },
          })
        )?.bookingId;

      if (!bookingId) return { received: true };

      await this.prisma.$transaction([
        this.prisma.payment.update({
          where: { bookingId },
          data: { status: PaymentStatus.FAILED },
        }),
        this.prisma.booking.updateMany({
          where: {
            id: bookingId,
            status: BookingStatus.PENDING_PAYMENT,
          },
          data: { status: BookingStatus.CANCELLED },
        }),
      ]);
    }

    return { received: true };
  }
}
