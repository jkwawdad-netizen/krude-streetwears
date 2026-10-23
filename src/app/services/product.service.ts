
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AdminAuth } from './admin-auth';
import { environment } from '../../environments/environment';

export interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  image: string;
  sizes: string[];
  stock: number;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private readonly apiUrl = `${environment.apiUrl}/products`;

  constructor(
    private http: HttpClient,
    private adminAuth: AdminAuth
  ) {}

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.apiUrl);
  }

  getProduct(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/${id}`);
  }

  addProduct(formData: FormData): Observable<any> {
    return this.http.post(
      this.apiUrl,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  updateProduct(id: number, formData: FormData): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/${id}`,
      formData,
      { headers: this.getAuthHeaders() }
    );
  }

  deleteProduct(id: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${id}`,
      { headers: this.getAuthHeaders() }
    );
  }

  private getAuthHeaders(): HttpHeaders {
    const token = this.adminAuth.getToken();

    return new HttpHeaders({
      Authorization: `Bearer ${token ?? ''}`
    });
  }
}
