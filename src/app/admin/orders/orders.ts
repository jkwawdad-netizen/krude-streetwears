
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { environment } from '../../../environments/environment';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface StoreOrder {
  id: number | string;
  whatsappOptIn?: boolean;

  customer?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    region?: string;
    whatsappOptIn?: boolean;
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
  paymentStatus?: string;
  paymentInstructions?: string;
  estimatedDelivery?: string;
  status?: string;
  createdAt?: string;

  rider: {
    name?: string;
    phone?: string;
  };
}

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders.html',
  styleUrl: './orders.css'
})
export class AdminOrders implements OnInit {
  private cdr = inject(ChangeDetectorRef);

  orders: StoreOrder[] = [];
  ordersLoading = false;
  orderError = '';

  updatingOrderId: number | string | null = null;
  deletingOrderId: number | string | null = null;
  savingDeliveryId: number | string | null = null;

  searchTerm = '';
  selectedStatus = 'All';
  currentPage = 1;
  pageSize = 5;

  readonly statuses = [
    'Pending',
    'Confirmed',
    'Processing',
    'Ready for Delivery',
    'Rider Assigned',
    'Out for Delivery',
    'Delivered',
    'Cancelled'
  ];

  readonly paymentMethods = [
    'Shop/Rider Confirmed Payment',
    'Paystack'
  ];

  private readonly ordersUrl = `${environment.apiUrl}/orders`;

  get totalOrders(): number {
    return this.orders.length;
  }

  get pendingOrders(): number {
    return this.orders.filter(
      order =>
        (order.status || 'Pending').toLowerCase() === 'pending'
    ).length;
  }

  get totalRevenue(): number {
    return this.orders
      .filter(
        order =>
          (order.paymentStatus || '').toLowerCase() === 'paid'
      )
      .reduce(
        (sum, order) => sum + Number(order.total || 0),
        0
      );
  }

  get filteredOrders(): StoreOrder[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.orders.filter(order => {
      const customerName = [
        order.customer?.firstName || '',
        order.customer?.lastName || ''
      ].join(' ').toLowerCase();

      const phone = (order.customer?.phone || '').toLowerCase();
      const orderNumber = String(order.id).toLowerCase();
      const riderName = (order.rider?.name || '').toLowerCase();

      const matchesSearch =
        !search ||
        customerName.includes(search) ||
        phone.includes(search) ||
        orderNumber.includes(search) ||
        riderName.includes(search);

      const status = (order.status || 'Pending').toLowerCase();

      const matchesStatus =
        this.selectedStatus === 'All' ||
        status === this.selectedStatus.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }

  get totalPages(): number {
    return Math.max(
      1,
      Math.ceil(this.filteredOrders.length / this.pageSize)
    );
  }

  get paginatedOrders(): StoreOrder[] {
    const start = (this.currentPage - 1) * this.pageSize;

    return this.filteredOrders.slice(
      start,
      start + this.pageSize
    );
  }

  get pageNumbers(): number[] {
    return Array.from(
      { length: this.totalPages },
      (_, index) => index + 1
    );
  }

  get firstVisibleOrder(): number {
    return this.filteredOrders.length === 0
      ? 0
      : (this.currentPage - 1) * this.pageSize + 1;
  }

  get lastVisibleOrder(): number {
    return Math.min(
      this.currentPage * this.pageSize,
      this.filteredOrders.length
    );
  }

  ngOnInit(): void {
    this.loadOrders();
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
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error(
            'Admin authentication failed. Please log in again.'
          );
        }

        throw new Error(
          `Could not load orders (${response.status}).`
        );
      }

      const data = await response.json();

      const loadedOrders: StoreOrder[] = Array.isArray(data)
        ? data
        : Array.isArray(data.orders)
          ? data.orders
          : [];

      this.orders = loadedOrders.map(order => ({
        ...order,
        rider: order.rider ?? { name: '', phone: '' }
      }));

      this.orders.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
      );

