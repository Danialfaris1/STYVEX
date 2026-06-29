/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  TrendingUp,
  ShoppingBag,
  Tag,
  Truck,
  Plus,
  Minus,
  X,
  CheckCircle,
  AlertCircle,
  User as UserIcon,
  Trash2,
  Sliders,
  DollarSign,
  Package,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Users,
  LogOut,
  Upload,
  Image as ImageIcon,
  Database,
  RefreshCw,
  Copy,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, Voucher, ShippingMethod, Order, ProductOption } from "../types";
import { SUPABASE_SQL_SETUP } from "../supabaseClient";

interface StaffPortalProps {
  products: Product[];
  vouchers: Voucher[];
  shippingMethods: ShippingMethod[];
  orders: Order[];
  addProduct: (p: Omit<Product, "id" | "status">) => void;
  toggleProductStatus: (id: string) => void;
  updateProductStock: (id: string, newStock: number) => void;
  addOptionToProduct: (productId: string, option: ProductOption) => void;
  removeOptionFromProduct: (productId: string, optionName: string) => void;
  addVoucher: (v: Omit<Voucher, "id" | "isActive">) => void;
  toggleVoucherStatus: (id: string) => void;
  addShippingMethod: (s: Omit<ShippingMethod, "id" | "isActive">) => void;
  toggleShippingStatus: (id: string) => void;
  updateOrderStatus: (id: string, status: Order["status"]) => void;
  deleteProduct: (id: string) => void;
  deleteOrder: (id: string) => void;
  authenticatedStaffId?: string;
  onLogoutStaff?: () => void;
  staffIds?: string[];
  registerStaffId?: (id: string) => { success: boolean; error?: string };
  supabaseStatus?: Record<string, "synced" | "missing" | "error" | "loading">;
  isSyncing?: boolean;
  syncError?: string | null;
  syncFromSupabase?: () => Promise<void>;
}

