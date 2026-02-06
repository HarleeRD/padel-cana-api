import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentsController, StripeWebhookController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