      this.keepPageInRange();
    } catch (error) {
      this.orderError =
        error instanceof Error
          ? error.message
          : 'Could not load orders. Please try again.';
    } finally {
      this.ordersLoading = false;
      this.cdr.detectChanges();
    }
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.currentPage = 1;
  }

  onStatusChange(value: string): void {
    this.selectedStatus = value;
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  private keepPageInRange(): void {
    this.currentPage = Math.max(
      1,
      Math.min(this.currentPage, this.totalPages)
    );
  }

  async updateOrderStatus(
    order: StoreOrder,
    newStatus: string
  ): Promise<void> {
    if (
      this.updatingOrderId !== null ||
      this.deletingOrderId !== null ||
      this.savingDeliveryId !== null
    ) {
      return;
    }

    const previousStatus = order.status || 'Pending';

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
          result.message || 'Could not update order status.'
        );
      }

      order.status = newStatus;

      await this.loadOrders();

      alert(`Order #${order.id} status updated.`);
    } catch (error) {
      order.status = previousStatus;

      alert(
        error instanceof Error
          ? error.message
          : 'Could not update status.'
      );
    } finally {
      this.updatingOrderId = null;
      this.cdr.detectChanges();
    }
  }

  async saveDeliveryDetails(order: StoreOrder): Promise<void> {
    if (
      this.savingDeliveryId !== null ||
      this.updatingOrderId !== null ||
      this.deletingOrderId !== null
    ) {
      return;
    }

    const riderName = order.rider?.name?.trim() || '';
    const riderPhone = order.rider?.phone?.trim() || '';
    const fee = Number(order.deliveryFee || 0);

    if (!Number.isFinite(fee) || fee < 0) {
      alert('Enter a valid, non-negative delivery fee.');
      return;
    }

    if (riderName && !riderPhone) {
      alert(
        'Enter the rider phone number when assigning a rider.'
      );
      return;
    }

    if (riderPhone && !riderName) {
      alert(
        'Enter the rider name when adding a rider phone number.'
      );
      return;
    }

    if (
      order.status === 'Rider Assigned' ||
      order.status === 'Out for Delivery'
    ) {
      if (!riderName || !riderPhone) {
        alert(
          'Add the rider name and phone number before assigning delivery.'
        );
        return;
      }
    }

    const oldTotal = order.total;

    order.total = Number(order.subtotal || 0) + fee;
    this.savingDeliveryId = order.id;

    try {
      const response = await fetch(
        `${this.ordersUrl}/${encodeURIComponent(String(order.id))}`,
        {
          method: 'PUT',
          headers: this.getAuthHeaders(),
          body: JSON.stringify({
            rider: {
              name: riderName,
              phone: riderPhone
            },
            deliveryFee: fee,
            total: order.total,
            estimatedDelivery: order.estimatedDelivery || '',
            paymentMethod:
              order.paymentMethod || 'Shop/Rider Confirmed Payment',
            paymentStatus: order.paymentStatus || 'unpaid',
            paymentInstructions: order.paymentInstructions || '',
            status: order.status || 'Pending'
          })
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || 'Could not save delivery details.'
        );
      }

      await this.loadOrders();

      alert(
        `Delivery and payment details for Order #${order.id} were saved.`
      );
    } catch (error) {
      order.total = oldTotal;

      alert(
        error instanceof Error
          ? error.message
          : 'Could not save delivery details.'
      );
    } finally {
      this.savingDeliveryId = null;
      this.cdr.detectChanges();
    }
  }

  sendDeliveryDetails(order: StoreOrder): void {
    // Confirm the customer has opted in to WhatsApp updates.
    if (
      !order.whatsappOptIn &&
      !order.customer?.whatsappOptIn
    ) {
      alert(
        'The customer has not opted in to WhatsApp updates.'
      );
      return;
    }

    const customerPhone = order.customer?.phone?.trim() || '';

    if (!customerPhone) {
      alert('This order has no customer phone number.');
      return;
    }

    if (!order.rider?.name || !order.rider?.phone) {
      alert('Save a rider name and phone number first.');
      return;
    }

    // Remove spaces, brackets, plus signs and other symbols.
    let phone = customerPhone.replace(/\D/g, '');

    // Convert a Ghanaian local number to international format.
    if (phone.startsWith('00')) {
      phone = phone.substring(2);
    } else if (phone.startsWith('0')) {
      phone = '233' + phone.substring(1);
    }

    if (phone.length < 8) {
      alert(
        'The customer phone number looks invalid. Please check it first.'
      );
      return;
    }

    const customerName = [
      order.customer?.firstName || '',
      order.customer?.lastName || ''
    ]
      .join(' ')
      .trim() || 'Customer';

    const deliveryFee = Number(order.deliveryFee || 0);
    const formattedFee = deliveryFee.toFixed(2);

    const estimatedDelivery =
      order.estimatedDelivery?.trim() || 'To be confirmed';

    const paymentMethod =
      order.paymentMethod || 'Not specified';

    const paymentStatus =
      order.paymentStatus || 'Pending';

    const paymentInstructions =
      order.paymentInstructions?.trim() || '';

    const message = [
      `Hello ${customerName},`,
      '',
      `Here is an update on your Krūde Streetwears order #${order.id}.`,
      '',
      'DELIVERY DETAILS',
      `Rider: ${order.rider.name}`,
      `Rider phone: ${order.rider.phone}`,
      `Delivery fee: GH₵${formattedFee}`,
      `Estimated delivery: ${estimatedDelivery}`,
      '',
      'PAYMENT DETAILS',
      `Payment method: ${paymentMethod}`,
      `Payment status: ${paymentStatus}`,
      ...(paymentInstructions
        ? [`Payment instructions: ${paymentInstructions}`]
        : []),
      '',
      'Thank you for shopping with Krūde Streetwears!',
      'Wear Your Attitude.'
    ].join('\n');

    const whatsappUrl =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    // Open WhatsApp; the admin reviews and sends the message manually.
    const whatsappWindow = window.open(
      whatsappUrl,
      '_blank'
    );

    if (!whatsappWindow) {
      alert(
        'WhatsApp could not be opened automatically. Please allow pop-ups and try again.'
      );
    }
  }

  async deleteOrder(order: StoreOrder): Promise<void> {
    if (
      this.deletingOrderId !== null ||
      this.updatingOrderId !== null ||
      this.savingDeliveryId !== null
    ) {
      return;
    }

    const customerName = [
      order.customer?.firstName || '',
      order.customer?.lastName || ''
    ]
      .join(' ')
      .trim() || 'this customer';

    if (
      !window.confirm(
        `Permanently delete Order #${order.id} for ${customerName}?\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    this.deletingOrderId = order.id;

    try {
      const response = await fetch(
        `${this.ordersUrl}/${encodeURIComponent(String(order.id))}`,
        {
          method: 'DELETE',
          headers: this.getAuthHeaders()
        }
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || 'Could not delete this order.'
        );
      }

      this.orders = this.orders.filter(
        existing =>
          String(existing.id) !== String(order.id)
      );

      this.keepPageInRange();

      alert(`Order #${order.id} has been deleted.`);
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : 'Could not delete the order.'
      );
    } finally {
      this.deletingOrderId = null;
      this.cdr.detectChanges();
    }
  }
}
