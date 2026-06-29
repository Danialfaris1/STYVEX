/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Product, Voucher, ShippingMethod } from "./types";

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: "prod-1",
    name: "Classic Leather Backpack",
    description: "Handcrafted from full-grain leather, featuring a padded laptop sleeve, solid brass hardware, and adjustable ergonomic shoulder straps. Designed for daily commutes and weekend escapes.",
    price: 129,
    imageUrl: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=60",
    stock: 15,
    category: "Bags",
    options: [
      { name: "Color", values: ["Tan Brown", "Chestnut", "Obsidian Black"] },
      { name: "Size", values: ["Standard (18L)", "Large (24L)"] }
    ],
    status: "active"
  },
  {
    id: "prod-2",
    name: "Minimalist Solar Wristwatch",
    description: "Sleek, solar-powered watch with an ultra-thin stainless steel casing, sapphire crystal face, and interchangeable quick-release vegetable-tanned leather straps.",
    price: 189,
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60",
    stock: 8,
    category: "Accessories",
    options: [
      { name: "Dial Accent", values: ["Silver White", "Sunray Blue", "Matte Charcoal"] },
      { name: "Strap Type", values: ["Brown Leather", "Black Leather", "Mesh Steel"] }
    ],
    status: "active"
  },
  {
    id: "prod-3",
    name: "Ribbed Wool Beanie",
    description: "Knit from extrafine merino wool, this heavy-weight beanie provides exceptional thermal regulation, moisture wicking, and itch-free comfort in freezing temperatures.",
    price: 34,
    imageUrl: "https://images.unsplash.com/photo-1576871337622-98d48d4353d3?w=600&auto=format&fit=crop&q=60",
    stock: 45,
    category: "Apparel",
    options: [
      { name: "Color", values: ["Heather Grey", "Olive Green", "Mustard Gold", "Navy Blue"] }
    ],
    status: "active"
  },
  {
    id: "prod-4",
    name: "Artisan Ceramic Coffee Mug",
    description: "Wheel-thrown by studio potters. Featuring a wide finger loop and a beautiful speckled dual-tone reactive glaze, making each mug entirely unique.",
    price: 24,
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=60",
    stock: 30,
    category: "Home Goods",
    options: [
      { name: "Glaze Finish", values: ["Seasalt & Cobalt", "Forest Green & Sand", "Volcanic Ash"] }
    ],
    status: "active"
  },
  {
    id: "prod-5",
    name: "Premium Noise-Cancelling Earbuds",
    description: "Advanced active noise cancellation, high-fidelity dynamic drivers, IPX4 sweat resistance, and a wireless charging case offering up to 32 hours of total playback.",
    price: 149,
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=60",
    stock: 12,
    category: "Electronics",
    options: [
      { name: "Color", values: ["Frost White", "Space Grey"] }
    ],
    status: "active"
  }
];

export const INITIAL_VOUCHERS: Voucher[] = [
  {
    id: "vouch-1",
    code: "WELCOME10",
    discountType: "percent",
    discountValue: 10,
    isActive: true
  },
  {
    id: "vouch-2",
    code: "FLAT25",
    discountType: "flat",
    discountValue: 25,
    isActive: true
  },
  {
    id: "vouch-3",
    code: "SUMMER20",
    discountType: "percent",
    discountValue: 20,
    isActive: true
  }
];

export const INITIAL_SHIPPING: ShippingMethod[] = [
  {
    id: "ship-1",
    name: "Standard Delivery",
    price: 5.00,
    estimatedDays: "3-5 Business Days",
    isActive: true
  },
  {
    id: "ship-2",
    name: "Express Shipping",
    price: 15.00,
    estimatedDays: "1-2 Business Days",
    isActive: true
  },
  {
    id: "ship-3",
    name: "Next Day Priority",
    price: 30.00,
    estimatedDays: "Next Business Day Guaranteed",
    isActive: true
  },
  {
    id: "ship-4",
    name: "Store Self-Pickup",
    price: 0.00,
    estimatedDays: "Ready in 2 Hours (Free)",
    isActive: true
  }
];
