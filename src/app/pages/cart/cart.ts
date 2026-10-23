import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService, CartItem } from '../../services/cart';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, RouterLink],
  styleUrl: './cart.css',
  templateUrl: './cart.html',
})
export class Cart {
  readonly backendUrl = environment.backendUrl;

  cartItems: CartItem[] = [];

  constructor(private cartService: CartService) {}

  ngOnInit() {
    this.cartItems = this.cartService.getCartItems();
  }

  increaseQuantity(id: number, size: string) {
    this.cartService.increaseQuantity(id, size);
  }

  decreaseQuantity(id: number, size: string) {
    this.cartService.decreaseQuantity(id, size);
  }

  removeItem(id: number, size: string) {
    this.cartService.removeFromCart(id, size);
    this.cartItems = this.cartService.getCartItems();
  }

  getTotal(): number {
    return this.cartService.getTotal();
  }

}