
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

interface LoginResponse {
  message: string;
  token: string;
  admin: {
    username: string;
    role: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class AdminAuth {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  login(
    username: string,
    password: string
  ): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.apiUrl}/login`,
      { username, password }
    );
  }

  saveToken(token: string): void {
    localStorage.setItem('krude_admin_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('krude_admin_token');
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  logout(): void {
    localStorage.removeItem('krude_admin_token');
  }
}
