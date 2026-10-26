
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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

  private cartCountSubject = new BehaviorSubject<number>(0);
  cartCount$ = this.cartCountSubject.asObservable();

  private updateCartCount(): void {
    const count = this.cartItems.reduce(
      (total, item) => total + item.quantity,
      0
    );
    this.cartCountSubject.next(count);
  }

  addToCart(item: CartItem): void {
    const existingItem = this.cartItems.find(
      cartItem => cartItem.id === item.id && cartItem.size === item.size
    );

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      this.cartItems.push(item);
    }

    this.updateCartCount();
  }

  getCartItems(): CartItem[] {
    return this.cartItems;
  }

  getCartCount(): number {
    return this.cartCountSubject.value;
  }

  removeFromCart(id: number, size: string): void {
    this.cartItems = this.cartItems.filter(
      item => !(item.id === id && item.size === size)
    );
    this.updateCartCount();
  }

  increaseQuantity(id: number, size: string): void {
    const item = this.cartItems.find(
      cartItem => cartItem.id === id && cartItem.size === size
    );

    if (item) {
      item.quantity++;
      this.updateCartCount();
    }
  }

  decreaseQuantity(id: number, size: string): void {
    const item = this.cartItems.find(
      cartItem => cartItem.id === id && cartItem.size === size
    );

    if (item && item.quantity > 1) {
      item.quantity--;
      this.updateCartCount();
    }
  }

  getTotal(): number {
    return this.cartItems.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }
}
