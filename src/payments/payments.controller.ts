import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentSessionDto } from './dto/payment-session.dto';
import type { Request, Response } from 'express';
import { MessagePattern } from '@nestjs/microservices';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) { }


  @Post('create-payment-session')
  @MessagePattern('create.payment.session')
  createPaymentSession(@Body() paymentSessionDto: PaymentSessionDto) {
    console.log({ paymentSessionDto });
    return {paymentSessionDto}
    // return this.paymentsService.createPaymentSession(paymentSessionDto)
  }

  @Get('success')
  success() {
    return {
      ok: true,
      message: 'Payment successful'
    }
  }

  @Get('cancel')
  cancel() {
    return {
      ok: false,
      message: 'Payment cancelled'
    }
  }

  @Post('webhook')
  async stripeWebHook(@Req() req: Request, @Res() res: Response) {
    return this.paymentsService.stripeWebhook(req, res);
  }

}
