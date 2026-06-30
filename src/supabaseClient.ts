import { createClient } from "@supabase/supabase-js";
import { Product, Voucher, ShippingMethod, Order, User, CartItem } from "./types";

// User provided credentials
const DEFAULT_SUPABASE_URL = "https://cffqsxyuddwsrpikhwmm.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sb_publishable_ukot-psRd3Ju4Ykz8W8ejg_HaJ9eVqN";

const metaEnv = (import.meta as any).env || {};
const SUPABASE_URL = metaEnv.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = metaEnv.VITE_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- SQL Script for Supabase SQL Editor ---
export const SUPABASE_SQL_SETUP = `-- STYVEXSTORE Database Setup
-- Paste this script into your Supabase SQL Editor (https://supabase.com/dashboard/project/cffqsxyuddwsrpikhwmm/sql/new) and click "Run".

-- 1. Create Products Table
create table if not exists styvex_products (
  id text primary key,
  name text not null,
  description text not null,
  price numeric not null,
  image_url text not null,
  stock integer not null,
  category text not null,
  options jsonb not null default '[]'::jsonb,
  status text not null
);

-- 2. Create Vouchers Table
create table if not exists styvex_vouchers (
  id text primary key,
  code text not null unique,
  discount_type text not null,
  discount_value numeric not null,
  is_active boolean not null default true
);

-- 3. Create Shipping Methods Table
create table if not exists styvex_shipping_methods (
  id text primary key,
  name text not null,
  price numeric not null,
  estimated_days text not null,
  is_active boolean not null default true
);

-- 4. Create Users Table
create table if not exists styvex_users (
  id text primary key,
  username text not null unique,
  password text,
  name text not null,
  phone text not null,
  house_number text not null,
  address text not null,
  district text not null,
  postcode text not null,
  state text not null,
  is_guest boolean not null default false
);

-- 5. Create Orders Table
create table if not exists styvex_orders (
  id text primary key,
  customer_code text not null,
  customer_name text not null,
  customer_phone text not null,
  shipping_address jsonb not null,
  items jsonb not null,
  subtotal numeric not null,
  discount numeric not null,
  shipping_fee numeric not null,
  total numeric not null,
  voucher_code_used text,
  shipping_method_name text not null,
  created_at text not null,
  status text not null
);

-- 6. Create Staff IDs Table
create table if not exists styvex_staff_ids (
  staff_id text primary key
);

-- 7. Create Cart Table (Saves shopping cart items for real-time multi-device sync)
create table if not exists styvex_cart (
  id text primary key,
  session_id text not null,
  product_id text not null,
  name text not null,
  price numeric not null,
  image_url text not null,
  selected_options jsonb not null default '{}'::jsonb,
  quantity integer not null,
  max_stock integer not null
);

-- Enable Row Level Security (RLS) or disable for simple anon access
-- In Supabase, newly created tables have RLS enabled by default, or disabled depending on settings.
-- To allow public client-side sync without complex Auth rules, we can disable RLS or create a general allow policy.
alter table styvex_products disable row level security;
alter table styvex_vouchers disable row level security;
alter table styvex_shipping_methods disable row level security;
alter table styvex_users disable row level security;
alter table styvex_orders disable row level security;
alter table styvex_staff_ids disable row level security;
alter table styvex_cart disable row level security;

-- Insert Default Staff ID
insert into styvex_staff_ids (staff_id) values ('585355') on conflict (staff_id) do nothing;

-- 8. Enable Realtime postgres_changes replication for tables (Highly Recommended for Realtime Screen Syncing)
-- Run these to allow Supabase to push updates instantly to phones and computers.
-- (If any table is already in the publication, you can run them individually or ignore "already exists" warnings)
alter publication supabase_realtime add table styvex_products;
alter publication supabase_realtime add table styvex_vouchers;
alter publication supabase_realtime add table styvex_shipping_methods;
alter publication supabase_realtime add table styvex_orders;
alter publication supabase_realtime add table styvex_users;
alter publication supabase_realtime add table styvex_staff_ids;
alter publication supabase_realtime add table styvex_cart;
`;

// --- DB Mapping Helpers ---

export function mapProductToDB(p: Product) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    price: p.price,
    image_url: p.imageUrl,
    stock: p.stock,
    category: p.category,
    options: p.options,
    status: p.status,
  };
}

export function mapProductFromDB(db: any): Product {
  return {
    id: db.id,
    name: db.name,
    description: db.description,
    price: Number(db.price),
    imageUrl: db.image_url,
    stock: Number(db.stock),
    category: db.category,
    options: Array.isArray(db.options) ? db.options : [],
    status: db.status as "active" | "rejected",
  };
}

