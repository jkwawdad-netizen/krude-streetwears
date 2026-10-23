
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
ActivatedRoute,
Router,
RouterLink
} from '@angular/router';
import { environment } from '../../../environments/environment';

import {
ProductService,
Product
} from '../../services/product.service';

@Component({
selector: 'app-edit-product',
standalone: true,
imports: [
CommonModule,
FormsModule,
RouterLink
],
templateUrl: './edit-product.html',
styleUrl: './edit-product.css'
})
export class EditProduct implements OnInit {
  readonly backendUrl = environment.backendUrl;

private productService = inject(ProductService);
private route = inject(ActivatedRoute);
private router = inject(Router);

productId = 0;

product: Product = {
id: 0,
name: '',
price: 0,
category: '',
image: '',
sizes: [],
stock: 0,
description: ''
};

sizesInput = '';
selectedFile: File | null = null;
selectedFileName = '';

isLoading = true;
isSaving = false;

successMessage = '';
errorMessage = '';

ngOnInit(): void {


const id = this.route.snapshot.paramMap.get('id');

console.log('Product ID from URL:', id);

if (!id) {
  this.errorMessage = 'Product ID was not found.';
  this.isLoading = false;
  return;
}

this.productId = Number(id);

if (!this.productId) {
  this.errorMessage = 'Invalid product ID.';
  this.isLoading = false;
  return;
}

this.loadProduct();


}

loadProduct(): void {


console.log(
  'Loading product:',
  this.productId
);

this.productService
  .getProduct(this.productId)
  .subscribe({

    next: (product: Product) => {

      console.log(
        'Product loaded:',
        product
      );

      this.product = product;

      this.sizesInput =
        product.sizes.join(', ');

      this.isLoading = false;
    },

    error: (error) => {

      console.error(
        'Could not load product:',
        error
      );

      this.errorMessage =
        'Could not load this product.';

      this.isLoading = false;
    }

  });


}

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

updateProduct(): void {


this.successMessage = '';
this.errorMessage = '';
this.isSaving = true;

const formData = new FormData();

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
    .filter(size => size.length > 0);

formData.append(
  'sizes',
  JSON.stringify(sizes)
);

if (this.selectedFile) {

  formData.append(
    'image',
    this.selectedFile
  );
}

this.productService
  .updateProduct(
    this.productId,
    formData
  )
  .subscribe({

    next: () => {

      this.isSaving = false;

      this.successMessage =
        'Product updated successfully!';

      setTimeout(() => {

        this.router.navigate([
          '/admin/dashboard'
        ]);

      }, 1000);
    },

    error: (error) => {

      console.error(
        'Could not update product:',
        error
      );

      this.isSaving = false;

      this.errorMessage =
        error.error?.message ||
        'Could not update product. Please try again.';
    }

  });


}

}



