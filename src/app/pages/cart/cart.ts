
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService, CartItem } from '../../services/cart';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  styleUrl: './cart.css',
  templateUrl: './cart.html',
})
export class Cart {

  cartItems: CartItem[] = [];

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.cartItems = this.cartService.getCartItems();
  }

  getProductImage(image: string): string {
    if (!image) {
      return 'images/krude-logo.png';
    }

    if (image.startsWith('http')) {
      return image;
    }

    const filename = image.split('/').pop();

    return filename
      ? `images/products/${filename}`
      : 'images/krude-logo.png';
  }

  increaseQuantity(id: number, size: string): void {
    this.cartService.increaseQuantity(id, size);
    this.cartItems = this.cartService.getCartItems();
  }

  decreaseQuantity(id: number, size: string): void {
    this.cartService.decreaseQuantity(id, size);
    this.cartItems = this.cartService.getCartItems();
  }

  removeItem(id: number, size: string): void {
    this.cartService.removeFromCart(id, size);
    this.cartItems = this.cartService.getCartItems();
  }

  getTotal(): number {
    return this.cartService.getTotal();
  }
}