export function mapVoucherToDB(v: Voucher) {
  return {
    id: v.id,
    code: v.code,
    discount_type: v.discountType,
    discount_value: v.discountValue,
    is_active: v.isActive,
  };
}

export function mapVoucherFromDB(db: any): Voucher {
  return {
    id: db.id,
    code: db.code,
    discountType: db.discount_type as "percent" | "flat",
    discountValue: Number(db.discount_value),
    isActive: Boolean(db.is_active),
  };
}

export function mapShippingToDB(s: ShippingMethod) {
  if (!s) return {};
  return {
    id: s.id || `ship-${Math.random().toString(36).substr(2, 9)}`,
    name: s.name || "Unnamed Shipping",
    price: typeof s.price === "number" ? s.price : Number(s.price) || 0,
    estimated_days: s.estimatedDays || (s as any).estimated_days || "3-5 Business Days",
    is_active: typeof s.isActive === "boolean" ? s.isActive : (typeof (s as any).is_active === "boolean" ? (s as any).is_active : true),
  };
}

export function mapShippingFromDB(db: any): ShippingMethod {
  if (!db) {
    return {
      id: `ship-${Math.random().toString(36).substr(2, 9)}`,
      name: "Unnamed Shipping",
      price: 0,
      estimatedDays: "3-5 Business Days",
      isActive: true,
    };
  }
  return {
    id: db.id,
    name: db.name || "Unnamed Shipping",
    price: typeof db.price === "number" ? db.price : Number(db.price) || 0,
    estimatedDays: db.estimated_days || db.estimatedDays || "3-5 Business Days",
    isActive: typeof db.is_active === "boolean" ? db.is_active : (typeof db.isActive === "boolean" ? db.isActive : true),
  };
}

export function mapUserToDB(u: User) {
  return {
    id: u.id,
    username: u.username,
    password: u.password,
    name: u.name,
    phone: u.phone,
    house_number: u.houseNumber,
    address: u.address,
    district: u.district,
    postcode: u.postcode,
    state: u.state,
    is_guest: Boolean(u.isGuest),
  };
}

export function mapUserFromDB(db: any): User {
  return {
    id: db.id,
    username: db.username,
    password: db.password || undefined,
    name: db.name,
    phone: db.phone,
    houseNumber: db.house_number,
    address: db.address,
    district: db.district,
    postcode: db.postcode,
    state: db.state,
    isGuest: Boolean(db.is_guest),
  };
}

export function mapOrderToDB(o: Order) {
  return {
    id: o.id,
    customer_code: o.customerCode,
    customer_name: o.customerName,
    customer_phone: o.customerPhone,
    shipping_address: o.shippingAddress,
    items: o.items,
    subtotal: o.subtotal,
    discount: o.discount,
    shipping_fee: o.shippingFee,
    total: o.total,
    voucher_code_used: o.voucherCodeUsed,
    shipping_method_name: o.shippingMethodName,
    created_at: o.createdAt,
    status: o.status,
  };
}

export function mapOrderFromDB(db: any): Order {
  return {
    id: db.id,
    customerCode: db.customer_code,
    customerName: db.customer_name,
    customerPhone: db.customer_phone,
    shippingAddress: db.shipping_address,
    items: Array.isArray(db.items) ? db.items : [],
    subtotal: Number(db.subtotal),
    discount: Number(db.discount),
    shippingFee: Number(db.shipping_fee),
    total: Number(db.total),
    voucherCodeUsed: db.voucher_code_used || undefined,
    shippingMethodName: db.shipping_method_name,
    createdAt: db.created_at,
    status: db.status as "pending" | "processing" | "completed" | "cancelled",
  };
}

export function getCartItemId(sessionId: string, productId: string, selectedOptions: Record<string, string>) {
  const optionsString = Object.entries(selectedOptions || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([k, v]) => `${k}:${v}`)
    .join(",");
  return `${sessionId}_${productId}_${optionsString}`;
}

export function mapCartItemToDB(item: CartItem, sessionId: string) {
  const itemId = getCartItemId(sessionId, item.productId, item.selectedOptions);
  return {
    id: itemId,
    session_id: sessionId,
    product_id: item.productId,
    name: item.name,
    price: item.price,
    image_url: item.imageUrl,
    selected_options: item.selectedOptions,
    quantity: item.quantity,
    max_stock: item.maxStock,
  };
}

export function mapCartItemFromDB(db: any): CartItem {
  return {
    productId: db.product_id,
    name: db.name,
    price: Number(db.price),
    imageUrl: db.image_url,
    selectedOptions: typeof db.selected_options === "object" && db.selected_options !== null ? db.selected_options : {},
    quantity: Number(db.quantity),
    maxStock: Number(db.max_stock),
  };
}

