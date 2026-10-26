
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService, type CartItem } from '../../services/cart';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  styleUrl: './checkout.css',
  templateUrl: './checkout.html',
})
export class Checkout {
  private cartService: CartService = inject(CartService);
  readonly backendUrl = environment.backendUrl;
  private readonly ordersUrl = `${environment.apiUrl}/orders`;

  private readonly whatsappNumber = '233541224227';

  cartItems: CartItem[] = [];

  customer = {
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    region: '',
  };

  deliveryMethod = 'Standard Delivery';
  paymentMethod = 'Shop/Rider Confirmed Payment';

  // WhatsApp updates require the customer's explicit consent.
  whatsappOptIn = false;

  isSubmitting = false;
  orderSubmitted = false;
  private readonly apiUrl = environment.apiUrl;

  constructor() {
    this.loadCart();
  }

  loadCart(): void {
    this.cartItems = this.cartService.getCartItems();
  }

  get subtotal(): number {
    return this.cartItems.reduce(
      (total, item) => total + Number(item.price) * Number(item.quantity),
      0
    );
  }

  getProductImage(image: string | undefined): string {
  if (!image) {
    return 'https://placehold.co/400x500?text=Krude+Streetwears';
  }

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image;
  }

  if (image.startsWith('/uploads/')) {
    return `${this.backendUrl}${image}`;
  }

  if (image.startsWith('/')) {
    return image;
  }

  if (image.startsWith('uploads/')) {
    return `${this.backendUrl}/${image}`;
  }

  return `${this.backendUrl}/uploads/${image}`;
}

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = 'https://placehold.co/400x500?text=Image+Unavailable';
  }

  private validateCheckout(): boolean {
    if (this.cartItems.length === 0) {
      alert('Your cart is empty. Please add a product before checkout.');
      return false;
    }

    if (
      !this.customer.firstName.trim() ||
      !this.customer.lastName.trim() ||
      !this.customer.phone.trim() ||
      !this.customer.address.trim() ||
      !this.customer.city.trim() ||
      !this.customer.region.trim()
    ) {
      alert('Please complete all required customer details.');
      return false;
    }

    return true;
  }

  async placeOrder(): Promise<void> {
    this.loadCart();

    if (this.isSubmitting || this.orderSubmitted) {
      return;
    }

    if (!this.validateCheckout()) {
      return;
    }

    this.isSubmitting = true;

    // Open the tab during the click so the browser is less likely to block it.
    const whatsappWindow = window.open('about:blank', '_blank');

    try {
      const orderPayload = {
        customer: {
          ...this.customer,
          whatsappOptIn: this.whatsappOptIn,
        },
        whatsappOptIn: this.whatsappOptIn,
        items: this.cartItems.map((item) => ({ ...item })),
        subtotal: this.subtotal,
        deliveryFee: 0,
        total: this.subtotal,
        deliveryMethod: this.deliveryMethod,
        paymentMethod: this.paymentMethod,
      };

      const response = await fetch(this.ordersUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const result = await response.json();

      if (!response.ok || !result.order?.id) {
        throw new Error(result.message || 'Could not submit your order.');
      }

      
const order = result.order;

// Paystack checkout
if (this.paymentMethod === 'Paystack') {
  try {
    const paymentResponse = await fetch(
      `${this.apiUrl}/payments/paystack/initialize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
        }),
      }
    );

    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok || !paymentResult.authorizationUrl) {
      throw new Error(
        paymentResult.message || 'Could not initialize Paystack payment.'
      );
    }

    this.orderSubmitted = true;
    window.location.href = paymentResult.authorizationUrl;
    return;
  } catch (paymentError) {
    console.error('PAYSTACK INITIALIZATION ERROR:', paymentError);
    throw paymentError;
  }
}

this.orderSubmitted = true;


      const customerName =
        `${this.customer.firstName.trim()} ${this.customer.lastName.trim()}`;

      const products = this.cartItems
        .map((item, index) => {
          const size = item.size ? ` | Size: ${item.size}` : '';

          return (
            `${index + 1}. ${item.name}${size}\n` +
            `Quantity: ${item.quantity}\n` +
            `Price: GH₵ ${(Number(item.price) * Number(item.quantity)).toFixed(2)}`
          );
        })
        .join('\n\n');

      const message = [
        'Hello Krūde Streetwears! My order has been submitted through your website.',
        '',
        `Order number: #${order.id}`,
        '',
        'CUSTOMER DETAILS',
        `Name: ${customerName}`,
        `Phone: ${this.customer.phone.trim()}`,
        `Email: ${this.customer.email.trim() || 'Not provided'}`,
        `Address: ${this.customer.address.trim()}`,
        `City: ${this.customer.city.trim()}`,
        `Region: ${this.customer.region.trim()}`,
        '',
        'ORDER DETAILS',
        products,
        '',
        `Subtotal: GH₵ ${this.subtotal.toFixed(2)}`,
        'Delivery fee: To be confirmed by the shop',
        `Delivery method: ${this.deliveryMethod}`,
        `Payment method: ${this.paymentMethod}`,
        '',
        'Please confirm my order, delivery fee and payment arrangements.',
      ].join('\n');

      const whatsappUrl =
        `https://wa.me/${this.whatsappNumber}?text=${encodeURIComponent(message)}`;

      if (whatsappWindow) {
        whatsappWindow.location.href = whatsappUrl;
      }

      alert(
        `Order #${order.id} has been saved successfully! ` +
        'WhatsApp will open so you can send your order details to the shop.'
      );
    } catch (error) {
      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close();
      }

      console.error('ORDER SUBMISSION ERROR:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'We could not submit your order. Please check your connection and try again.'
      );
    } finally {
      this.isSubmitting = false;
    }
  }
}
