import { Component, inject } from '@angular/core';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

import { Router, RouterLink } from '@angular/router';

import { ProductService } from '../services/product.service';

@Component({
  selector: 'app-add-product',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './add-product.html',
  styleUrl: './add-product.css'
})

export class AddProduct {

  private productService = inject(ProductService);
  private router = inject(Router);

  product = {
    name: '',
    price: 0,
    category: '',
    stock: 0,
    description: ''
  };

  sizesInput = '';

  selectedFile: File | null = null;

  selectedFileName = '';

  isLoading = false;

  successMessage = '';

  errorMessage = '';

  onFileSelected(event: Event): void {

    const input =
      event.target as HTMLInputElement;

    if (
      input.files &&
      input.files.length > 0
    ) {

      this.selectedFile =
        input.files[0];

      this.selectedFileName =
        this.selectedFile.name;
    }
  }

  addProduct(): void {

    this.successMessage = '';

    this.errorMessage = '';

    if (!this.selectedFile) {

      this.errorMessage =
        'Please select a product image.';

      return;
    }

    this.isLoading = true;

    const formData =
      new FormData();

    formData.append(
      'name',
      this.product.name
    );

    formData.append(
      'price',
      this.product.price.toString()
    );

    formData.append(
      'category',
      this.product.category
    );

    formData.append(
      'stock',
      this.product.stock.toString()
    );

    formData.append(
      'description',
      this.product.description
    );

    const sizes =
      this.sizesInput
        .split(',')
        .map(size => size.trim())
        .filter(
          size => size.length > 0
        );

    formData.append(
      'sizes',
      JSON.stringify(sizes)
    );

    formData.append(
      'image',
      this.selectedFile
    );

    this.productService
      .addProduct(formData)
      .subscribe({

        next: () => {

          this.isLoading = false;

          this.successMessage =
            'Product uploaded successfully!';

          this.product = {
            name: '',
            price: 0,
            category: '',
            stock: 0,
            description: ''
          };

          this.sizesInput = '';

          this.selectedFile = null;

          this.selectedFileName = '';

          /*
           * Return to the Admin Dashboard
           * after the product is uploaded.
           *
           * The dashboard will load the
           * latest products automatically.
           */
          setTimeout(() => {

            this.router.navigate([
              '/admin/dashboard'
            ]);

          }, 800);

        },

        error: (error: any) => {

          this.isLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Could not upload product. Please try again.';

        }

      });

  }

}