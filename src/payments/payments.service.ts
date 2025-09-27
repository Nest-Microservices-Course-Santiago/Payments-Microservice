import { Inject, Injectable, Logger } from '@nestjs/common';
import { envs, NATS_SERVICE } from 'src/config';
import Stripe from 'stripe';
import { PaymentSessionDto } from './dto/payment-session.dto';
import { Request, Response } from 'express';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class PaymentsService {
    private readonly stripe = new Stripe(envs.stripeSecret)
    private readonly logger = new Logger('PaymentsService')

    constructor(
        @Inject(NATS_SERVICE) private readonly client: ClientProxy
    ) { }
    async createPaymentSession(paymentSessionDto: PaymentSessionDto) {
        const { currency, items, orderId } = paymentSessionDto;
        const lineItems = items.map(item => {
            return {
                price_data: {
                    currency: currency,
                    product_data: {
                        name: item.name
                    },
                    unit_amount: Math.round(item.price * 100), // 20 dolares
                },
                quantity: item.quantity,
            }
        })

        const session = await this.stripe.checkout.sessions.create({
            // Colocar aquí el ID de mi orden
            payment_intent_data: {
                metadata: {
                    orderId: orderId
                }
            },
            line_items: lineItems,
            mode: 'payment',
            success_url: envs.stripeSuccessUrl,
            cancel_url: envs.stripeCancelUrl,
        })

        // return session
        return {
            cancelUrl: session.cancel_url,
            successUrl: session.success_url,
            url: session.url
        }
    }

    async stripeWebhook(req: Request, res: Response) {
        const sig = req.headers['stripe-signature'];
        let event: Stripe.Event;
        // const endpointSecret = 'whsec_35f4331b3d7573744d8a1f5bd9c69f39be004a466b44a5749eb8ab6a1d5d3b80'; //testing
        const endpointSecret = envs.stripeEndpointSecret; //real

        try {
            event = this.stripe.webhooks.constructEvent(req['rawBody'], sig!, endpointSecret);
        } catch (error) {
            res.status(400).send(`Webhook Error: ${error.message}`)
            return
        }

        switch (event.type) {
            case 'charge.succeeded':
                const chargeSucceeded = event.data.object as Stripe.Charge;
                const payload = {
                    stripePaymentId: chargeSucceeded.id,
                    orderId: chargeSucceeded.metadata.orderId,
                    receiptUrl: chargeSucceeded.receipt_url
                }
                // this.logger.log(`Payment succeeded: ${JSON.stringify(payload)}`);
                this.client.emit('payment.succeeded', payload);
                break;
            default:
                console.log(`Unhandled event type ${event.type}`);
        }
        return res.status(200).json({ sig });
    }
}
