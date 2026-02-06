import { Body, Controller, Headers, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { PaymentsService } from './payments.service';
import type { Request } from 'express';

type RequestWithRawBody = Request & { rawBody?: Buffer };

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @((Throttle as any)(5, 60))
  @Post('intent')
  createPaymentIntent(@Body() body: { bookingId: string }) {
    return this.paymentsService.createPaymentIntent(body.bookingId);
  }

  @Post('webhook')
  handleWebhook(
    @Req() req: RequestWithRawBody,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody ?? Buffer.from(''), signature);
  }
}
