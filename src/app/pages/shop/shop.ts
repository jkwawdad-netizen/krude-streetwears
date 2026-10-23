
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';

import {
  ProductService,
  Product
} from '../../services/product.service';

import { CartService } from '../../services/cart';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [
    RouterLink
  ],
  styleUrl: './shop.css',
  templateUrl: './shop.html',
})
export class Shop implements OnInit {

  readonly backendUrl = environment.backendUrl;

  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private cdr = inject(ChangeDetectorRef);

  selectedCategory = 'ALL';

  products: Product[] = [];

  isLoading = true;
  errorMessage = '';

  currentPage = 1;

  productsPerPage = 6;

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.productService
      .getProducts()
      .subscribe({

        next: (products: Product[]) => {
          console.log(
            'Shop products loaded:',
            products
          );

          this.products = products;

          this.isLoading = false;

          this.currentPage = 1;

          this.cdr.detectChanges();
        },

        error: (error) => {
          console.error(
            'Could not load shop products:',
            error
          );

          this.errorMessage =
            'Could not load products. Please try again.';

          this.isLoading = false;

          this.cdr.detectChanges();
        }

      });
  }

  selectCategory(category: string): void {
    this.selectedCategory = category;
    this.currentPage = 1;
  }

  get filteredProducts(): Product[] {

    const getShopCategory = (
      category: string
    ): string => {

      const normalized =
        category.trim().toUpperCase();

      if (
        normalized === 'CROCS' ||
        normalized === 'SNEAKERS'
      ) {
        return 'SHOES';
      }

      return normalized;
    };

    if (this.selectedCategory === 'ALL') {

      const categoryProducts =
        new Map<string, Product>();

      for (const product of this.products) {

        const category =
          getShopCategory(product.category);

        const existing =
          categoryProducts.get(category);

        if (
          !existing ||
          product.id > existing.id
        ) {
          categoryProducts.set(
            category,
            product
          );
        }
      }

      return Array.from(
        categoryProducts.values()
      );
    }

    return this.products.filter(
      product => {

        const shopCategory =
          getShopCategory(product.category);

        return (
          shopCategory ===
          this.selectedCategory.toUpperCase()
        );
      }
    );
  }

  get paginatedProducts(): Product[] {

    const startIndex =
      (this.currentPage - 1) *
      this.productsPerPage;

    const endIndex =
      startIndex +
      this.productsPerPage;

    return this.filteredProducts.slice(
      startIndex,
      endIndex
    );
  }

  get totalPages(): number {

    return Math.ceil(
      this.filteredProducts.length /
      this.productsPerPage
    );
  }

  get pageNumbers(): number[] {

    return Array.from(
      { length: this.totalPages },
      (_, index) => index + 1
    );
  }

  goToPage(page: number): void {

    if (
      page < 1 ||
      page > this.totalPages
    ) {
      return;
    }

    this.currentPage = page;

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  quickAdd(product: Product): void {

    this.cartService.addToCart({

      id: product.id,

      name: product.name,

      price: product.price,

      image: product.image,

      size: product.sizes?.[0] || 'L',

      quantity: 1

    });

    alert('Added to cart!');
  }

}