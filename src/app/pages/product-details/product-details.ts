
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { environment } from '../../../environments/environment';

import {
  ActivatedRoute,
  RouterLink
} from '@angular/router';

import {
  ProductService,
  Product
} from '../../services/product.service';

import {
  CartService
} from '../../services/cart';


@Component({
  selector: 'app-product-details',
  standalone: true,

  imports: [
    RouterLink
  ],

  styleUrl: './product-details.css',

  templateUrl: './product-details.html',
})
export class ProductDetails implements OnInit {
  readonly backendUrl = environment.backendUrl;

  private route = inject(ActivatedRoute);

  private productService = inject(ProductService);

  private cartService = inject(CartService);

  private cdr = inject(ChangeDetectorRef);


  product: Product | null = null;

  selectedSize = '';

  quantity = 1;

  isLoading = true;

  errorMessage = '';


  ngOnInit(): void {

    const id = Number(
      this.route.snapshot.paramMap.get('id')
    );

    console.log('Product ID:', id);

    if (!id) {

      this.errorMessage =
        'Invalid product.';

      this.isLoading = false;

      this.cdr.detectChanges();

      return;

    }

    this.loadProduct(id);

  }


  loadProduct(id: number): void {

    this.isLoading = true;

    this.errorMessage = '';

    this.productService
      .getProduct(id)
      .subscribe({

        next: (product: Product) => {

          console.log(
            'Product details loaded:',
            product
          );

          this.product = product;

          this.selectedSize =
            product.sizes?.[0] || '';

          this.isLoading = false;

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(
            'Could not load product:',
            error
          );

          this.errorMessage =
            'Could not load this product.';

          this.isLoading = false;

          this.cdr.detectChanges();

        }

      });

  }


  selectSize(size: string): void {

    this.selectedSize = size;

  }


  decreaseQuantity(): void {

    if (this.quantity > 1) {

      this.quantity--;

    }

  }


  increaseQuantity(): void {

    if (
      this.product &&
      this.quantity < this.product.stock
    ) {

      this.quantity++;

    }

  }


  addToCart(): void {

    if (!this.product) {

      return;

    }


    if (this.product.stock <= 0) {

      alert('This product is sold out.');

      return;

    }


    this.cartService.addToCart({

      id: this.product.id,

      name: this.product.name,

      price: this.product.price,

      image: this.product.image,

      size: this.selectedSize,

      quantity: this.quantity

    });


    alert('Added to cart!');

  }

}