export default function StaffPortal({
  products,
  vouchers,
  shippingMethods,
  orders,
  addProduct,
  toggleProductStatus,
  updateProductStock,
  addOptionToProduct,
  removeOptionFromProduct,
  addVoucher,
  toggleVoucherStatus,
  addShippingMethod,
  toggleShippingStatus,
  updateOrderStatus,
  deleteProduct,
  deleteOrder,
  authenticatedStaffId = "",
  onLogoutStaff = () => {},
  staffIds = [],
  registerStaffId = () => ({ success: false, error: "Not configured" }),
  supabaseStatus = {},
  isSyncing = false,
  syncError = null,
  syncFromSupabase = async () => {}
}: StaffPortalProps) {
  // --- Tab State ---
  const [activeTab, setActiveTab] = useState<"orders" | "products" | "vouchers" | "shipping" | "staff-ids" | "supabase">("orders");

  // --- SQL Copy State ---
  const [sqlCopied, setSqlCopied] = useState(false);

  // --- Staff Registration Form State ---
  const [newStaffIdInput, setNewStaffIdInput] = useState("");
  const [staffRegError, setStaffRegError] = useState("");
  const [staffRegSuccess, setStaffRegSuccess] = useState("");

  // --- Add Product Form State ---
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pStock, setPStock] = useState("");
  const [pCategory, setPCategory] = useState("Apparel");
  const [pImage, setPImage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  // Preset Image Options for fast creating
  const IMAGE_PRESETS = [
    { name: "Leather Bag", url: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop&q=60" },
    { name: "Watch", url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=60" },
    { name: "Hat", url: "https://images.unsplash.com/photo-1576871337622-98d48d4353d3?w=600&auto=format&fit=crop&q=60" },
    { name: "Mug", url: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=60" },
    { name: "Gadget", url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=600&auto=format&fit=crop&q=60" },
  ];

  // --- Product Stock / Option Manager State ---
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null);
  const [optName, setOptName] = useState("");
  const [optValues, setOptValues] = useState(""); // comma separated e.g. "S, M, L"

  // --- Add Voucher Form State ---
  const [vCode, setVCode] = useState("");
  const [vType, setVType] = useState<"percent" | "flat">("percent");
  const [vValue, setVValue] = useState("");

  // --- Add Shipping Method State ---
  const [sName, setSName] = useState("");
  const [sPrice, setSPrice] = useState("");
  const [sDays, setSDays] = useState("");

  // --- Deletion State Helpers ---
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  // --- Analytics Calculations ---
  const completedOrders = orders.filter((o) => o.status === "completed");
  const totalSales = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const totalQuantitySold = completedOrders.reduce((sum, o) => sum + o.items.reduce((acc, item) => acc + item.quantity, 0), 0);
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "processing");
  const lowStockProductsCount = products.filter((p) => p.stock <= 5 && p.status === "active").length;

  // Process uploaded image file to Base64 data URL
  const processImageFile = (file: File) => {
    setImageUploadError("");
    if (!file.type.startsWith("image/")) {
      setImageUploadError("Only image files (JPEG, PNG, WEBP, etc.) are allowed.");
      return;
    }
    // Limit size to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setImageUploadError("Image size must be less than 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === "string") {
        setPImage(e.target.result);
      } else {
        setImageUploadError("Failed to read image file.");
      }
    };
    reader.onerror = () => {
      setImageUploadError("Error reading image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Handle Add Product Submit
  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName || !pPrice || !pStock) return;

    // Default image if empty
    const imgUrl = pImage || IMAGE_PRESETS[0].url;

    addProduct({
      name: pName,
      description: pDesc || "No description provided.",
      price: parseFloat(pPrice),
      stock: parseInt(pStock, 10),
      category: pCategory,
      imageUrl: imgUrl,
      options: []
    });

    // Reset Form
    setPName("");
    setPDesc("");
    setPPrice("");
    setPStock("");
    setPImage("");
    setShowAddProductModal(false);
  };

  // Handle Add Option Submit
  const handleOptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForOptions || !optName || !optValues) return;

    const valuesArray = optValues
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (valuesArray.length === 0) return;

    addOptionToProduct(selectedProductForOptions.id, {
      name: optName.trim(),
      values: valuesArray
    });

    // Sync state for modal representation
    const freshProduct = products.find((p) => p.id === selectedProductForOptions.id);
    if (freshProduct) {
      setSelectedProductForOptions({
        ...freshProduct,
        options: [...freshProduct.options.filter((o) => o.name.toLowerCase() !== optName.trim().toLowerCase()), { name: optName.trim(), values: valuesArray }]
      });
    }

    setOptName("");
    setOptValues("");
  };

  const handleRemoveOption = (optName: string) => {
    if (!selectedProductForOptions) return;
    removeOptionFromProduct(selectedProductForOptions.id, optName);

    setSelectedProductForOptions({
      ...selectedProductForOptions,
      options: selectedProductForOptions.options.filter((o) => o.name !== optName)
    });
  };

  // Handle Add Voucher Submit
  const handleVoucherSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vCode || !vValue) return;

    addVoucher({
      code: vCode.toUpperCase().trim(),
      discountType: vType,
      discountValue: parseFloat(vValue)
    });

    setVCode("");
    setVValue("");
  };

  // Handle Add Shipping Method Submit
  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sName || !sPrice || !sDays) return;

    addShippingMethod({
      name: sName,
      price: parseFloat(sPrice),
      estimatedDays: sDays
    });

    setSName("");
    setSPrice("");
    setSDays("");
  };

  // Handle Staff ID Registration Submit
  const handleStaffRegSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStaffRegError("");
    setStaffRegSuccess("");
    const trimmedId = newStaffIdInput.trim();

    if (!trimmedId) {
      setStaffRegError("Please enter a numeric Staff ID.");
      return;
    }

    const result = registerStaffId(trimmedId);
    if (result.success) {
      setStaffRegSuccess(`Staff ID ${trimmedId} registered successfully!`);
      setNewStaffIdInput("");
    } else {
      setStaffRegError(result.error || "Failed to register Staff ID.");
    }
  };

  return (
    <div className="min-h-screen bg-natural-bg text-natural-text font-sans flex flex-col" id="staff-portal-root">
      {/* Top Staff Navigation Header */}
      <header className="border-b border-natural-border bg-white px-6 py-5 sticky top-0 z-45">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4">
          <div className="flex items-center space-x-3 self-start lg:self-auto">
            <div className="bg-brand text-white p-2.5 rounded-xl shadow-lg shadow-brand/10">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-serif font-black text-xl tracking-tight text-natural-text flex items-center gap-2">
                Staff Control Console
              </h1>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-natural-muted text-[10px] uppercase font-bold tracking-widest">Live Store Management</p>
                {authenticatedStaffId && (
                  <>
                    <span className="text-natural-muted/40 text-[10px]">&bull;</span>
                    <span className="bg-brand/5 text-brand border border-brand/10 text-[9px] font-extrabold px-2 py-0.5 rounded-lg font-mono flex items-center gap-1">
                      <span className="h-1.5 w-1.5 bg-brand rounded-full animate-pulse"></span>
                      ID: {authenticatedStaffId}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sub Navigation Bar & Logout Actions */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <nav className="flex flex-wrap gap-1 bg-natural-secondary p-1.5 rounded-xl border border-natural-border text-xs font-semibold w-full sm:w-auto justify-center">
              <button
                onClick={() => setActiveTab("orders")}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === "orders" ? "bg-brand text-white shadow-md shadow-brand/10" : "text-natural-muted hover:text-natural-text"
                }`}
              >
                Customer Purchases ({orders.length})
              </button>
              <button
                id="staff-tab-products"
                onClick={() => setActiveTab("products")}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === "products" ? "bg-brand text-white shadow-md shadow-brand/10" : "text-natural-muted hover:text-natural-text"
                }`}
              >
                Inventory & Options
              </button>
              <button
                onClick={() => setActiveTab("vouchers")}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === "vouchers" ? "bg-brand text-white shadow-md shadow-brand/10" : "text-natural-muted hover:text-natural-text"
                }`}
              >
                Discount Vouchers
              </button>
              <button
                onClick={() => setActiveTab("shipping")}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer ${
                  activeTab === "shipping" ? "bg-brand text-white shadow-md shadow-brand/10" : "text-natural-muted hover:text-natural-text"
                }`}
              >
                Shipping Logistics
              </button>
              <button
                onClick={() => setActiveTab("staff-ids")}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  activeTab === "staff-ids" ? "bg-brand text-white shadow-md shadow-brand/10" : "text-natural-muted hover:text-natural-text"
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>Staff IDs ({staffIds.length})</span>
              </button>
              <button
                onClick={() => setActiveTab("supabase")}
                className={`px-3 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "supabase" ? "bg-accent-indigo text-white shadow-md shadow-accent-indigo/10" : "text-natural-muted hover:text-natural-text"
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                <span>Supabase Sync</span>
              </button>
            </nav>

            {authenticatedStaffId && (
              <button
                onClick={onLogoutStaff}
                className="w-full sm:w-auto px-4 py-2.5 bg-natural-secondary hover:bg-natural-border border border-natural-border text-natural-text hover:text-terracotta rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                title="Sign Out of operator session"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Core Analytics Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-natural-border shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-natural-muted">Total Sales</span>
              <DollarSign className="h-5 w-5 text-brand" />
            </div>
            <p className="font-mono text-2xl font-black text-brand">${totalSales.toFixed(2)}</p>
            <span className="text-[10px] text-natural-muted mt-1 block">From completed checkouts</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-natural-border shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-natural-muted">Orders Received</span>
              <Package className="h-5 w-5 text-sage" />
            </div>
            <p className="font-mono text-2xl font-black text-natural-text">{orders.length}</p>
            <span className="text-[10px] text-sage mt-1 block">
              {pendingOrders.length} active pending/processing
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-natural-border shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-natural-muted">Units Dispatched</span>
              <TrendingUp className="h-5 w-5 text-brand" />
            </div>
            <p className="font-mono text-2xl font-black text-natural-text">{totalQuantitySold}</p>
            <span className="text-[10px] text-natural-muted mt-1 block">Dispatched items</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-natural-border shadow-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-natural-muted">Low Stock Warnings</span>
              <AlertCircle className="h-5 w-5 text-terracotta" />
            </div>
            <p className="font-mono text-2xl font-black text-terracotta">{lowStockProductsCount}</p>
            <span className="text-[10px] text-terracotta mt-1 block">Products with &le; 5 units left</span>
          </div>
        </div>

        {/* Tab 1: Orders (Customer Purchases) */}
        {activeTab === "orders" && (
          <div className="bg-white rounded-2xl border border-natural-border overflow-hidden shadow-xs" id="orders-registry-root">
            <div className="p-5 border-b border-natural-border flex justify-between items-center bg-natural-secondary/20">
              <div>
                <h3 className="font-serif font-bold text-lg text-natural-text">Customer Purchases</h3>
                <p className="text-xs text-natural-muted">Track purchase transactions, recipient address coordinates, and set shipment status.</p>
              </div>
            </div>

            {orders.length === 0 ? (
              <div className="p-16 text-center">
                <div className="bg-natural-secondary h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 border border-natural-border">
                  <ShoppingBag className="h-6 w-6 text-natural-muted" />
                </div>
                <h4 className="text-base font-bold text-natural-text">No orders placed yet</h4>
                <p className="text-natural-muted text-xs mt-1">Customer checkouts will stream into this registry in real-time.</p>
              </div>
            ) : (
              <div className="divide-y divide-natural-border">
                {orders.map((order) => (
                  <div key={order.id} className="p-6 hover:bg-natural-secondary/20 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-natural-border">
                      {/* Left: Code, Date, Client Info */}
                      <div className="flex gap-4 items-start">
                        <div className="bg-natural-secondary border border-natural-border rounded-xl p-3 text-center min-w-24">
                          <span className="text-[9px] uppercase font-bold text-natural-muted block">Customer Code</span>
                          <span className="font-mono font-black text-brand text-base tracking-wider block mt-1">{order.customerCode}</span>
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-natural-text">{order.customerName}</span>
                            <span className="text-natural-muted text-xs font-mono">&bull; {order.customerPhone}</span>
                          </div>
                          <p className="text-natural-muted text-xs mt-1">
                            Placed on {new Date(order.createdAt).toLocaleString()}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="bg-natural-secondary text-natural-text border border-natural-border text-[10px] font-semibold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                              <Truck className="h-3 w-3 text-natural-muted" />
                              <span>{order.shippingMethodName} (${order.shippingFee.toFixed(2)})</span>
                            </span>
                            {order.voucherCodeUsed && (
                              <span className="bg-brand/10 text-brand border border-brand/20 text-[10px] font-semibold px-2.5 py-0.5 rounded-lg flex items-center gap-1">
                                <Tag className="h-3 w-3 text-brand" />
                                <span>Promo: {order.voucherCodeUsed}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Status Modifier and Price tag */}
                      <div className="flex flex-wrap items-center gap-4 self-end lg:self-center">
                        <div className="text-right">
                          <span className="text-[10px] text-natural-muted uppercase font-bold block">Grand Total</span>
                          <span className="font-mono text-xl font-black text-brand mt-1 block">${order.total.toFixed(2)}</span>
                        </div>

                        <div className="bg-natural-secondary p-2 rounded-xl border border-natural-border flex items-center gap-2">
                          <span className="text-xs font-semibold text-natural-muted pr-1 border-r border-natural-border">Status</span>
                          <select
                            value={order.status}
                            onChange={(e) => updateOrderStatus(order.id, e.target.value as Order["status"])}
                            className="bg-white text-xs font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand border border-natural-border text-natural-text cursor-pointer"
                          >
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled (Return Stock)</option>
                          </select>
                        </div>

                        <div className="flex items-center">
                          {deletingOrderId === order.id ? (
                            <div className="flex items-center gap-1.5 bg-natural-secondary p-1 rounded-xl border border-natural-border">
                              <button
                                onClick={() => {
                                  deleteOrder(order.id);
                                  setDeletingOrderId(null);
                                }}
                                className="px-3 py-1.5 bg-terracotta text-white rounded-lg text-[10px] font-bold hover:bg-terracotta/90 transition-all cursor-pointer"
                              >
                                Confirm Delete
                              </button>
                              <button
                                onClick={() => setDeletingOrderId(null)}
                                className="px-2.5 py-1.5 bg-white text-natural-text rounded-lg text-[10px] font-bold border border-natural-border hover:bg-natural-secondary transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingOrderId(order.id)}
                              className="p-3 bg-natural-secondary hover:bg-terracotta/10 text-natural-muted hover:text-terracotta rounded-xl border border-natural-border hover:border-terracotta/20 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
                              title="Throw away this order"
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="hidden sm:inline">Trash Order</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 text-xs">
                      {/* Customer Delivery Coordinates */}
                      <div>
                        <h4 className="font-bold text-[10px] uppercase text-natural-muted tracking-wider mb-2">Delivery Coordinates (Address Form)</h4>
                        <div className="bg-natural-secondary/30 p-4 rounded-xl border border-natural-border space-y-1.5 text-natural-text">
                          <div className="flex justify-between border-b border-natural-border pb-1.5">
                            <span className="text-natural-muted">Street Address:</span>
                            <span className="font-medium text-natural-text">{order.shippingAddress.address}</span>
                          </div>
                          <div className="flex justify-between border-b border-natural-border pb-1.5">
                            <span className="text-natural-muted">House / Apt Number:</span>
                            <span className="font-medium text-natural-text">{order.shippingAddress.houseNumber}</span>
                          </div>
                          <div className="flex justify-between border-b border-natural-border pb-1.5">
                            <span className="text-natural-muted">District / City:</span>
                            <span className="font-medium text-natural-text">{order.shippingAddress.district}</span>
                          </div>
                          <div className="flex justify-between border-b border-natural-border pb-1.5">
                            <span className="text-natural-muted">Postcode:</span>
                            <span className="font-mono font-semibold text-natural-text">{order.shippingAddress.postcode}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-natural-muted">State:</span>
                            <span className="font-medium text-natural-text">{order.shippingAddress.state}</span>
                          </div>
                        </div>
                      </div>

                      {/* Items Listing breakdown */}
                      <div>
                        <h4 className="font-bold text-[10px] uppercase text-natural-muted tracking-wider mb-2">Ordered Items</h4>
                        <div className="border border-natural-border rounded-xl divide-y divide-natural-border overflow-hidden">
                          {order.items.map((item, index) => (
                            <div key={index} className="p-3 bg-natural-secondary/10 flex justify-between items-center">
                              <div>
                                <span className="font-bold text-natural-text">{item.name}</span>
                                {Object.keys(item.selectedOptions).length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {Object.entries(item.selectedOptions).map(([k, v]) => (
                                      <span key={k} className="bg-white border border-natural-border text-natural-muted px-1.5 py-0.5 rounded text-[9px] font-semibold">
                                        {k}: {v}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-bold text-brand">${item.price.toFixed(2)}</p>
                                <p className="text-natural-muted text-[10px]">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Products Management (Add, Options, Stock, Reject) */}
        {activeTab === "products" && (
          <div className="space-y-6" id="products-management-root">
            {/* Header controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-natural-border shadow-xs">
              <div>
                <h3 className="font-serif font-bold text-lg text-natural-text">Product Inventory Console</h3>
                <p className="text-xs text-natural-muted">Add new retail items, customize product variants, adjust/reject stock counts, and reject/hide items from the catalog.</p>
              </div>
              <button
                id="btn-add-product-dialog"
                onClick={() => setShowAddProductModal(true)}
                className="bg-brand hover:bg-brand-hover text-white font-bold px-4 py-2.5 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Add Retail Item</span>
              </button>
            </div>

            {/* Inventory Grid Table */}
            <div className="bg-white border border-natural-border rounded-2xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-natural-secondary border-b border-natural-border text-natural-muted uppercase font-bold text-[10px] tracking-wider">
                    <th className="py-4 px-5">Item Details</th>
                    <th className="py-4 px-4">Category</th>
                    <th className="py-4 px-4">Retail Price</th>
                    <th className="py-4 px-4 text-center">In-Stock Count</th>
                    <th className="py-4 px-4">Options Attached</th>
                    <th className="py-4 px-4 text-center">Catalog Visibility</th>
                    <th className="py-4 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-natural-border">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-natural-secondary/15 transition-colors">
                      {/* Details Column */}
                      <td className="py-4 px-5">
                        <div className="flex items-center space-x-3">
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="h-12 w-12 rounded-lg object-cover border border-natural-border shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-natural-text text-sm truncate max-w-[180px]">{prod.name}</h4>
                            <p className="text-[10px] text-natural-muted truncate max-w-[180px] mt-0.5">{prod.description}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 text-natural-text font-semibold">{prod.category}</td>

                      {/* Price */}
                      <td className="py-4 px-4 font-mono font-bold text-natural-text">${prod.price.toFixed(2)}</td>

                      {/* In-Stock Count Manager (Add/Reject Stock) */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            title="Reject/Reduce Stock"
                            onClick={() => updateProductStock(prod.id, prod.stock - 1)}
                            className="p-1.5 bg-natural-secondary hover:bg-natural-border text-natural-muted hover:text-terracotta rounded border border-natural-border transition-colors cursor-pointer"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={prod.stock}
                            onChange={(e) => updateProductStock(prod.id, parseInt(e.target.value, 10) || 0)}
                            className="w-14 bg-white text-center font-mono font-bold text-natural-text rounded py-1 px-1 border border-natural-border focus:outline-none focus:ring-1 focus:ring-brand"
                          />
                          <button
                            title="Add Stock"
                            onClick={() => updateProductStock(prod.id, prod.stock + 1)}
                            className="p-1.5 bg-natural-secondary hover:bg-natural-border text-natural-muted hover:text-sage rounded border border-natural-border transition-colors cursor-pointer"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        {prod.stock === 0 && (
                          <span className="text-[9px] uppercase font-bold text-terracotta block text-center mt-1">Out of Stock</span>
                        )}
                      </td>

                      {/* Options List */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1.5">
                          {prod.options.length === 0 ? (
                            <span className="text-natural-muted text-[10px]">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {prod.options.map((opt) => (
                                <span key={opt.name} className="bg-natural-secondary text-natural-text px-2 py-0.5 rounded border border-natural-border text-[9px] font-semibold" title={opt.values.join(", ")}>
                                  {opt.name} ({opt.values.length})
                                </span>
                              ))}
                            </div>
                          )}
                          <button
                            onClick={() => setSelectedProductForOptions(prod)}
                            className="text-brand hover:text-brand-hover font-bold text-[10px] flex items-center gap-1 self-start transition-colors cursor-pointer mt-0.5"
                          >
                            <Sliders className="h-3 w-3" />
                            <span>Manage Options</span>
                          </button>
                        </div>
                      </td>

                      {/* Catalog Visibility (Toggle/Reject Item) */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <button
                            id={`btn-reject-${prod.id}`}
                            onClick={() => toggleProductStatus(prod.id)}
                            className={`px-3 py-1.5 rounded-lg font-bold text-[10px] border transition-all cursor-pointer ${
                              prod.status === "active"
                                ? "bg-natural-secondary text-sage border-natural-border hover:bg-natural-border"
                                : "bg-natural-secondary text-terracotta border-natural-border hover:bg-natural-border"
                            }`}
                          >
                            {prod.status === "active" ? "Active (Listed)" : "Rejected (Hidden)"}
                          </button>
                        </div>
                      </td>

                      {/* Actions Column */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center">
                          {deletingProductId === prod.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  deleteProduct(prod.id);
                                  setDeletingProductId(null);
                                }}
                                className="px-2.5 py-1.5 bg-terracotta text-white rounded-md text-[10px] font-bold hover:bg-terracotta/90 transition-all cursor-pointer"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeletingProductId(null)}
                                className="px-2 py-1.5 bg-natural-secondary hover:bg-natural-border text-natural-text rounded-md text-[10px] font-bold border border-natural-border transition-all cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeletingProductId(prod.id)}
                              className="p-2 bg-natural-secondary hover:bg-terracotta/10 text-natural-muted hover:text-terracotta rounded-lg border border-natural-border hover:border-terracotta/20 transition-all cursor-pointer inline-flex items-center gap-1 text-[10px] font-semibold"
                              title="Throw away this item"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Trash</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Voucher Promos registry */}
        {activeTab === "vouchers" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="vouchers-management-root">
            {/* Left side: Add Voucher Form */}
            <div className="bg-white p-6 rounded-2xl border border-natural-border self-start shadow-xs">
              <h3 className="font-serif font-bold text-base text-natural-text mb-4 flex items-center gap-2">
                <Tag className="h-5 w-5 text-brand" />
                <span>Add Voucher Code</span>
              </h3>

              <form onSubmit={handleVoucherSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Promo Voucher Code</label>
                  <input
                    type="text"
                    required
                    placeholder="WINTER20"
                    value={vCode}
                    onChange={(e) => setVCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-1 focus:ring-brand focus:bg-white text-natural-text font-mono uppercase tracking-wider transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Discount Type</label>
                    <select
                      value={vType}
                      onChange={(e) => setVType(e.target.value as "percent" | "flat")}
                      className="w-full px-3 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-1 focus:ring-brand focus:bg-white text-natural-text cursor-pointer"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="flat">Flat Dollar ($)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Discount Value</label>
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="e.g. 15"
                      value={vValue}
                      onChange={(e) => setVValue(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-1 focus:ring-brand focus:bg-white text-natural-text font-mono transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Voucher Code</span>
                </button>
              </form>
            </div>

            {/* Right side: Active Vouchers List */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-natural-border overflow-hidden shadow-xs">
              <div className="p-5 border-b border-natural-border bg-natural-secondary/20">
                <h3 className="font-serif font-bold text-base text-natural-text">Active Vouchers</h3>
                <p className="text-natural-muted text-xs">Vouchers currently configured for consumer checkouts.</p>
              </div>

              <div className="divide-y divide-natural-border text-xs">
                {vouchers.map((v) => (
                  <div key={v.id} className="p-4 flex items-center justify-between hover:bg-natural-secondary/15 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="bg-natural-secondary p-2.5 rounded-xl border border-natural-border text-brand">
                        <Tag className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-mono font-black text-natural-text text-sm tracking-wider uppercase">{v.code}</span>
                        <p className="text-[10px] text-natural-muted mt-0.5">
                          Value: {v.discountType === "percent" ? `${v.discountValue}% Off` : `$${v.discountValue.toFixed(2)} Off`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleVoucherStatus(v.id)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[10px] border transition-all cursor-pointer ${
                          v.isActive
                            ? "bg-natural-secondary text-sage border-natural-border hover:bg-natural-border"
                            : "bg-natural-secondary text-terracotta border-natural-border hover:bg-natural-border"
                        }`}
                      >
                        {v.isActive ? "Active (Accepting)" : "Rejected (Deplaced)"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Shipping Logistics (Add & Toggle Shipping Methods) */}
        {activeTab === "shipping" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="shipping-management-root">
            {/* Left side: Add Shipping Option Form */}
            <div className="bg-white p-6 rounded-2xl border border-natural-border self-start shadow-xs">
              <h3 className="font-serif font-bold text-base text-natural-text mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-brand" />
                <span>Add Shipping Method</span>
              </h3>

              <form onSubmit={handleShippingSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Shipping Method Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DHL Express Delivery"
                    value={sName}
                    onChange={(e) => setSName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-1 focus:ring-brand focus:bg-white text-natural-text transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Delivery Cost ($)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      placeholder="e.g. 12.50"
                      value={sPrice}
                      onChange={(e) => setSPrice(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-1 focus:ring-brand focus:bg-white text-natural-text font-mono transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Estimated Duration</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1-2 Business Days"
                      value={sDays}
                      onChange={(e) => setSDays(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-1 focus:ring-brand focus:bg-white text-natural-text transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Create Delivery Method</span>
                </button>
              </form>
            </div>

            {/* Right side: Shipping Options List */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-natural-border overflow-hidden shadow-xs">
              <div className="p-5 border-b border-natural-border bg-natural-secondary/20">
                <h3 className="font-serif font-bold text-base text-natural-text">Configured Logistics Methods</h3>
                <p className="text-natural-muted text-xs">These methods will display to customers during cart checkout.</p>
              </div>

              <div className="divide-y divide-natural-border text-xs">
                {shippingMethods.map((sm) => (
                  <div key={sm.id} className="p-4 flex items-center justify-between hover:bg-natural-secondary/15 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="bg-natural-secondary p-2.5 rounded-xl border border-natural-border text-brand">
                        <Truck className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="font-bold text-natural-text text-sm">{sm.name}</span>
                        <p className="text-[10px] text-natural-muted mt-0.5">
                          Cost: {sm.price === 0 ? "FREE" : `$${sm.price.toFixed(2)}`} &bull; Est: {sm.estimatedDays}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => toggleShippingStatus(sm.id)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-[10px] border transition-all cursor-pointer ${
                          sm.isActive
                            ? "bg-natural-secondary text-sage border-natural-border hover:bg-natural-border"
                            : "bg-natural-secondary text-terracotta border-natural-border hover:bg-natural-border"
                        }`}
                      >
                        {sm.isActive ? "Active (Accepting)" : "Rejected (Disabled)"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Staff ID Registration & Operator Management */}
        {activeTab === "staff-ids" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="staff-ids-management-root">
            {/* Left side: Add/Register Staff ID Form */}
            <div className="bg-white p-6 rounded-2xl border border-natural-border self-start shadow-xs">
              <h3 className="font-serif font-bold text-base text-natural-text mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand" />
                <span>Register Operator ID</span>
              </h3>

              <form onSubmit={handleStaffRegSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">New Staff ID (Digits Only)</label>
                  <input
                    type="text"
                    required
                    pattern="\d*"
                    placeholder="e.g. 585356"
                    value={newStaffIdInput}
                    onChange={(e) => setNewStaffIdInput(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-1 focus:ring-brand focus:bg-white text-natural-text font-mono tracking-wider transition-all"
                  />
                  <p className="text-[9px] text-natural-muted mt-1">Choose a unique numeric identifier for the operator console.</p>
                </div>

                {staffRegError && (
                  <div className="bg-natural-secondary text-terracotta text-xs p-3 rounded-xl border border-natural-border/60">
                    {staffRegError}
                  </div>
                )}

                {staffRegSuccess && (
                  <div className="bg-natural-secondary text-sage text-xs p-3 rounded-xl border border-natural-border/60">
                    {staffRegSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                >
                  <Plus className="h-4 w-4" />
                  <span>Register Staff ID</span>
                </button>
              </form>
            </div>

            {/* Right side: Registered Staff IDs List */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-natural-border overflow-hidden shadow-xs">
              <div className="p-5 border-b border-natural-border bg-natural-secondary/20">
                <h3 className="font-serif font-bold text-base text-natural-text">Authorized Operator Registry</h3>
                <p className="text-natural-muted text-xs">A comprehensive list of numeric Staff IDs that are authorized to access the live console.</p>
              </div>

              <div className="divide-y divide-natural-border text-xs">
                {staffIds.map((id) => {
                  const isDefault = id === "585355";
                  const isActive = id === authenticatedStaffId;
                  return (
                    <div key={id} className="p-4 flex items-center justify-between hover:bg-natural-secondary/15 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="bg-natural-secondary p-2.5 rounded-xl border border-natural-border text-brand">
                          <Users className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="font-mono font-black text-natural-text text-sm tracking-wider">Operator ID: {id}</span>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {isDefault && (
                              <span className="bg-brand/5 text-brand border border-brand/15 text-[9px] font-bold px-2 py-0.5 rounded-md">
                                System Default ID
                              </span>
                            )}
                            {isActive && (
                              <span className="bg-sage/15 text-sage border border-sage/20 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                                <span className="h-1 w-1 bg-sage rounded-full animate-pulse"></span>
                                Currently Logged In
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-natural-muted text-[10px]">
                        Authorized
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === "supabase" && (
          <div className="space-y-6" id="supabase-sync-management-root">
            {/* Supabase Hero Panel */}
            <div className="bg-radial from-accent-indigo/10 to-transparent border border-accent-indigo/20 p-6 rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 select-none pointer-events-none">
                <Database className="h-40 w-40 text-accent-indigo" />
              </div>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-serif font-black text-xl text-natural-text mb-1.5 flex items-center gap-2">
                    <Database className="h-5 w-5 text-accent-indigo" />
                    <span>Supabase Cloud Integration</span>
                  </h3>
                  <p className="text-natural-muted text-xs max-w-2xl leading-relaxed">
                    Sistem ini menyegerakan semua barangan, tempahan, baucar, dan tetapan operator secara langsung ke akaun awan Supabase anda. Ini membolehkan telefon pintar, komputer riba, dan peranti lain sentiasa memaparkan data jualan yang sama secara waktu-nyata!
                  </p>
                </div>
                <button
                  onClick={async () => {
                    await syncFromSupabase();
                  }}
                  disabled={isSyncing}
                  className="bg-accent-indigo hover:bg-accent-indigo-hover text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? "Menyegerakan..." : "Segerak Sekarang"}</span>
                </button>
              </div>
            </div>

            {/* Connection and Table Status Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Credentials Panel */}
              <div className="bg-white p-5 rounded-2xl border border-natural-border shadow-xs">
                <h4 className="font-serif font-bold text-sm text-natural-text mb-4">Maklumat Sambungan</h4>
                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Supabase Project URL</label>
                    <div className="px-3 py-2 bg-natural-secondary border border-natural-border rounded-xl font-mono truncate text-natural-text">
                      https://cffqsxyuddwsrpikhwmm.supabase.co
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Anon / Public Key</label>
                    <div className="px-3 py-2 bg-natural-secondary border border-natural-border rounded-xl font-mono truncate text-natural-text">
                      sb_publishable_ukot...8W8ejg_HaJ9eVqN
                    </div>
                  </div>
                  <div className="pt-2">
                    <span className="inline-flex items-center gap-1.5 bg-sage/5 text-sage border border-sage/20 text-[10px] font-bold px-2.5 py-1 rounded-lg">
                      <span className="h-1.5 w-1.5 bg-sage rounded-full animate-pulse"></span>
                      Client Aktif & Bersedia
                    </span>
                  </div>
                </div>
              </div>

              {/* Tables Status Panel */}
              <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-natural-border shadow-xs">
                <h4 className="font-serif font-bold text-sm text-natural-text mb-3">Status Segerak Jadual (Database Tables)</h4>
                <p className="text-natural-muted text-xs mb-4">Jika anda melihat status <span className="text-terracotta font-semibold">"Jadual Hilang"</span>, ia bermakna jadual tersebut belum dicipta di Supabase. Sila salin kod SQL di bawah dan tampalkannya ke dalam Supabase SQL Editor anda.</p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {[
                    { key: "products", label: "Barangan (styvex_products)" },
                    { key: "vouchers", label: "Baucar (styvex_vouchers)" },
                    { key: "shippingMethods", label: "Penghantaran (styvex_shipping_methods)" },
                    { key: "orders", label: "Tempahan (styvex_orders)" },
                    { key: "users", label: "Akaun Pelanggan (styvex_users)" },
                    { key: "staffIds", label: "Kod Operator (styvex_staff_ids)" },
                    { key: "cart", label: "Troli Membeli-belah (styvex_cart)" },
                  ].map((table) => {
                    const status = supabaseStatus[table.key] || "loading";
                    return (
                      <div key={table.key} className="p-3 bg-natural-secondary/30 border border-natural-border rounded-xl flex items-center justify-between">
                        <span className="font-medium text-natural-text">{table.label}</span>
                        {status === "loading" && (
                          <span className="text-yellow-600 font-mono text-[10px] flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                            Loading...
                          </span>
                        )}
                        {status === "synced" && (
                          <span className="text-sage font-bold text-[10px] bg-sage/5 border border-sage/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            Segerak
                          </span>
                        )}
                        {status === "missing" && (
                          <span className="text-terracotta font-bold text-[10px] bg-terracotta/5 border border-terracotta/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Jadual Hilang
                          </span>
                        )}
                        {status === "error" && (
                          <span className="text-amber-600 font-bold text-[10px] bg-amber-500/5 border border-amber-500/15 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Ralat
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SQL Migration Setup Panel */}
            <div className="bg-white rounded-2xl border border-natural-border overflow-hidden shadow-xs">
              <div className="p-5 border-b border-natural-border bg-natural-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-serif font-bold text-sm text-natural-text">Langkah Setup Database Supabase</h4>
                  <p className="text-natural-muted text-xs">Salin dan jalankan script SQL ini di dashboard akaun Supabase anda untuk mencipta semua jadual yang diperlukan dalam satu klik.</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
                    setSqlCopied(true);
                    setTimeout(() => setSqlCopied(false), 2000);
                  }}
                  className="bg-natural-text hover:bg-natural-text/90 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start cursor-pointer shadow-xs"
                >
                  {sqlCopied ? <Check className="h-3.5 w-3.5 text-sage" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{sqlCopied ? "Berjaya Disalin!" : "Salin Kod SQL"}</span>
                </button>
              </div>
              <div className="p-5 bg-natural-secondary/10">
                <ol className="list-decimal list-inside text-xs text-natural-text space-y-2 mb-4 bg-white p-4 rounded-xl border border-natural-border">
                  <li>Layari dashboard projek Supabase anda: <a href="https://supabase.com/dashboard/project/cffqsxyuddwsrpikhwmm" target="_blank" rel="noopener noreferrer" className="text-accent-indigo hover:underline font-bold">https://supabase.com/dashboard/project/cffqsxyuddwsrpikhwmm</a></li>
                  <li>Klik pada tab <strong>SQL Editor</strong> di panel sebelah kiri dashboard Supabase.</li>
                  <li>Klik <strong>New query</strong> (Butang Query Baru).</li>
                  <li>Klik butang <strong>"Salin Kod SQL"</strong> di atas, tampalkannya (Paste) ke dalam SQL Editor di Supabase.</li>
                  <li>Tekan butang <strong>"Run"</strong> di bahagian bawah kanan panel Supabase.</li>
                  <li>Selesai! Tekan butang <strong>"Segerak Sekarang"</strong> di atas panel ini untuk menyegerakan semua maklumat kedai!</li>
                </ol>
                <div className="relative">
                  <pre className="text-[10px] font-mono bg-natural-text text-natural-secondary p-4 rounded-xl overflow-x-auto max-h-80 leading-relaxed border border-natural-muted/20 select-all">
                    {SUPABASE_SQL_SETUP}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: Add Retail Item Form Dialog */}
      <AnimatePresence>
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-brand/50 backdrop-blur-xs">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProductModal(false)}
              className="fixed inset-0 bg-brand/30"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-natural-border rounded-3xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative z-10 text-xs text-natural-text"
            >
              <button
                onClick={() => setShowAddProductModal(false)}
                className="absolute top-4 right-4 p-1.5 text-natural-muted hover:text-natural-text rounded-lg hover:bg-natural-secondary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="font-serif font-bold text-lg text-natural-text mb-6">Add Retail Product</h3>

              <form onSubmit={handleProductSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Product Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Leather Boots"
                      value={pName}
                      onChange={(e) => setPName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand focus:bg-white text-natural-text transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Category</label>
                    <select
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand focus:bg-white text-natural-text cursor-pointer"
                    >
                      <option value="Apparel">Apparel</option>
                      <option value="Accessories">Accessories</option>
                      <option value="Bags">Bags</option>
                      <option value="Home Goods">Home Goods</option>
                      <option value="Electronics">Electronics</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Enter thorough retail description details..."
                    value={pDesc}
                    onChange={(e) => setPDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand focus:bg-white text-natural-text transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Retail Price ($)</label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="e.g. 45.00"
                      value={pPrice}
                      onChange={(e) => setPPrice(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand focus:bg-white text-natural-text font-mono transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Initial Stock Count</label>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="e.g. 50"
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand focus:bg-white text-natural-text font-mono transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <span className="block text-[10px] font-bold uppercase text-natural-muted">Product Image Selection</span>
                  
                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("product-file-upload")?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[110px] ${
                      isDragging
                        ? "border-brand bg-brand/5 scale-[1.02]"
                        : pImage
                        ? "border-sage/40 bg-sage/5"
                        : "border-natural-border bg-natural-secondary/30 hover:border-brand/40 hover:bg-natural-secondary/50"
                    }`}
                  >
                    <input
                      type="file"
                      id="product-file-upload"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {pImage ? (
                      <div className="flex flex-col items-center space-y-2 w-full">
                        <div className="relative group max-w-[120px]">
                          <img
                            src={pImage}
                            alt="Preview"
                            className="h-16 w-16 object-cover rounded-xl border border-natural-border shadow-xs"
                            referrerPolicy="no-referrer"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPImage("");
                            }}
                            className="absolute -top-1.5 -right-1.5 bg-terracotta text-white p-1 rounded-full hover:bg-terracotta/90 shadow-md cursor-pointer transition-all"
                            title="Remove image"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="text-[10px] text-sage font-semibold flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5 text-sage" />
                          <span>Image Attached (Click to change)</span>
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center space-y-1">
                        <Upload className="h-6 w-6 text-natural-muted" />
                        <p className="font-semibold text-[11px] text-natural-text">
                          Drag & drop picture here, or <span className="text-brand">browse files</span>
                        </p>
                        <p className="text-[9px] text-natural-muted">PNG, JPG, or WEBP (Max 5MB)</p>
                      </div>
                    )}
                  </div>

                  {imageUploadError && (
                    <p className="text-terracotta text-[10px] font-semibold">{imageUploadError}</p>
                  )}

                  {/* URL / Preset Option Panel */}
                  <div className="bg-natural-secondary/30 p-3.5 rounded-2xl border border-natural-border space-y-3">
                    <div>
                      <label className="block text-[9px] font-bold uppercase text-natural-muted mb-1">Or paste static image URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={pImage.startsWith("data:") ? "" : pImage}
                        onChange={(e) => {
                          setImageUploadError("");
                          setPImage(e.target.value);
                        }}
                        className="w-full px-3 py-1.5 rounded-lg bg-white border border-natural-border text-[11px] focus:ring-1 focus:ring-brand focus:outline-none text-natural-text transition-all"
                      />
                    </div>

                    <div>
                      <span className="text-[9px] text-natural-muted font-bold block mb-1">Or select a high-quality preset:</span>
                      <div className="flex flex-wrap gap-1">
                        {IMAGE_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              setImageUploadError("");
                              setPImage(preset.url);
                            }}
                            className={`px-2 py-1 rounded border text-[9px] font-semibold transition-all cursor-pointer ${
                              pImage === preset.url
                                ? "bg-brand border-brand text-white"
                                : "bg-white border-natural-border text-natural-muted hover:text-natural-text"
                            }`}
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl transition-all text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-brand/10 mt-4"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Product to Catalog</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Product Options Manager */}
      <AnimatePresence>
        {selectedProductForOptions && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-brand/50 backdrop-blur-xs">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProductForOptions(null)}
              className="fixed inset-0 bg-brand/30"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white border border-natural-border rounded-3xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative z-10 text-xs text-natural-text flex flex-col md:flex-row gap-6"
            >
              <button
                onClick={() => setSelectedProductForOptions(null)}
                className="absolute top-4 right-4 p-1.5 text-natural-muted hover:text-natural-text rounded-lg hover:bg-natural-secondary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Add Variant Option Form */}
              <div className="flex-1">
                <h3 className="font-serif font-bold text-base text-natural-text mb-1">Product Options</h3>
                <p className="text-natural-muted text-[10px] mb-4">Add custom client choosing variables for <strong>{selectedProductForOptions.name}</strong>.</p>

                <form onSubmit={handleOptionSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Option Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Size, Color, Glaze"
                      value={optName}
                      onChange={(e) => setOptName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand focus:bg-white text-natural-text transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Option Values (Comma Separated)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Small, Medium, Large"
                      value={optValues}
                      onChange={(e) => setOptValues(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand focus:bg-white text-natural-text transition-all"
                    />
                    <p className="text-[9px] text-natural-muted mt-1">Separate values with commas to establish multiple options.</p>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add/Overwrite Option</span>
                  </button>
                </form>
              </div>

              {/* Current Options Listing */}
              <div className="w-full md:w-1/2 border-t md:border-t-0 md:border-l border-natural-border pt-4 md:pt-0 md:pl-4">
                <span className="text-[10px] font-bold uppercase tracking-wider text-natural-muted block mb-3">Current Options</span>
                {selectedProductForOptions.options.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-center text-natural-muted text-[10px]">
                    No custom options attached to this item yet.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                    {selectedProductForOptions.options.map((opt) => (
                      <div key={opt.name} className="bg-natural-secondary/50 p-2.5 rounded-xl border border-natural-border">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="font-bold text-natural-text text-[11px]">{opt.name}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.name)}
                            className="text-natural-muted hover:text-terracotta cursor-pointer"
                            title="Remove option type"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {opt.values.map((val) => (
                            <span key={val} className="bg-white text-natural-text px-1.5 py-0.5 rounded text-[9px] font-semibold border border-natural-border">
                              {val}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
