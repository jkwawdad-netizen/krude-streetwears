
import { Injectable } from '@angular/core';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  size: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private cartItems: CartItem[] = [];

  addToCart(item: CartItem): void {
    const existingItem = this.cartItems.find(
      cartItem =>
        cartItem.id === item.id &&
        cartItem.size === item.size
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      this.cartItems.push(item);
    }
  }

  getCartItems(): CartItem[] {
    return this.cartItems;
  }

  removeFromCart(id: number, size: string): void {
    this.cartItems = this.cartItems.filter(
      item => !(item.id === id && item.size === size)
    );
  }

  increaseQuantity(id: number, size: string): void {
    const item = this.cartItems.find(
      cartItem => cartItem.id === id && cartItem.size === size
    );

    if (item) {
      item.quantity++;
    }
  }

  decreaseQuantity(id: number, size: string): void {
    const item = this.cartItems.find(
      cartItem => cartItem.id === id && cartItem.size === size
    );

    if (item && item.quantity > 1) {
      item.quantity--;
    }
  }

  getTotal(): number {
    return this.cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }
}
