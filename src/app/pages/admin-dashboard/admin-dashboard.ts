import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { environment } from '../../../environments/environment';

import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import {
  ProductService,
  Product
} from '../../services/product.service';

interface StoreOrder {
  id: number | string;
  customer?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    region?: string;
  };
  items?: {
    id?: number | string;
    name?: string;
    price?: number;
    quantity?: number;
    size?: string;
  }[];
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  deliveryMethod?: string;
  paymentMethod?: string;
  status?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  readonly backendUrl = environment.backendUrl;
  
  private productService = inject(ProductService);
  private cdr = inject(ChangeDetectorRef);

  products: Product[] = [];
  orders: StoreOrder[] = [];

  lowStock = 0;
  ordersLoading = false;
  orderError = '';
  updatingOrderId: number | string | null = null;
  deletingProductId: number | null = null;

  private readonly ordersUrl = `${environment.apiUrl}/orders`;

  get totalProducts(): number {
    return this.products.length;
  }

  get totalOrders(): number {
    return this.orders.length;
  }

  get totalRevenue(): number {
    return this.orders
      .filter(order =>
        ['paid', 'completed', 'delivered'].includes(
          (order.status || '').toLowerCase()
        )
      )
      .reduce((total, order) => total + Number(order.total || 0), 0);
  }

  ngOnInit(): void {
    this.loadProducts();
    this.loadOrders();
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (products: Product[]) => {
        this.products = products;

        this.lowStock = products.filter(
          product => product.stock <= 5
        ).length;

        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Could not load products:', error);
      }
    });
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('krude_admin_token');

    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
  }

  async loadOrders(): Promise<void> {
    this.ordersLoading = true;
    this.orderError = '';

    try {
      const response = await fetch(this.ordersUrl, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'Admin authentication failed. Please log in again.'
          );
        }

        throw new Error(`Could not load orders (${response.status}).`);
      }

      const data = await response.json();

      this.orders = Array.isArray(data)
        ? data
        : Array.isArray(data.orders)
          ? data.orders
          : [];

    } catch (error) {
      console.error('Could not load orders:', error);

      this.orderError = error instanceof Error
        ? error.message
        : 'Could not load orders. Please try again.';
    } finally {
      this.ordersLoading = false;
      this.cdr.detectChanges();
    }
  }

  async updateOrderStatus(
    order: StoreOrder,
    newStatus: string
  ): Promise<void> {
    if (this.updatingOrderId !== null) {
      return;
    }

    this.updatingOrderId = order.id;

    try {
      const response = await fetch(
        `${this.ordersUrl}/${encodeURIComponent(String(order.id))}`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({ status: newStatus })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || 'Could not update the order status.'
        );
      }

      order.status = newStatus;
      await this.loadOrders();

      alert(`Order #${order.id} status updated to ${newStatus}.`);
    } catch (error) {
      console.error('Could not update order:', error);

      alert(
        error instanceof Error
          ? error.message
          : 'Could not update order status. Please try again.'
      );
    } finally {
      this.updatingOrderId = null;
      this.cdr.detectChanges();
    }
  }

  deleteProduct(product: Product): void {
    const confirmed = confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    this.deletingProductId = product.id;

    this.productService.deleteProduct(product.id).subscribe({
      next: () => {
        this.products = this.products.filter(
          item => item.id !== product.id
        );

        this.lowStock = this.products.filter(
          item => item.stock <= 5
        ).length;

        this.deletingProductId = null;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Could not delete product:', error);

        alert('Could not delete the product. Please try again.');

        this.deletingProductId = null;
      }
    });
  }
}