// import { Routes } from '@angular/router';

// import { Home } from './pages/home/home';
// import { Shop } from './pages/shop/shop';
// import { ProductDetails } from './pages/product-details/product-details';
// import { Cart } from './pages/cart/cart';
// import { Checkout } from './pages/checkout/checkout';
// import { About } from './pages/about/about';
// import { Contact } from './pages/contact/contact';

// import { EditProduct } from './pages/edit-product/edit-product';
// import { AdminLogin } from './pages/admin-login/admin-login';
// import { AdminDashboard } from './pages/admin-dashboard/admin-dashboard';
// import { AddProduct } from './add-product/add-product';
// import { AdminOrders } from './admin/orders/orders';

// export const routes: Routes = [
//   // CUSTOMER WEBSITE
//   { path: '', component: Home },
//   { path: 'shop', component: Shop },
//   { path: 'product-details/:id', component: ProductDetails },
//   { path: 'cart', component: Cart },
//   { path: 'checkout', component: Checkout },
//   { path: 'about', component: About },
//   { path: 'contact', component: Contact },

//   // ADMIN
//   { path: 'admin/login', component: AdminLogin },
//   { path: 'admin/dashboard', component: AdminDashboard },
//   { path: 'admin/add-product', component: AddProduct },
//   { path: 'admin/orders', component: AdminOrders },
//   { path: 'admin/edit-product/:id', component: EditProduct },

//   // PAGE NOT FOUND
//   { path: '**', redirectTo: '' }
// ];


import { Routes } from '@angular/router';
import { ComingSoon } from './pages/coming-soon/coming-soon';

export const routes: Routes = [
  { path: '', component: ComingSoon },
  { path: '**', redirectTo: '' }
];
