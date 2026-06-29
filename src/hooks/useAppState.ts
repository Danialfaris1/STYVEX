/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Product, Voucher, ShippingMethod, Order, User, ProductOption } from "../types";
import { INITIAL_PRODUCTS, INITIAL_VOUCHERS, INITIAL_SHIPPING } from "../data";

export function useAppState() {
  // --- Core States ---
  const [products, setProducts] = useState<Product[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [staffIds, setStaffIds] = useState<string[]>([]);

  // Load from LocalStorage on mount
  useEffect(() => {
    const storedStaffIds = localStorage.getItem("store_staff_ids");
    if (storedStaffIds) {
      setStaffIds(JSON.parse(storedStaffIds));
    } else {
      const defaultIds = ["585355"];
      setStaffIds(defaultIds);
      localStorage.setItem("store_staff_ids", JSON.stringify(defaultIds));
    }

    const storedProducts = localStorage.getItem("store_products");
    if (storedProducts) {
      setProducts(JSON.parse(storedProducts));
    } else {
      setProducts(INITIAL_PRODUCTS);
      localStorage.setItem("store_products", JSON.stringify(INITIAL_PRODUCTS));
    }

    const storedVouchers = localStorage.getItem("store_vouchers");
    if (storedVouchers) {
      setVouchers(JSON.parse(storedVouchers));
    } else {
      setVouchers(INITIAL_VOUCHERS);
      localStorage.setItem("store_vouchers", JSON.stringify(INITIAL_VOUCHERS));
    }

    const storedShipping = localStorage.getItem("store_shipping");
    if (storedShipping) {
      setShippingMethods(JSON.parse(storedShipping));
    } else {
      setShippingMethods(INITIAL_SHIPPING);
      localStorage.setItem("store_shipping", JSON.stringify(INITIAL_SHIPPING));
    }

    const storedOrders = localStorage.getItem("store_orders");
    if (storedOrders) {
      setOrders(JSON.parse(storedOrders));
    } else {
      setOrders([]);
      localStorage.setItem("store_orders", JSON.stringify([]));
    }

    const storedUsers = localStorage.getItem("store_users");
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      setUsers([]);
      localStorage.setItem("store_users", JSON.stringify([]));
    }

    const storedCurrentUser = localStorage.getItem("store_current_user");
    if (storedCurrentUser) {
      setCurrentUser(JSON.parse(storedCurrentUser));
    }
  }, []);

  // Sync helpers to localStorage
  const saveProducts = (updated: Product[]) => {
    setProducts(updated);
    localStorage.setItem("store_products", JSON.stringify(updated));
  };

  const saveVouchers = (updated: Voucher[]) => {
    setVouchers(updated);
    localStorage.setItem("store_vouchers", JSON.stringify(updated));
  };

  const saveShipping = (updated: ShippingMethod[]) => {
    setShippingMethods(updated);
    localStorage.setItem("store_shipping", JSON.stringify(updated));
  };

  const saveOrders = (updated: Order[]) => {
    setOrders(updated);
    localStorage.setItem("store_orders", JSON.stringify(updated));
  };

  const saveUsers = (updatedUsers: User[], loggedInUser: User | null) => {
    setUsers(updatedUsers);
    setCurrentUser(loggedInUser);
    localStorage.setItem("store_users", JSON.stringify(updatedUsers));
    if (loggedInUser) {
      localStorage.setItem("store_current_user", JSON.stringify(loggedInUser));
    } else {
      localStorage.removeItem("store_current_user");
    }
  };

  // --- Auth Actions ---
  const registerUser = (user: Omit<User, "id">): { success: boolean; error?: string } => {
    const exists = users.find((u) => u.username.toLowerCase() === user.username.toLowerCase());
    if (exists) {
      return { success: false, error: "Username already exists." };
    }
    const newUser: User = {
      ...user,
      id: "user-" + Math.random().toString(36).substr(2, 9),
    };
    const updatedUsers = [...users, newUser];
    saveUsers(updatedUsers, newUser);
    return { success: true };
  };

  const loginUser = (username: string, password?: string): { success: boolean; error?: string } => {
    const user = users.find(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.password === password
    );
    if (!user) {
      return { success: false, error: "Invalid username or password." };
    }
    setCurrentUser(user);
    localStorage.setItem("store_current_user", JSON.stringify(user));
    return { success: true };
  };

  const logoutUser = () => {
    setCurrentUser(null);
    localStorage.removeItem("store_current_user");
  };

  const setGuestSession = (name: string) => {
    const guestUser: User = {
      id: "guest-" + Math.random().toString(36).substr(2, 9),
      username: "guest_" + Date.now(),
      name: name || "Guest Customer",
      phone: "",
      houseNumber: "",
      address: "",
      district: "",
      postcode: "",
      state: "",
      isGuest: true
    };
    setCurrentUser(guestUser);
    localStorage.setItem("store_current_user", JSON.stringify(guestUser));
  };

  // --- Staff: Product Actions ---
  const addProduct = (p: Omit<Product, "id" | "status">) => {
    const newProduct: Product = {
      ...p,
      id: "prod-" + Math.random().toString(36).substr(2, 9),
      status: "active"
    };
    saveProducts([...products, newProduct]);
  };

  const toggleProductStatus = (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          status: p.status === "active" ? "rejected" as const : "active" as const
        };
      }
      return p;
    });
    saveProducts(updated);
  };

  const deleteProduct = (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    saveProducts(updated);
  };

  const updateProductStock = (productId: string, newStock: number) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return { ...p, stock: Math.max(0, newStock) };
      }
      return p;
    });
    saveProducts(updated);
  };

  const addOptionToProduct = (productId: string, option: ProductOption) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        // Remove option if it exists to overwrite, or append
        const filteredOptions = p.options.filter((o) => o.name.toLowerCase() !== option.name.toLowerCase());
        return {
          ...p,
          options: [...filteredOptions, option]
        };
      }
      return p;
    });
    saveProducts(updated);
  };

  const removeOptionFromProduct = (productId: string, optionName: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          options: p.options.filter((o) => o.name !== optionName)
        };
      }
      return p;
    });
    saveProducts(updated);
  };

  // --- Staff: Voucher Actions ---
  const addVoucher = (v: Omit<Voucher, "id" | "isActive">) => {
    const newVoucher: Voucher = {
      ...v,
      code: v.code.toUpperCase().trim(),
      id: "vouch-" + Math.random().toString(36).substr(2, 9),
      isActive: true
    };
    saveVouchers([...vouchers, newVoucher]);
  };

  const toggleVoucherStatus = (voucherId: string) => {
    const updated = vouchers.map((v) => {
      if (v.id === voucherId) {
        return { ...v, isActive: !v.isActive };
      }
      return v;
    });
    saveVouchers(updated);
  };

  // --- Staff: Shipping Actions ---
  const addShippingMethod = (s: Omit<ShippingMethod, "id" | "isActive">) => {
    const newShip: ShippingMethod = {
      ...s,
      id: "ship-" + Math.random().toString(36).substr(2, 9),
      isActive: true
    };
    saveShipping([...shippingMethods, newShip]);
  };

  const toggleShippingStatus = (shipId: string) => {
    const updated = shippingMethods.map((s) => {
      if (s.id === shipId) {
        return { ...s, isActive: !s.isActive };
      }
      return s;
    });
    saveShipping(updated);
  };

  // --- Customer: Order Checkout Actions ---
  const createOrder = (orderData: Omit<Order, "id" | "customerCode" | "createdAt" | "status">): Order => {
    // Generate a beautiful unique customer code: e.g. CUST-XY82
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";
    for (let i = 0; i < 4; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const customerCode = `CUST-${randomPart}`;

    const newOrder: Order = {
      ...orderData,
      id: "order-" + Math.random().toString(36).substr(2, 9),
      customerCode,
      createdAt: new Date().toISOString(),
      status: "pending"
    };

    // Deduct stock for products bought
    const updatedProducts = products.map((p) => {
      const orderItem = orderData.items.find((item) => item.productId === p.id);
      if (orderItem) {
        return {
          ...p,
          stock: Math.max(0, p.stock - orderItem.quantity)
        };
      }
      return p;
    });

    saveProducts(updatedProducts);
    saveOrders([newOrder, ...orders]); // newest first
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order["status"]) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        // If order is cancelled, return stock
        if (status === "cancelled" && o.status !== "cancelled") {
          const updatedProducts = products.map((p) => {
            const orderItem = o.items.find((item) => item.productId === p.id);
            if (orderItem) {
              return { ...p, stock: p.stock + orderItem.quantity };
            }
            return p;
          });
          saveProducts(updatedProducts);
        }
        return { ...o, status };
      }
      return o;
    });
    saveOrders(updated);
  };

  const deleteOrder = (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId);
    saveOrders(updated);
  };

  const registerStaffId = (id: string): { success: boolean; error?: string } => {
    const trimmed = id.trim();
    if (!trimmed) {
      return { success: false, error: "Staff ID cannot be empty." };
    }
    if (!/^\d+$/.test(trimmed)) {
      return { success: false, error: "Staff ID must contain numeric digits only." };
    }
    if (staffIds.includes(trimmed)) {
      return { success: false, error: "This Staff ID is already registered." };
    }
    const updated = [...staffIds, trimmed];
    setStaffIds(updated);
    localStorage.setItem("store_staff_ids", JSON.stringify(updated));
    return { success: true };
  };

  return {
    products,
    vouchers,
    shippingMethods,
    orders,
    users,
    currentUser,
    registerUser,
    loginUser,
    logoutUser,
    setGuestSession,
    addProduct,
    toggleProductStatus,
    updateProductStock,
    addOptionToProduct,
    removeOptionFromProduct,
    addVoucher,
    toggleVoucherStatus,
    addShippingMethod,
    toggleShippingStatus,
    createOrder,
    updateOrderStatus,
    deleteProduct,
    deleteOrder,
    staffIds,
    registerStaffId
  };
}
