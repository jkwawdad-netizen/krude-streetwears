import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminAuth } from '../../services/admin-auth';

@Component({
  selector: 'app-admin-login',
  imports: [
    CommonModule,
    RouterLink,
    FormsModule
  ],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css'
})
export class AdminLogin {
  username = '';
  password = '';
  errorMessage = '';
  isLoading = false;

  constructor(
    private adminAuth: AdminAuth,
    private router: Router
  ) {}

  login(): void {
    this.errorMessage = '';

    if (!this.username || !this.password) {
      this.errorMessage =
        'Please enter your username and password.';
      return;
    }

    this.isLoading = true;

    this.adminAuth
      .login(this.username, this.password)
      .subscribe({
        next: (response) => {
          this.adminAuth.saveToken(response.token);

          this.router.navigate([
            '/admin/dashboard'
          ]);
        },

        error: (error) => {
          this.isLoading = false;

          this.errorMessage =
            error.error?.message ||
            'Login failed. Please try again.';
        }
      });
  }
}