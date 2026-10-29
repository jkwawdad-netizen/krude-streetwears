
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { environment } from '../../../environments/environment';

type PaymentState = 'checking' | 'success' | 'failed' | 'missing';

@Component({
  selector: 'app-payment-callback',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './payment-callback.html',
  styleUrl: './payment-callback.css'
})
export class PaymentCallback implements OnInit {
  state: PaymentState = 'checking';
  message = 'Please wait while we verify your payment securely.';
  orderId: number | null = null;

  constructor(private route: ActivatedRoute) {}

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const reference =
      params.get('reference') || params.get('trxref');

    if (!reference) {
      this.state = 'missing';
      this.message =
        'No payment reference was received. If you completed payment, please contact Krūde Streetwears before paying again.';
      return;
    }

    try {
      const response = await fetch(
        `${environment.apiUrl}/payments/paystack/verify/${encodeURIComponent(reference)}`
      );

      const result = await response.json();

      if (
        response.ok &&
        result.verified === true &&
        result.paymentStatus === 'paid'
      ) {
        this.state = 'success';
        this.orderId = result.orderId ?? null;
        this.message = 'Your payment has been verified successfully. Thank you for shopping with Krūde Streetwears.';
      } else {
        this.state = 'failed';
        this.message =
          result.message ||
          'We could not confirm your payment yet. Please contact the shop before attempting another payment.';
      }
    } catch (error) {
      console.error('PAYMENT VERIFICATION ERROR:', error);
      this.state = 'failed';
      this.message =
        'We could not connect to the payment verification service. Please contact the shop before paying again.';
    }
  }
}
