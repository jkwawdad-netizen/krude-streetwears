
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService, CartItem } from '../../services/cart';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart implements OnInit {
  cartItems: CartItem[] = [];

  constructor(private cartService: CartService) {}

  ngOnInit(): void {
    this.loadCart();
  }

  loadCart(): void {
    this.cartItems = this.cartService.getCartItems();
  }

  increaseQuantity(id: number, size: string): void {
    this.cartService.increaseQuantity(id, size);
    this.loadCart();
  }

  decreaseQuantity(id: number, size: string): void {
    this.cartService.decreaseQuantity(id, size);
    this.loadCart();
  }

  removeItem(id: number, size: string): void {
    this.cartService.removeFromCart(id, size);
    this.loadCart();
  }

  getTotal(): number {
    return this.cartService.getTotal();
  }

  getProductImage(image: string): string {
    if (!image) return 'images/krude-logo.png';

    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image;
    }

    if (image.startsWith('/uploads/')) {
      return 'https://krude-streetwears.onrender.com' + image;
    }

    if (image.startsWith('uploads/')) {
      return 'https://krude-streetwears.onrender.com/' + image;
    }

    return image;
  }
}
