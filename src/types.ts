/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProductOption {
  name: string; // e.g., "Size", "Color"
  values: string[]; // e.g., ["S", "M", "L"], ["Red", "Black"]
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  stock: number;
  category: string;
  options: ProductOption[];
  status: "active" | "rejected";
}

export interface Voucher {
  id: string;
  code: string; // e.g., "WELCOME10"
  discountType: "percent" | "flat";
  discountValue: number; // e.g., 10 for 10% or $10
  isActive: boolean;
}

export interface ShippingMethod {
  id: string;
  name: string; // e.g., "Standard Ground"
  price: number;
  estimatedDays: string; // e.g., "3-5 Business Days"
  isActive: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  selectedOptions: Record<string, string>; // optionName -> selectedValue
  quantity: number;
  maxStock: number;
}

export interface ShippingAddress {
  name: string;
  phone: string;
  houseNumber: string;
  address: string;
  district: string;
  postcode: string;
  state: string;
}

export interface Order {
  id: string;
  customerCode: string; // unique code to distinguish other customers
  customerName: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    selectedOptions: Record<string, string>;
  }[];
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  voucherCodeUsed?: string;
  shippingMethodName: string;
  createdAt: string; // ISO string
  status: "pending" | "processing" | "completed" | "cancelled";
}

export interface User {
  id: string;
  username: string;
  password?: string; // mocked secure comparison
  name: string;
  phone: string;
  houseNumber: string;
  address: string;
  district: string;
  postcode: string;
  state: string;
  isGuest?: boolean;
}
