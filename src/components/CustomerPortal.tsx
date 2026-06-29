/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import {
  ShoppingBag,
  User as UserIcon,
  MapPin,
  CreditCard,
  Search,
  Plus,
  Minus,
  Trash2,
  Tag,
  Truck,
  ChevronRight,
  CheckCircle,
  LogOut,
  X,
  ClipboardCheck,
  Clipboard,
  Shield,
  Clock,
  ChevronLeft
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product, CartItem, Voucher, ShippingMethod, Order, User } from "../types";

interface CustomerPortalProps {
  products: Product[];
  vouchers: Voucher[];
  shippingMethods: ShippingMethod[];
  orders: Order[];
  currentUser: User | null;
  registerUser: (user: Omit<User, "id">) => { success: boolean; error?: string };
  loginUser: (username: string, password?: string) => { success: boolean; error?: string };
  logoutUser: () => void;
  setGuestSession: (name: string) => void;
  createOrder: (order: Omit<Order, "id" | "customerCode" | "createdAt" | "status">) => Order;
}

export default function CustomerPortal({
  products,
  vouchers,
  shippingMethods,
  orders,
  currentUser,
  registerUser,
  loginUser,
  logoutUser,
  setGuestSession,
  createOrder
}: CustomerPortalProps) {
  // --- UI View States ---
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"shop" | "track">("shop");

  // --- Auth Dialog State ---
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "guest">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authHouseNumber, setAuthHouseNumber] = useState("");
  const [authAddress, setAuthAddress] = useState("");
  const [authDistrict, setAuthDistrict] = useState("");
  const [authPostcode, setAuthPostcode] = useState("");
  const [authStateVal, setAuthStateVal] = useState("");
  const [authError, setAuthError] = useState("");

  // --- Checkout Flow State ---
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "address" | "success">("cart");
  const [selectedShipping, setSelectedShipping] = useState<ShippingMethod | null>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>("");
  const [appliedVoucher, setAppliedVoucher] = useState<Voucher | null>(null);
  const [voucherError, setVoucherError] = useState<string>("");
  const [lastPlacedOrder, setLastPlacedOrder] = useState<Order | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // --- Shipping Address Form State (for guests / customized checkout) ---
  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingHouseNumber, setShippingHouseNumber] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingDistrict, setShippingDistrict] = useState("");
  const [shippingPostcode, setShippingPostcode] = useState("");
  const [shippingState, setShippingState] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  // --- Tracking State ---
  const [trackingCode, setTrackingCode] = useState<string>("");
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);
  const [trackingSearched, setTrackingSearched] = useState<boolean>(false);

  // --- Selected options for product detail view ---
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  // Categories list
  const activeProducts = products.filter((p) => p.status === "active");
  const categories = ["All", ...Array.from(new Set(activeProducts.map((p) => p.category)))];

  // Filtered products list
  const filteredProducts = activeProducts.filter((p) => {
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Open detail panel for a product
  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    // Initialize selected options with the first values
    const initialOptions: Record<string, string> = {};
    product.options.forEach((opt) => {
      if (opt.values.length > 0) {
        initialOptions[opt.name] = opt.values[0];
      }
    });
    setSelectedOptions(initialOptions);
  };

  // Add to cart helper
  const handleAddToCart = (product: Product) => {
    // Check if options are fully selected (they should be, initialized above)
    const optionsKey = JSON.stringify(selectedOptions);
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && JSON.stringify(item.selectedOptions) === optionsKey
    );

    if (existingIndex > -1) {
      const updatedCart = [...cart];
      if (updatedCart[existingIndex].quantity < product.stock) {
        updatedCart[existingIndex].quantity += 1;
        setCart(updatedCart);
      }
    } else {
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        selectedOptions: { ...selectedOptions },
        quantity: 1,
        maxStock: product.stock
      };
      setCart([...cart, newItem]);
    }

    setIsCartOpen(true);
    setSelectedProduct(null); // close details modal
  };

  // Cart quantity adjustment
  const updateCartQuantity = (index: number, change: number) => {
    const updated = [...cart];
    const newQty = updated[index].quantity + change;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else if (newQty <= updated[index].maxStock) {
      updated[index].quantity = newQty;
    }
    setCart(updated);
  };

  // --- Auth Execution ---
  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (authMode === "login") {
      const res = loginUser(authUsername, authPassword);
      if (res.success) {
        setShowAuthModal(false);
        setAuthUsername("");
        setAuthPassword("");
        // Pre-fill shipping form with logged in user details
        const storedUser = localStorage.getItem("store_current_user");
        if (storedUser) {
          const u: User = JSON.parse(storedUser);
          setShippingName(u.name || "");
          setShippingPhone(u.phone || "");
          setShippingHouseNumber(u.houseNumber || "");
          setShippingAddress(u.address || "");
          setShippingDistrict(u.district || "");
          setShippingPostcode(u.postcode || "");
          setShippingState(u.state || "");
        }
      } else {
        setAuthError(res.error || "Login failed");
      }
    } else if (authMode === "register") {
      if (!authUsername || !authPassword || !authName || !authPhone) {
        setAuthError("Please fill in all basic fields.");
        return;
      }
      const res = registerUser({
        username: authUsername,
        password: authPassword,
        name: authName,
        phone: authPhone,
        houseNumber: authHouseNumber,
        address: authAddress,
        district: authDistrict,
        postcode: authPostcode,
        state: authStateVal,
      });

      if (res.success) {
        setShowAuthModal(false);
        setAuthUsername("");
        setAuthPassword("");
        setAuthName("");
        setAuthPhone("");
        setAuthHouseNumber("");
        setAuthAddress("");
        setAuthDistrict("");
        setAuthPostcode("");
        setAuthStateVal("");
        // Auto pre-fill
        setShippingName(authName);
        setShippingPhone(authPhone);
        setShippingHouseNumber(authHouseNumber);
        setShippingAddress(authAddress);
        setShippingDistrict(authDistrict);
        setShippingPostcode(authPostcode);
        setShippingState(authStateVal);
      } else {
        setAuthError(res.error || "Registration failed");
      }
    } else if (authMode === "guest") {
      if (!authName.trim()) {
        setAuthError("Please enter your name to proceed as guest.");
        return;
      }
      setGuestSession(authName);
      setShippingName(authName);
      setShowAuthModal(false);
    }
  };

  // Launch checkout
  const initiateCheckout = () => {
    if (!currentUser) {
      setAuthMode("login");
      setShowAuthModal(true);
      return;
    }
    // Set shipping address defaults from current user
    setShippingName(currentUser.name || "");
    setShippingPhone(currentUser.phone || "");
    setShippingHouseNumber(currentUser.houseNumber || "");
    setShippingAddress(currentUser.address || "");
    setShippingDistrict(currentUser.district || "");
    setShippingPostcode(currentUser.postcode || "");
    setShippingState(currentUser.state || "");

    // Default select shipping method if none chosen
    const activeMethods = shippingMethods.filter((s) => s.isActive);
    if (!selectedShipping && activeMethods.length > 0) {
      setSelectedShipping(activeMethods[0]);
    }
    setCheckoutStep("address");
  };

  // Applied Voucher Code Check
  const applyVoucher = () => {
    setVoucherError("");
    const code = voucherCodeInput.trim().toUpperCase();
    if (!code) return;

    const voucher = vouchers.find((v) => v.code === code);
    if (!voucher) {
      setVoucherError("Invalid voucher code.");
      setAppliedVoucher(null);
      return;
    }
    if (!voucher.isActive) {
      setVoucherError("This voucher code has expired.");
      setAppliedVoucher(null);
      return;
    }
    setAppliedVoucher(voucher);
    setVoucherError("");
  };

  // Remove voucher code
  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput("");
  };

  // Calculate pricing values
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);

  let discount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.discountType === "percent") {
      discount = (subtotal * appliedVoucher.discountValue) / 100;
    } else {
      discount = appliedVoucher.discountValue;
    }
  }
  // Discount cannot exceed subtotal
  discount = Math.min(discount, subtotal);

  const shippingFee = selectedShipping ? selectedShipping.price : 0;
  const total = subtotal - discount + shippingFee;

  // Complete checkout process
  const submitCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError("");

    if (
      !shippingName.trim() ||
      !shippingPhone.trim() ||
      !shippingHouseNumber.trim() ||
      !shippingAddress.trim() ||
      !shippingDistrict.trim() ||
      !shippingPostcode.trim() ||
      !shippingState.trim()
    ) {
      setCheckoutError("All delivery information fields are required.");
      return;
    }

    if (!selectedShipping) {
      setCheckoutError("Please select a shipping method.");
      return;
    }

    const orderData = {
      customerName: shippingName,
      customerPhone: shippingPhone,
      shippingAddress: {
        name: shippingName,
        phone: shippingPhone,
        houseNumber: shippingHouseNumber,
        address: shippingAddress,
        district: shippingDistrict,
        postcode: shippingPostcode,
        state: shippingState,
      },
      items: cart.map((item) => ({
        productId: item.productId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        selectedOptions: item.selectedOptions
      })),
      subtotal,
      discount,
      shippingFee,
      total,
      voucherCodeUsed: appliedVoucher ? appliedVoucher.code : undefined,
      shippingMethodName: selectedShipping.name
    };

    const finalOrder = createOrder(orderData);
    setLastPlacedOrder(finalOrder);
    setCart([]);
    setAppliedVoucher(null);
    setVoucherCodeInput("");
    setCheckoutStep("success");
  };

  // Copy unique Customer Code
  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Track customer code query
  const handleTrackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTrackingSearched(true);
    const code = trackingCode.trim().toUpperCase();
    const order = orders.find((o) => o.customerCode.toUpperCase() === code);
    setTrackedOrder(order || null);
  };

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col font-sans" id="customer-portal-root">
      {/* Mini Top Banner */}
      <div className="bg-brand text-natural-bg text-xs py-2 px-4 text-center tracking-wide font-medium flex justify-between items-center sm:px-6">
        <span>✨ Spend $150+ for FREE premium delivery options!</span>
        <div className="hidden sm:flex gap-4">
          <span>🔒 Secure checkout</span>
          <span>⚡ Live Inventory</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-natural-border shadow-xs px-4 py-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Shop Title and Nav tabs */}
          <div className="flex items-center space-x-6 w-full md:w-auto">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setActiveTab("shop"); setCheckoutStep("cart"); }}>
              <div className="bg-brand text-white p-2.5 rounded-xl shadow-md shadow-brand/10">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <span className="font-serif italic font-bold text-xl text-natural-text tracking-tight">Marketplace Shop</span>
            </div>

            <nav className="flex space-x-1 bg-natural-secondary p-1 rounded-lg text-sm font-medium">
              <button
                id="btn-nav-shop"
                onClick={() => { setActiveTab("shop"); setCheckoutStep("cart"); }}
                className={`px-4 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeTab === "shop" ? "bg-white text-brand shadow-xs" : "text-natural-muted hover:text-natural-text"
                }`}
              >
                Products
              </button>
              <button
                id="btn-nav-track"
                onClick={() => setActiveTab("track")}
                className={`px-4 py-1.5 rounded-md transition-colors cursor-pointer ${
                  activeTab === "track" ? "bg-white text-brand shadow-xs" : "text-natural-muted hover:text-natural-text"
                }`}
              >
                Track My Order
              </button>
            </nav>
          </div>

          {/* Search, Cart and Session actions */}
          <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
            {activeTab === "shop" && (
              <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-natural-muted" />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full md:w-60 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:bg-white transition-all text-natural-text"
                />
              </div>
            )}

            {/* Cart Button */}
            <button
              id="btn-cart-toggle"
              onClick={() => setIsCartOpen(true)}
              className="relative bg-white border border-natural-border hover:border-natural-muted p-2.5 rounded-xl transition-all cursor-pointer text-natural-text hover:text-brand flex items-center justify-center"
            >
              <ShoppingBag className="h-5 w-5" />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-terracotta text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </button>

            {/* User Session Profile details */}
            {currentUser ? (
              <div className="flex items-center space-x-2 bg-natural-secondary border border-natural-border py-1.5 pl-3 pr-2.5 rounded-xl text-sm">
                <div className="h-2 w-2 rounded-full bg-sage animate-ping" />
                <span className="font-medium text-natural-text truncate max-w-28 sm:max-w-40">
                  {currentUser.isGuest ? `${currentUser.name} (Guest)` : currentUser.name}
                </span>
                <button
                  onClick={logoutUser}
                  title="Logout"
                  className="p-1 hover:bg-natural-border rounded-lg text-natural-muted hover:text-terracotta transition-colors cursor-pointer ml-1"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                id="btn-login"
                onClick={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                className="bg-brand hover:bg-brand-hover text-white text-sm font-medium px-4 py-2 rounded-xl transition-all shadow-md hover:shadow-lg shadow-brand/10 flex items-center gap-2 cursor-pointer"
              >
                <UserIcon className="h-4 w-4" />
                <span>Account Login</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Primary Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "shop" && checkoutStep !== "success" && (
          <div>
            {/* Category selection horizontal scroll */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex space-x-1.5 overflow-x-auto pb-2 scrollbar-none max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-brand text-white shadow-md shadow-brand/10"
                        : "bg-white text-natural-text hover:bg-natural-secondary border border-natural-border"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Layout */}
            {checkoutStep === "cart" && (
              <div>
                {filteredProducts.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-natural-border p-12 text-center max-w-md mx-auto my-12">
                    <div className="bg-natural-secondary h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 border border-natural-border">
                      <ShoppingBag className="h-6 w-6 text-natural-muted" />
                    </div>
                    <h3 className="text-lg font-serif font-bold text-natural-text mb-1">No products found</h3>
                    <p className="text-natural-muted text-sm mb-4">Try checking another category or refining your search keywords.</p>
                    <button
                      onClick={() => { setSelectedCategory("All"); setSearchQuery(""); }}
                      className="text-brand hover:text-brand-hover font-semibold text-sm cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((prod) => (
                      <motion.div
                        key={prod.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl border border-natural-border overflow-hidden shadow-xs hover:shadow-lg hover:border-natural-muted transition-all flex flex-col group"
                      >
                        {/* Image Frame */}
                        <div className="relative aspect-video bg-natural-secondary overflow-hidden">
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs text-natural-text text-xs font-semibold px-2.5 py-1 rounded-full shadow-xs border border-white">
                            {prod.category}
                          </span>
                          {prod.stock === 0 ? (
                            <span className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-bold text-sm tracking-wide">
                              OUT OF STOCK
                            </span>
                          ) : prod.stock <= 5 ? (
                            <span className="absolute top-3 right-3 bg-terracotta text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full animate-pulse shadow-sm">
                              Only {prod.stock} Left
                            </span>
                          ) : null}
                        </div>

                        {/* Content Body */}
                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="font-serif font-bold text-lg text-natural-text mb-1 group-hover:text-brand transition-colors">
                            {prod.name}
                          </h3>
                          <p className="text-natural-muted text-sm line-clamp-2 mb-4 flex-1">
                            {prod.description}
                          </p>

                          <div className="flex items-center justify-between pt-4 border-t border-natural-border">
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-natural-muted font-bold">Price</p>
                              <span className="font-mono text-xl font-bold text-brand">${prod.price.toFixed(2)}</span>
                            </div>

                            <button
                              id={`btn-view-${prod.id}`}
                              onClick={() => handleViewDetails(prod)}
                              className="bg-natural-secondary border border-natural-border hover:bg-natural-secondary/80 text-natural-text font-semibold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>View details</span>
                              <ChevronRight className="h-3.5 w-3.5 text-natural-muted" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Address Checkout Form View */}
            {checkoutStep === "address" && (
              <div className="max-w-3xl mx-auto">
                <button
                  onClick={() => setCheckoutStep("cart")}
                  className="flex items-center gap-1 text-sm font-semibold text-natural-muted hover:text-brand mb-6 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Back to Catalog</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Shipping Form Panel */}
                  <div className="lg:col-span-3 bg-white p-6 sm:p-8 rounded-3xl border border-natural-border shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-natural-secondary text-brand p-2.5 rounded-xl">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-serif font-bold text-xl text-natural-text">Shipping Details</h2>
                        <p className="text-natural-muted text-xs">Please provide exact coordinates for delivery.</p>
                      </div>
                    </div>

                    <form onSubmit={submitCheckout} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-natural-muted mb-1.5">Recipient Full Name</label>
                          <input
                            type="text"
                            required
                            value={shippingName}
                            onChange={(e) => setShippingName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-2 focus:ring-brand focus:bg-white text-natural-text transition-all"
                            placeholder="John Doe"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-natural-muted mb-1.5">Phone Number</label>
                          <input
                            type="tel"
                            required
                            value={shippingPhone}
                            onChange={(e) => setShippingPhone(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-2 focus:ring-brand focus:bg-white text-natural-text transition-all"
                            placeholder="+1 555-0199"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-1">
                          <label className="block text-xs font-bold uppercase text-natural-muted mb-1.5">House Number</label>
                          <input
                            type="text"
                            required
                            value={shippingHouseNumber}
                            onChange={(e) => setShippingHouseNumber(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-2 focus:ring-brand focus:bg-white text-natural-text transition-all"
                            placeholder="Apt 4B / No. 12"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold uppercase text-natural-muted mb-1.5">Street Address</label>
                          <input
                            type="text"
                            required
                            value={shippingAddress}
                            onChange={(e) => setShippingAddress(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-2 focus:ring-brand focus:bg-white text-natural-text transition-all"
                            placeholder="Oakwood Blvd"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold uppercase text-natural-muted mb-1.5">District / City</label>
                          <input
                            type="text"
                            required
                            value={shippingDistrict}
                            onChange={(e) => setShippingDistrict(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-2 focus:ring-brand focus:bg-white text-natural-text transition-all"
                            placeholder="Manhattan"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold uppercase text-natural-muted mb-1.5">Postcode</label>
                          <input
                            type="text"
                            required
                            value={shippingPostcode}
                            onChange={(e) => setShippingPostcode(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-2 focus:ring-brand focus:bg-white text-natural-text transition-all"
                            placeholder="10001"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-natural-muted mb-1.5">State</label>
                        <input
                          type="text"
                          required
                          value={shippingState}
                          onChange={(e) => setShippingState(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-2 focus:ring-brand focus:bg-white text-natural-text transition-all"
                          placeholder="New York"
                        />
                      </div>

                      {checkoutError && (
                        <div className="bg-natural-secondary text-terracotta text-xs p-3.5 rounded-xl border border-natural-border flex items-center gap-2">
                          <X className="h-4 w-4 shrink-0" />
                          <span>{checkoutError}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl transition-all shadow-md hover:shadow-lg shadow-brand/10 mt-6 flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CreditCard className="h-5 w-5" />
                        <span>Place Order & Complete Checkout</span>
                      </button>
                    </form>
                  </div>

                  {/* Pricing and shipping options Panel */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Shipping Method Selector */}
                    <div className="bg-white p-5 rounded-3xl border border-natural-border shadow-sm">
                      <div className="flex items-center gap-2 mb-4">
                        <Truck className="h-4 w-4 text-brand" />
                        <h3 className="font-bold text-sm text-natural-text">Select Shipping Option</h3>
                      </div>

                      <div className="space-y-2">
                        {shippingMethods
                          .filter((sm) => sm.isActive)
                          .map((sm) => (
                            <label
                              key={sm.id}
                              onClick={() => setSelectedShipping(sm)}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                selectedShipping?.id === sm.id
                                  ? "border-brand bg-natural-secondary/55 ring-1 ring-brand"
                                  : "border-natural-border hover:border-natural-muted bg-white"
                              }`}
                            >
                              <input
                                type="radio"
                                name="shipping_option"
                                checked={selectedShipping?.id === sm.id}
                                onChange={() => setSelectedShipping(sm)}
                                className="mt-1 accent-brand"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xs text-natural-text truncate">{sm.name}</p>
                                <p className="text-[10px] text-natural-muted mt-0.5">{sm.estimatedDays}</p>
                              </div>
                              <span className="font-mono text-xs font-bold text-natural-text">
                                {sm.price === 0 ? "FREE" : `$${sm.price.toFixed(2)}`}
                              </span>
                            </label>
                          ))}
                      </div>
                    </div>

                    {/* Order summary Breakdown */}
                    <div className="bg-white p-5 rounded-3xl border border-natural-border shadow-sm">
                      <h3 className="font-bold text-sm text-natural-text mb-3 border-b border-natural-border pb-2">Order Pricing</h3>

                      <div className="space-y-2 text-xs">
                        {cart.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-natural-muted">
                            <span className="truncate max-w-[150px]">{item.name} <span className="text-natural-muted/60">x{item.quantity}</span></span>
                            <span className="font-mono font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}

                        <hr className="border-natural-border my-2" />

                        <div className="flex justify-between text-natural-muted">
                          <span>Subtotal</span>
                          <span className="font-mono font-bold text-natural-text">${subtotal.toFixed(2)}</span>
                        </div>

                        {discount > 0 && (
                          <div className="flex justify-between text-sage font-medium">
                            <span className="flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              <span>Discount ({appliedVoucher?.code})</span>
                            </span>
                            <span className="font-mono font-bold">-${discount.toFixed(2)}</span>
                          </div>
                        )}

                        <div className="flex justify-between text-natural-muted">
                          <span>Delivery Fee</span>
                          <span className="font-mono font-medium text-natural-text">
                            {shippingFee === 0 ? "FREE" : `$${shippingFee.toFixed(2)}`}
                          </span>
                        </div>

                        <hr className="border-natural-border my-2" />

                        <div className="flex justify-between text-sm font-bold text-natural-text pt-1">
                          <span>Total Amount</span>
                          <span className="font-mono text-brand text-base">${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Successful checkout order view */}
        {activeTab === "shop" && checkoutStep === "success" && lastPlacedOrder && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-3xl border border-natural-border shadow-md p-8 sm:p-10 text-center relative overflow-hidden">
              {/* Top Accent Ring */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-brand" />

              <div className="bg-natural-secondary text-sage h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xs border border-natural-border">
                <CheckCircle className="h-8 w-8" />
              </div>

              <h2 className="font-serif font-black text-2xl sm:text-3xl text-natural-text mb-2">Order Confirmed!</h2>
              <p className="text-natural-muted text-sm max-w-md mx-auto mb-8">
                Your order has been recorded successfully. Please copy your unique customer tracking code below to follow its delivery progress.
              </p>

              {/* Unique Customer Code Banner */}
              <div className="bg-brand text-white rounded-2xl p-6 mb-8 max-w-md mx-auto shadow-md shadow-brand/15">
                <span className="text-[10px] uppercase tracking-widest text-natural-border font-bold block mb-1">Your Unique Customer Code</span>
                <div className="flex items-center justify-center space-x-3 mt-1.5">
                  <span className="font-mono font-bold text-2xl sm:text-3xl text-natural-secondary tracking-wider">
                    {lastPlacedOrder.customerCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(lastPlacedOrder.customerCode)}
                    className="p-2 hover:bg-brand-hover text-natural-secondary hover:text-white rounded-lg transition-colors border border-brand-hover cursor-pointer"
                    title="Copy Code"
                  >
                    {copiedCode ? <ClipboardCheck className="h-5 w-5 text-sage" /> : <Clipboard className="h-5 w-5" />}
                  </button>
                </div>
                {copiedCode && <p className="text-sage text-[10px] font-bold mt-2">Copied to clipboard!</p>}
              </div>

              {/* Receipt Breakdowns */}
              <div className="border border-natural-border rounded-2xl p-5 text-left mb-8 bg-natural-secondary/40">
                <h3 className="font-bold text-sm text-natural-text mb-3 border-b border-natural-border pb-2 flex justify-between items-center">
                  <span>Shipping Address</span>
                  <span className="text-natural-muted font-normal font-mono text-xs">#{lastPlacedOrder.id.substring(6, 12).toUpperCase()}</span>
                </h3>
                <div className="text-xs space-y-1 text-natural-muted mb-4">
                  <p className="font-bold text-natural-text">{lastPlacedOrder.customerName}</p>
                  <p>{lastPlacedOrder.customerPhone}</p>
                  <p>{lastPlacedOrder.shippingAddress.houseNumber}, {lastPlacedOrder.shippingAddress.address}</p>
                  <p>{lastPlacedOrder.shippingAddress.district}, {lastPlacedOrder.shippingAddress.postcode}</p>
                  <p>{lastPlacedOrder.shippingAddress.state}</p>
                </div>

                <h3 className="font-bold text-sm text-natural-text mb-3 border-b border-natural-border pb-2">Order Summary</h3>
                <div className="space-y-2 text-xs">
                  {lastPlacedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-natural-muted">
                      <span>{item.name} <span className="text-natural-muted/60">x{item.quantity}</span></span>
                      <span className="font-mono font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <hr className="border-natural-border my-2" />
                  <div className="flex justify-between font-bold text-natural-text">
                    <span>Total Paid</span>
                    <span className="font-mono text-brand text-sm">${lastPlacedOrder.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => { setActiveTab("shop"); setCheckoutStep("cart"); }}
                  className="bg-brand hover:bg-brand-hover text-white font-bold px-6 py-3 rounded-xl transition-all shadow-md hover:shadow-lg shadow-brand/10 text-sm cursor-pointer"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={() => {
                    setTrackingCode(lastPlacedOrder.customerCode);
                    setActiveTab("track");
                    setTrackedOrder(lastPlacedOrder);
                    setTrackingSearched(true);
                  }}
                  className="bg-natural-secondary hover:bg-natural-border text-natural-text font-bold px-6 py-3 rounded-xl transition-all text-sm cursor-pointer"
                >
                  Track This Order
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tracking Tab View */}
        {activeTab === "track" && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white p-6 sm:p-10 rounded-3xl border border-natural-border shadow-sm text-center mb-8">
              <div className="bg-natural-secondary text-brand h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 border border-natural-border">
                <Search className="h-6 w-6" />
              </div>
              <h2 className="font-serif font-bold text-2xl text-natural-text mb-2">Track Your Purchase</h2>
              <p className="text-natural-muted text-sm mb-6 max-w-md mx-auto">
                Enter the unique Customer Code provided on your checkout screen (e.g. CUST-ABCD) to check your order details, payment, and delivery status.
              </p>

              <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
                <input
                  type="text"
                  required
                  placeholder="e.g. CUST-8E3A"
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-2 focus:ring-brand focus:bg-white text-natural-text transition-all font-mono tracking-widest text-center sm:text-left"
                />
                <button
                  type="submit"
                  className="bg-brand hover:bg-brand-hover text-white font-bold px-6 py-3 rounded-xl transition-all text-sm cursor-pointer shadow-xs"
                >
                  Track Order
                </button>
              </form>
            </div>

            {/* Tracking Results */}
            {trackingSearched && (
              <div>
                {trackedOrder ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-3xl border border-natural-border shadow-sm overflow-hidden"
                  >
                    {/* Header bar */}
                    <div className="bg-brand p-6 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-natural-border">Customer Code</span>
                        <h3 className="font-mono font-bold text-xl text-natural-secondary tracking-wider mt-0.5">{trackedOrder.customerCode}</h3>
                      </div>
                      <div className="text-right sm:text-right">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-natural-border block">Status</span>
                        <span className={`inline-block mt-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          trackedOrder.status === "completed" ? "bg-white/20 text-natural-bg" :
                          trackedOrder.status === "processing" ? "bg-natural-secondary/20 text-natural-secondary" :
                          trackedOrder.status === "cancelled" ? "bg-terracotta/30 text-terracotta" :
                          "bg-natural-border/20 text-natural-border"
                        }`}>
                          {trackedOrder.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Timeline status indicator */}
                    <div className="p-6 border-b border-natural-border bg-natural-secondary/30">
                      <div className="relative flex flex-col sm:flex-row justify-between items-center gap-6 sm:gap-4">
                        {/* Connecting Line */}
                        <div className="absolute left-[15px] sm:left-[10%] sm:right-[10%] top-[10px] bottom-[10px] sm:bottom-auto sm:h-0.5 bg-natural-border -z-0" />

                        {/* Step 1 */}
                        <div className="flex sm:flex-col items-center gap-3 sm:gap-2 z-10 w-full sm:w-1/4">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                            ["pending", "processing", "completed"].includes(trackedOrder.status)
                              ? "bg-brand border-brand text-white"
                              : "bg-white border-natural-muted text-natural-muted"
                          }`}>
                            <Clock className="h-4 w-4" />
                          </div>
                          <div className="text-left sm:text-center">
                            <p className="font-bold text-xs text-natural-text">Order Placed</p>
                            <p className="text-[10px] text-natural-muted">We received your order</p>
                          </div>
                        </div>

                        {/* Step 2 */}
                        <div className="flex sm:flex-col items-center gap-3 sm:gap-2 z-10 w-full sm:w-1/4">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                            ["processing", "completed"].includes(trackedOrder.status)
                              ? "bg-brand border-brand text-white"
                              : "bg-white border-natural-muted text-natural-muted"
                          }`}>
                            <Shield className="h-4 w-4" />
                          </div>
                          <div className="text-left sm:text-center">
                            <p className="font-bold text-xs text-natural-text">Processing</p>
                            <p className="text-[10px] text-natural-muted">Preparing and packing</p>
                          </div>
                        </div>

                        {/* Step 3 */}
                        <div className="flex sm:flex-col items-center gap-3 sm:gap-2 z-10 w-full sm:w-1/4">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                            trackedOrder.status === "completed"
                              ? "bg-sage border-sage text-white"
                              : "bg-white border-natural-muted text-natural-muted"
                          }`}>
                            <CheckCircle className="h-4 w-4" />
                          </div>
                          <div className="text-left sm:text-center">
                            <p className="font-bold text-xs text-natural-text">Shipped & Done</p>
                            <p className="text-[10px] text-natural-muted">Delivered successfully</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-6">
                      {/* Address detail */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-bold text-xs uppercase text-natural-muted mb-2">Delivery Address</h4>
                          <div className="bg-natural-secondary/50 p-4 rounded-xl border border-natural-border text-xs text-natural-muted space-y-1">
                            <p className="font-bold text-natural-text">{trackedOrder.customerName}</p>
                            <p>{trackedOrder.customerPhone}</p>
                            <p>{trackedOrder.shippingAddress.houseNumber}, {trackedOrder.shippingAddress.address}</p>
                            <p>{trackedOrder.shippingAddress.district}, {trackedOrder.shippingAddress.postcode}</p>
                            <p>{trackedOrder.shippingAddress.state}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-bold text-xs uppercase text-natural-muted mb-2">Delivery Method</h4>
                          <div className="bg-natural-secondary/50 p-4 rounded-xl border border-natural-border text-xs text-natural-muted flex justify-between items-center">
                            <div>
                              <p className="font-bold text-natural-text">{trackedOrder.shippingMethodName}</p>
                              <p className="text-natural-muted mt-0.5">Est: Within days</p>
                            </div>
                            <span className="font-mono text-sm font-bold text-brand">${trackedOrder.shippingFee.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Items */}
                      <div>
                        <h4 className="font-bold text-xs uppercase text-natural-muted mb-2">Ordered Items</h4>
                        <div className="border border-natural-border rounded-xl divide-y divide-natural-border text-xs overflow-hidden">
                          {trackedOrder.items.map((item, idx) => (
                            <div key={idx} className="p-4 flex justify-between items-center bg-white hover:bg-natural-secondary transition-colors">
                              <div>
                                <p className="font-bold text-natural-text">{item.name}</p>
                                {Object.keys(item.selectedOptions).length > 0 && (
                                  <div className="flex gap-2 mt-1">
                                    {Object.entries(item.selectedOptions).map(([key, val]) => (
                                      <span key={key} className="bg-natural-secondary text-natural-muted px-2 py-0.5 rounded text-[10px]">
                                        {key}: {val}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-mono font-bold text-natural-text">${item.price.toFixed(2)}</p>
                                <p className="text-natural-muted">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Summary */}
                      <div className="bg-natural-secondary/50 p-5 rounded-2xl border border-natural-border text-xs space-y-2 ml-auto max-w-xs">
                        <div className="flex justify-between text-natural-muted">
                          <span>Subtotal</span>
                          <span className="font-mono">${trackedOrder.subtotal.toFixed(2)}</span>
                        </div>
                        {trackedOrder.discount > 0 && (
                          <div className="flex justify-between text-sage font-medium">
                            <span>Discount ({trackedOrder.voucherCodeUsed})</span>
                            <span className="font-mono">-${trackedOrder.discount.toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-natural-muted">
                          <span>Delivery Fee</span>
                          <span className="font-mono">${trackedOrder.shippingFee.toFixed(2)}</span>
                        </div>
                        <hr className="border-natural-border my-1" />
                        <div className="flex justify-between text-sm font-bold text-natural-text">
                          <span>Total Amount</span>
                          <span className="font-mono text-brand">${trackedOrder.total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-white rounded-3xl border border-natural-border p-12 text-center max-w-md mx-auto my-6">
                    <div className="bg-natural-secondary h-14 w-14 rounded-full flex items-center justify-center mx-auto mb-4 border border-natural-border">
                      <X className="h-6 w-6 text-terracotta" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Code not found</h3>
                    <p className="text-slate-500 text-sm">We couldn't find any orders matching the Customer Code <strong>{trackingCode}</strong>. Please check and try again.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Slide-over Cart Panel */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden" id="cart-slider-root">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-brand/50 backdrop-blur-xs"
            />

            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "tween", duration: 0.3 }}
                className="w-screen max-w-md bg-white flex flex-col shadow-2xl"
              >
                {/* Cart Header */}
                <div className="p-6 border-b border-natural-border flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <ShoppingBag className="h-5 w-5 text-brand" />
                    <h3 className="font-serif font-bold text-lg text-natural-text">Shopping Cart</h3>
                  </div>
                  <button
                    onClick={() => setIsCartOpen(false)}
                    className="p-1 text-natural-muted hover:text-natural-text rounded-lg hover:bg-natural-secondary cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Cart Items Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center">
                      <div className="bg-natural-secondary h-16 w-16 rounded-full flex items-center justify-center mb-4 border border-natural-border text-natural-muted">
                        <ShoppingBag className="h-7 w-7" />
                      </div>
                      <p className="font-bold text-natural-text text-base mb-1">Your cart is empty</p>
                      <p className="text-natural-muted text-xs max-w-[200px] mx-auto">Add beautiful items from our storefront to start purchasing!</p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-3 rounded-2xl border border-natural-border bg-natural-secondary/30 hover:bg-natural-secondary/50 transition-colors">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-16 w-16 rounded-xl object-cover border border-natural-border"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-natural-text truncate">{item.name}</h4>
                          {Object.keys(item.selectedOptions).length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {Object.entries(item.selectedOptions).map(([key, value]) => (
                                <span key={key} className="bg-white text-natural-muted border border-natural-border px-1.5 py-0.5 rounded text-[9px] font-semibold">
                                  {key}: {value}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-mono text-xs font-bold text-brand">${item.price.toFixed(2)}</span>
                            {/* Quantity Controls */}
                            <div className="flex items-center space-x-1 bg-white border border-natural-border rounded-lg p-0.5">
                              <button
                                onClick={() => updateCartQuantity(idx, -1)}
                                className="p-1 hover:bg-natural-secondary rounded text-natural-muted cursor-pointer"
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="font-mono text-xs font-semibold px-2 text-natural-text">{item.quantity}</span>
                              <button
                                onClick={() => updateCartQuantity(idx, 1)}
                                disabled={item.quantity >= item.maxStock}
                                className="p-1 hover:bg-natural-secondary rounded text-natural-muted disabled:opacity-40 cursor-pointer"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Cart Footer / checkout summary */}
                {cart.length > 0 && (
                  <div className="p-6 border-t border-natural-border bg-natural-secondary/35">
                    {/* Voucher Area */}
                    <div className="mb-4">
                      <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">Apply Discount Voucher</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Tag className="absolute left-3 top-2.5 h-4 w-4 text-natural-muted" />
                          <input
                            type="text"
                            placeholder="e.g. WELCOME10"
                            disabled={!!appliedVoucher}
                            value={voucherCodeInput}
                            onChange={(e) => setVoucherCodeInput(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-natural-border text-xs focus:ring-1 focus:ring-brand text-natural-text font-mono tracking-wider uppercase disabled:bg-natural-secondary disabled:text-natural-muted"
                          />
                        </div>
                        {appliedVoucher ? (
                          <button
                            onClick={removeVoucher}
                            className="bg-natural-secondary text-terracotta hover:bg-natural-border px-4 py-2 rounded-xl border border-natural-border text-xs font-semibold cursor-pointer"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            onClick={applyVoucher}
                            className="bg-brand hover:bg-brand-hover text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Apply
                          </button>
                        )}
                      </div>
                      {voucherError && <p className="text-terracotta text-[10px] font-medium mt-1.5">{voucherError}</p>}
                      {appliedVoucher && (
                        <p className="text-sage text-[10px] font-medium mt-1.5 flex items-center gap-1">
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Code applied! Saved <strong>{appliedVoucher.discountType === "percent" ? `${appliedVoucher.discountValue}%` : `$${appliedVoucher.discountValue}`}</strong> on this order.</span>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2.5 text-xs mb-6">
                      <div className="flex justify-between text-natural-muted">
                        <span>Items Subtotal</span>
                        <span className="font-mono text-natural-text">${subtotal.toFixed(2)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sage font-medium">
                          <span>Discount Voucher</span>
                          <span className="font-mono">-${discount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-natural-text text-sm pt-2 border-t border-natural-border">
                        <span>Subtotal after discounts</span>
                        <span className="font-mono text-brand">${(subtotal - discount).toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      id="btn-initiate-checkout"
                      onClick={() => {
                        setIsCartOpen(false);
                        initiateCheckout();
                      }}
                      className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg shadow-brand/10 flex items-center justify-center gap-2 cursor-pointer text-sm"
                    >
                      <span>Proceed to Checkout</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Detail Dialog Panel */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="fixed inset-0 bg-brand/50 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-natural-border shadow-2xl max-w-2xl w-full relative overflow-hidden z-10 flex flex-col md:flex-row"
            >
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 z-25 bg-white/80 hover:bg-white backdrop-blur-xs p-1.5 rounded-full border border-natural-border text-natural-muted hover:text-natural-text transition-colors cursor-pointer shadow-xs"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Image Left Side */}
              <div className="w-full md:w-1/2 aspect-video md:aspect-auto md:h-96 bg-natural-secondary relative">
                <img
                  src={selectedProduct.imageUrl}
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-3 left-3 bg-brand/90 backdrop-blur-xs text-white text-xs px-2.5 py-1 rounded-full border border-brand/20">
                  {selectedProduct.category}
                </span>
              </div>

              {/* Contents Right Side */}
              <div className="p-6 md:p-8 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-black text-xl text-natural-text mb-2">
                    {selectedProduct.name}
                  </h3>
                  <div className="flex items-baseline space-x-2 mb-4">
                    <span className="font-mono text-2xl font-bold text-brand">${selectedProduct.price.toFixed(2)}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wide ${
                      selectedProduct.stock > 0 ? "bg-natural-secondary text-sage border border-natural-border" : "bg-natural-secondary text-terracotta border border-natural-border"
                    }`}>
                      {selectedProduct.stock > 0 ? `In stock (${selectedProduct.stock})` : "Out of stock"}
                    </span>
                  </div>

                  <p className="text-natural-muted text-xs leading-relaxed mb-6">
                    {selectedProduct.description}
                  </p>

                  {/* Dynamic Product Options selectors */}
                  {selectedProduct.stock > 0 && selectedProduct.options.length > 0 && (
                    <div className="space-y-4 mb-6">
                      {selectedProduct.options.map((opt) => (
                        <div key={opt.name}>
                          <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1.5">{opt.name}</label>
                          <div className="flex flex-wrap gap-1.5">
                            {opt.values.map((v) => {
                              const isSelected = selectedOptions[opt.name] === v;
                              return (
                                <button
                                  key={v}
                                  onClick={() => setSelectedOptions({ ...selectedOptions, [opt.name]: v })}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                    isSelected
                                      ? "border-brand bg-natural-secondary text-brand ring-1 ring-brand"
                                      : "border-natural-border hover:border-natural-muted text-natural-text bg-white"
                                  }`}
                                >
                                  {v}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  {selectedProduct.stock > 0 ? (
                    <button
                      id="btn-add-to-cart"
                      onClick={() => handleAddToCart(selectedProduct)}
                      className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3.5 rounded-2xl transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                    >
                      <ShoppingBag className="h-4.5 w-4.5" />
                      <span>Add to Shopping Cart</span>
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full bg-natural-secondary text-natural-muted font-bold py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <X className="h-4.5 w-4.5" />
                      <span>Currently Out of Stock</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Authentication Modal (Login / Register / Guest Panel) */}
      <AnimatePresence>
        {showAuthModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4" id="auth-modal-root">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAuthModal(false)}
              className="fixed inset-0 bg-brand/50 backdrop-blur-xs"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-natural-border shadow-2xl max-w-md w-full relative p-6 sm:p-8 z-10"
            >
              <button
                onClick={() => setShowAuthModal(false)}
                className="absolute top-4 right-4 p-1 text-natural-muted hover:text-natural-text rounded-lg hover:bg-natural-secondary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="text-center mb-6">
                <h3 className="font-serif font-bold text-xl text-natural-text">
                  {authMode === "login" ? "Account Sign In" : authMode === "register" ? "Create Account" : "Guest Checkout"}
                </h3>
                <p className="text-natural-muted text-xs mt-1">
                  {authMode === "login" ? "Welcome back! Enter credentials to continue." : authMode === "register" ? "Register details for rapid checkouts & status tracing." : "Check out easily without password registrations."}
                </p>
              </div>

              {/* Mode Toggler */}
              <div className="flex bg-natural-secondary p-1 rounded-xl mb-6 text-xs font-semibold">
                <button
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${authMode === "login" ? "bg-white text-brand shadow-xs" : "text-natural-muted hover:text-natural-text"}`}
                >
                  Log In
                </button>
                <button
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                  className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${authMode === "register" ? "bg-white text-brand shadow-xs" : "text-natural-muted hover:text-natural-text"}`}
                >
                  Register
                </button>
                <button
                  onClick={() => { setAuthMode("guest"); setAuthError(""); }}
                  className={`flex-1 py-2 text-center rounded-lg transition-all cursor-pointer ${authMode === "guest" ? "bg-white text-brand shadow-xs" : "text-natural-muted hover:text-natural-text"}`}
                >
                  Guest
                </button>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {/* LOGIN FORM */}
                {authMode === "login" && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Username / Email</label>
                      <input
                        type="text"
                        required
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-1 focus:ring-brand text-natural-text focus:bg-white transition-all"
                        placeholder="john_doe"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Password</label>
                      <input
                        type="password"
                        required
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        className="w-full px-4 py-2 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-1 focus:ring-brand text-natural-text focus:bg-white transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-natural-muted">
                        Default username is registered on signup.
                      </p>
                    </div>
                  </>
                )}

                {/* REGISTER FORM */}
                {authMode === "register" && (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    <p className="text-[10px] text-natural-muted uppercase tracking-widest font-bold border-b border-natural-border pb-1 mb-2">Login Credentials</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Username</label>
                        <input
                          type="text"
                          required
                          value={authUsername}
                          onChange={(e) => setAuthUsername(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand text-natural-text"
                          placeholder="johndoe"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Password</label>
                        <input
                          type="password"
                          required
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand text-natural-text"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-natural-muted uppercase tracking-widest font-bold border-b border-natural-border pb-1 pt-2">Personal Details</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Full Name</label>
                        <input
                          type="text"
                          required
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand text-natural-text"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Phone Number</label>
                        <input
                          type="tel"
                          required
                          value={authPhone}
                          onChange={(e) => setAuthPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand text-natural-text"
                          placeholder="+1 555-0100"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-natural-muted uppercase tracking-widest font-bold border-b border-natural-border pb-1 pt-2">Default Shipping Address</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">House No.</label>
                        <input
                          type="text"
                          required
                          value={authHouseNumber}
                          onChange={(e) => setAuthHouseNumber(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand text-natural-text"
                          placeholder="Apt 4B"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Street Address</label>
                        <input
                          type="text"
                          required
                          value={authAddress}
                          onChange={(e) => setAuthAddress(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand text-natural-text"
                          placeholder="Oakwood Blvd"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">District</label>
                        <input
                          type="text"
                          required
                          value={authDistrict}
                          onChange={(e) => setAuthDistrict(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand text-natural-text"
                          placeholder="Manhattan"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Postcode</label>
                        <input
                          type="text"
                          required
                          value={authPostcode}
                          onChange={(e) => setAuthPostcode(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand text-natural-text"
                          placeholder="10001"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">State</label>
                      <input
                        type="text"
                        required
                        value={authStateVal}
                        onChange={(e) => setAuthStateVal(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-natural-secondary border border-natural-border text-xs focus:ring-1 focus:ring-brand text-natural-text"
                        placeholder="New York"
                      />
                    </div>
                  </div>
                )}

                {/* GUEST FORM */}
                {authMode === "guest" && (
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-natural-muted mb-1">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-natural-secondary border border-natural-border text-sm focus:ring-1 focus:ring-brand text-natural-text focus:bg-white transition-all"
                      placeholder="Jane Doe"
                    />
                  </div>
                )}

                {authError && (
                  <div className="bg-natural-secondary text-terracotta text-xs p-3 rounded-lg border border-natural-border">
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-3 rounded-xl transition-all text-sm cursor-pointer shadow-sm"
                >
                  {authMode === "login" ? "Sign In" : authMode === "register" ? "Create Account & Sign In" : "Continue as Guest"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
