import { Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';

type RequestWithRawBody = Request & { rawBody?: Buffer };

@Controller('stripe')
export class StripeWebhookController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('webhook')
  handleWebhook(
    @Req() req: RequestWithRawBody,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(
      req.rawBody ?? (req.body as Buffer),
      signature,
    );
  }
}
