/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Product, Voucher, ShippingMethod, Order, User, ProductOption } from "../types";
import { INITIAL_PRODUCTS, INITIAL_VOUCHERS, INITIAL_SHIPPING } from "../data";
import {
  supabase,
  mapProductToDB,
  mapProductFromDB,
  mapVoucherToDB,
  mapVoucherFromDB,
  mapShippingToDB,
  mapShippingFromDB,
  mapUserToDB,
  mapUserFromDB,
  mapOrderToDB,
  mapOrderFromDB
} from "../supabaseClient";

export function useAppState() {
  // --- Core States ---
  const [products, setProducts] = useState<Product[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [staffIds, setStaffIds] = useState<string[]>([]);

  // --- Supabase Sync Status ---
  const [supabaseStatus, setSupabaseStatus] = useState<Record<string, "synced" | "missing" | "error" | "loading">>({
    products: "loading",
    vouchers: "loading",
    shippingMethods: "loading",
    orders: "loading",
    users: "loading",
    staffIds: "loading",
    cart: "loading",
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Get products directly from Supabase
  const getProducts = async (): Promise<Product[]> => {
    try {
      const { data, error } = await supabase.from("styvex_products").select("*");
      if (error) throw error;
      if (data && data.length > 0) {
        const mapped = data.map(mapProductFromDB);
        setProducts(mapped);
        localStorage.setItem("store_products", JSON.stringify(mapped));
        setSupabaseStatus((prev) => ({ ...prev, products: "synced" }));
        return mapped;
      } else {
        const localProducts = localStorage.getItem("store_products")
          ? JSON.parse(localStorage.getItem("store_products")!)
          : INITIAL_PRODUCTS;
        setProducts(localProducts);
        await supabase.from("styvex_products").upsert(localProducts.map(mapProductToDB));
        setSupabaseStatus((prev) => ({ ...prev, products: "synced" }));
        return localProducts;
      }
    } catch (err: any) {
      console.warn("Supabase products fetch failed:", err);
      setSupabaseStatus((prev) => ({
        ...prev,
        products: err.code === "42P01" || err.message?.includes("does not exist") ? "missing" : "error"
      }));
      const stored = localStorage.getItem("store_products");
      const loaded = stored ? JSON.parse(stored) : INITIAL_PRODUCTS;
      setProducts(loaded);
      return loaded;
    }
  };

  // Sync from Supabase
  const syncFromSupabase = async () => {
    setIsSyncing(true);
    setSyncError(null);
    const newStatus = { ...supabaseStatus };

    // 1. Products Sync
    try {
      await getProducts();
      newStatus.products = "synced";
    } catch (err) {
      newStatus.products = "error";
    }

    // 2. Vouchers Sync
    try {
      const { data, error } = await supabase.from("styvex_vouchers").select("*");
      if (error) throw error;
      if (data && data.length > 0) {
        const mapped = data.map(mapVoucherFromDB);
        setVouchers(mapped);
        localStorage.setItem("store_vouchers", JSON.stringify(mapped));
      } else {
        const local = localStorage.getItem("store_vouchers")
          ? JSON.parse(localStorage.getItem("store_vouchers")!)
          : INITIAL_VOUCHERS;
        setVouchers(local);
        await supabase.from("styvex_vouchers").upsert(local.map(mapVoucherToDB));
      }
      newStatus.vouchers = "synced";
    } catch (err: any) {
      console.warn("Supabase vouchers fetch failed:", err);
      newStatus.vouchers = err.code === "42P01" || err.message?.includes("does not exist") ? "missing" : "error";
      const stored = localStorage.getItem("store_vouchers");
      setVouchers(stored ? JSON.parse(stored) : INITIAL_VOUCHERS);
    }

    // 3. Shipping Sync
    try {
      const { data, error } = await supabase.from("styvex_shipping_methods").select("*");
      if (error) throw error;
      if (data && data.length > 0) {
        const mapped = data.map(mapShippingFromDB);
        setShippingMethods(mapped);
        localStorage.setItem("store_shipping", JSON.stringify(mapped));
      } else {
        const local = localStorage.getItem("store_shipping")
          ? JSON.parse(localStorage.getItem("store_shipping")!)
          : INITIAL_SHIPPING;
        setShippingMethods(local);
        await supabase.from("styvex_shipping_methods").upsert(local.map(mapShippingToDB));
      }
      newStatus.shippingMethods = "synced";
    } catch (err: any) {
      console.warn("Supabase shipping fetch failed:", err);
      newStatus.shippingMethods = err.code === "42P01" || err.message?.includes("does not exist") ? "missing" : "error";
      const stored = localStorage.getItem("store_shipping");
      setShippingMethods(stored ? JSON.parse(stored) : INITIAL_SHIPPING);
    }

    // 4. Orders Sync
    try {
      const { data, error } = await supabase.from("styvex_orders").select("*");
      if (error) throw error;
      if (data && data.length > 0) {
        const mapped = data.map(mapOrderFromDB);
        mapped.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(mapped);
        localStorage.setItem("store_orders", JSON.stringify(mapped));
      } else {
        const stored = localStorage.getItem("store_orders");
        setOrders(stored ? JSON.parse(stored) : []);
      }
      newStatus.orders = "synced";
    } catch (err: any) {
      console.warn("Supabase orders fetch failed:", err);
      newStatus.orders = err.code === "42P01" || err.message?.includes("does not exist") ? "missing" : "error";
      const stored = localStorage.getItem("store_orders");
      setOrders(stored ? JSON.parse(stored) : []);
    }

    // 5. Users Sync
    try {
      const { data, error } = await supabase.from("styvex_users").select("*");
      if (error) throw error;
      if (data && data.length > 0) {
        const mapped = data.map(mapUserFromDB);
        setUsers(mapped);
        localStorage.setItem("store_users", JSON.stringify(mapped));
      } else {
        const stored = localStorage.getItem("store_users");
        setUsers(stored ? JSON.parse(stored) : []);
      }
      newStatus.users = "synced";
    } catch (err: any) {
      console.warn("Supabase users fetch failed:", err);
      newStatus.users = err.code === "42P01" || err.message?.includes("does not exist") ? "missing" : "error";
      const stored = localStorage.getItem("store_users");
      setUsers(stored ? JSON.parse(stored) : []);
    }

    // 6. Staff IDs Sync
    try {
      const { data, error } = await supabase.from("styvex_staff_ids").select("*");
      if (error) throw error;
      if (data && data.length > 0) {
        const ids = data.map((d) => d.staff_id);
        setStaffIds(ids);
        localStorage.setItem("store_staff_ids", JSON.stringify(ids));
      } else {
        const defaultIds = ["585355"];
        setStaffIds(defaultIds);
        localStorage.setItem("store_staff_ids", JSON.stringify(defaultIds));
        await supabase.from("styvex_staff_ids").upsert([{ staff_id: "585355" }]);
      }
      newStatus.staffIds = "synced";
    } catch (err: any) {
      console.warn("Supabase staffIds fetch failed:", err);
      newStatus.staffIds = err.code === "42P01" || err.message?.includes("does not exist") ? "missing" : "error";
      const stored = localStorage.getItem("store_staff_ids");
      setStaffIds(stored ? JSON.parse(stored) : ["585355"]);
    }

    // 7. Cart Table Sync Status Check
    try {
      const { error } = await supabase.from("styvex_cart").select("id").limit(1);
      if (error) throw error;
      newStatus.cart = "synced";
    } catch (err: any) {
      console.warn("Supabase cart table status check failed:", err);
      newStatus.cart = err.code === "42P01" || err.message?.includes("does not exist") ? "missing" : "error";
    }

    setSupabaseStatus(newStatus);
    setIsSyncing(false);
  };

  // Sync on mount and periodically to keep different devices in sync in real-time
  useEffect(() => {
    syncFromSupabase();

    const storedCurrentUser = localStorage.getItem("store_current_user");
    if (storedCurrentUser) {
      setCurrentUser(JSON.parse(storedCurrentUser));
    }

    // Set up background polling every 5 seconds to sync products, orders, and staff IDs in real-time
    const interval = setInterval(() => {
      syncFromSupabase();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // --- Real-time Local & Supabase Savers ---

  const saveProducts = async (updated: Product[]) => {
    setProducts(updated);
    localStorage.setItem("store_products", JSON.stringify(updated));
    try {
      const mapped = updated.map(mapProductToDB);
      const { error } = await supabase.from("styvex_products").upsert(mapped);
      if (error) throw error;
      setSupabaseStatus((prev) => ({ ...prev, products: "synced" }));
    } catch (err) {
      console.error("Failed to save products to Supabase:", err);
    }
  };

  const saveVouchers = async (updated: Voucher[]) => {
    setVouchers(updated);
    localStorage.setItem("store_vouchers", JSON.stringify(updated));
    try {
      const mapped = updated.map(mapVoucherToDB);
      const { error } = await supabase.from("styvex_vouchers").upsert(mapped);
      if (error) throw error;
      setSupabaseStatus((prev) => ({ ...prev, vouchers: "synced" }));
    } catch (err) {
      console.error("Failed to save vouchers to Supabase:", err);
    }
  };

  const saveShipping = async (updated: ShippingMethod[]) => {
    setShippingMethods(updated);
    localStorage.setItem("store_shipping", JSON.stringify(updated));
    try {
      const mapped = updated.map(mapShippingToDB);
      const { error } = await supabase.from("styvex_shipping_methods").upsert(mapped);
      if (error) throw error;
      setSupabaseStatus((prev) => ({ ...prev, shippingMethods: "synced" }));
    } catch (err) {
      console.error("Failed to save shipping methods to Supabase:", err);
    }
  };

  const saveOrders = async (updated: Order[]) => {
    setOrders(updated);
    localStorage.setItem("store_orders", JSON.stringify(updated));
    try {
      const mapped = updated.map(mapOrderToDB);
      const { error } = await supabase.from("styvex_orders").upsert(mapped);
      if (error) throw error;
      setSupabaseStatus((prev) => ({ ...prev, orders: "synced" }));
    } catch (err) {
      console.error("Failed to save orders to Supabase:", err);
    }
  };

  const saveUsers = async (updatedUsers: User[], loggedInUser: User | null) => {
    setUsers(updatedUsers);
    setCurrentUser(loggedInUser);
    localStorage.setItem("store_users", JSON.stringify(updatedUsers));
    if (loggedInUser) {
      localStorage.setItem("store_current_user", JSON.stringify(loggedInUser));
    } else {
      localStorage.removeItem("store_current_user");
    }
    try {
      const mapped = updatedUsers.map(mapUserToDB);
      const { error } = await supabase.from("styvex_users").upsert(mapped);
      if (error) throw error;
      setSupabaseStatus((prev) => ({ ...prev, users: "synced" }));
    } catch (err) {
      console.error("Failed to save users to Supabase:", err);
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
  const addProduct = async (p: Omit<Product, "id" | "status">): Promise<{ success: boolean; error?: string }> => {
    const newProduct: Product = {
      ...p,
      id: "prod-" + Math.random().toString(36).substr(2, 9),
      status: "active"
    };

    try {
      const { error } = await supabase.from("styvex_products").insert([mapProductToDB(newProduct)]);
      if (error) throw error;
      await getProducts();
      return { success: true };
    } catch (err: any) {
      console.error("Failed to add product to Supabase:", err);
      const updated = [...products, newProduct];
      setProducts(updated);
      localStorage.setItem("store_products", JSON.stringify(updated));
      return { success: false, error: err.message || "Failed to add product." };
    }
  };

  const editProduct = async (updatedProduct: Product): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await supabase
        .from("styvex_products")
        .update(mapProductToDB(updatedProduct))
        .eq("id", updatedProduct.id);
      if (error) throw error;
      await getProducts();
      return { success: true };
    } catch (err: any) {
      console.error("Failed to edit product on Supabase:", err);
      const updated = products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
      setProducts(updated);
      localStorage.setItem("store_products", JSON.stringify(updated));
      return { success: false, error: err.message || "Failed to edit product." };
    }
  };

  const toggleProductStatus = async (productId: string) => {
    const found = products.find((p) => p.id === productId);
    if (!found) return;
    const updatedStatus = found.status === "active" ? ("rejected" as const) : ("active" as const);
    const updatedProduct = { ...found, status: updatedStatus };

    const updatedList = products.map((p) => (p.id === productId ? updatedProduct : p));
    setProducts(updatedList);
    localStorage.setItem("store_products", JSON.stringify(updatedList));

    try {
      const { error } = await supabase
        .from("styvex_products")
        .update({ status: updatedStatus })
        .eq("id", productId);
      if (error) throw error;
      await getProducts();
    } catch (err) {
      console.error("Failed to toggle product status on Supabase:", err);
    }
  };

  const deleteProduct = async (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    localStorage.setItem("store_products", JSON.stringify(updated));
    try {
      const { error } = await supabase.from("styvex_products").delete().eq("id", productId);
      if (error) throw error;
      await getProducts();
    } catch (err) {
      console.error("Failed to delete product from Supabase:", err);
    }
  };

  const updateProductStock = async (productId: string, newStock: number) => {
    const found = products.find((p) => p.id === productId);
    if (!found) return;
    const updatedStock = Math.max(0, newStock);
    const updatedProduct = { ...found, stock: updatedStock };

    const updatedList = products.map((p) => (p.id === productId ? updatedProduct : p));
    setProducts(updatedList);
    localStorage.setItem("store_products", JSON.stringify(updatedList));

    try {
      const { error } = await supabase
        .from("styvex_products")
        .update({ stock: updatedStock })
        .eq("id", productId);
      if (error) throw error;
      await getProducts();
    } catch (err) {
      console.error("Failed to update product stock on Supabase:", err);
    }
  };

  const addOptionToProduct = async (productId: string, option: ProductOption) => {
    const found = products.find((p) => p.id === productId);
    if (!found) return;
    const filteredOptions = found.options.filter((o) => o.name.toLowerCase() !== option.name.toLowerCase());
    const updatedOptions = [...filteredOptions, option];
    const updatedProduct = { ...found, options: updatedOptions };

    const updatedList = products.map((p) => (p.id === productId ? updatedProduct : p));
    setProducts(updatedList);
    localStorage.setItem("store_products", JSON.stringify(updatedList));

    try {
      const { error } = await supabase
        .from("styvex_products")
        .update({ options: updatedOptions })
        .eq("id", productId);
      if (error) throw error;
      await getProducts();
    } catch (err) {
      console.error("Failed to add option to product on Supabase:", err);
    }
  };

  const removeOptionFromProduct = async (productId: string, optionName: string) => {
    const found = products.find((p) => p.id === productId);
    if (!found) return;
    const updatedOptions = found.options.filter((o) => o.name !== optionName);
    const updatedProduct = { ...found, options: updatedOptions };

    const updatedList = products.map((p) => (p.id === productId ? updatedProduct : p));
    setProducts(updatedList);
    localStorage.setItem("store_products", JSON.stringify(updatedList));

    try {
      const { error } = await supabase
        .from("styvex_products")
        .update({ options: updatedOptions })
        .eq("id", productId);
      if (error) throw error;
      await getProducts();
    } catch (err) {
      console.error("Failed to remove option from product on Supabase:", err);
    }
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

    // Deduct stock for products bought (run individually on Supabase instead of upserting entire array)
    (async () => {
      try {
        for (const item of orderData.items) {
          const prod = products.find((p) => p.id === item.productId);
          if (prod) {
            const newStock = Math.max(0, prod.stock - item.quantity);
            await supabase.from("styvex_products").update({ stock: newStock }).eq("id", prod.id);
          }
        }
        await getProducts();
      } catch (err) {
        console.error("Failed to deduct stock for created order items:", err);
      }
    })();

    saveOrders([newOrder, ...orders]); // newest first
    return newOrder;
  };

  const updateOrderStatus = (orderId: string, status: Order["status"]) => {
    const updated = orders.map((o) => {
      if (o.id === orderId) {
        if (status === "cancelled" && o.status !== "cancelled") {
          // Refund stock for products (run individually on Supabase)
          (async () => {
            try {
              for (const item of o.items) {
                const prod = products.find((p) => p.id === item.productId);
                if (prod) {
                  const newStock = prod.stock + item.quantity;
                  await supabase.from("styvex_products").update({ stock: newStock }).eq("id", prod.id);
                }
              }
              await getProducts();
            } catch (err) {
              console.error("Failed to refund stock for cancelled order items:", err);
            }
          })();
        }
        return { ...o, status };
      }
      return o;
    });
    saveOrders(updated);
  };

  const deleteOrder = async (orderId: string) => {
    const updated = orders.filter((o) => o.id !== orderId);
    setOrders(updated);
    localStorage.setItem("store_orders", JSON.stringify(updated));
    try {
      const { error } = await supabase.from("styvex_orders").delete().eq("id", orderId);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete order from Supabase:", err);
    }
  };

  const registerStaffId = async (id: string): Promise<{ success: boolean; error?: string }> => {
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

    try {
      const { error } = await supabase.from("styvex_staff_ids").insert([{ staff_id: trimmed }]);
      if (error) throw error;
      
      const updated = [...staffIds, trimmed];
      setStaffIds(updated);
      localStorage.setItem("store_staff_ids", JSON.stringify(updated));
      setSupabaseStatus((prev) => ({ ...prev, staffIds: "synced" }));
      return { success: true };
    } catch (err: any) {
      console.error("Error registering staff ID on Supabase:", err);
      return { success: false, error: err.message || "Failed to register Staff ID in database." };
    }
  };

  const deleteStaffId = async (id: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = id.trim();
    if (trimmed === "585355") {
      return { success: false, error: "System default Staff ID ('585355') cannot be deleted." };
    }
    const updated = staffIds.filter((sid) => sid !== trimmed);
    setStaffIds(updated);
    localStorage.setItem("store_staff_ids", JSON.stringify(updated));

    try {
      const { error } = await supabase.from("styvex_staff_ids").delete().eq("staff_id", trimmed);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("Failed to delete staff ID from Supabase:", err);
      return { success: false, error: err.message || "Failed to delete from database." };
    }
  };

  const updateStaffId = async (oldId: string, newId: string): Promise<{ success: boolean; error?: string }> => {
    const oldTrimmed = oldId.trim();
    const newTrimmed = newId.trim();

    if (!newTrimmed) {
      return { success: false, error: "New Staff ID cannot be empty." };
    }
    if (!/^\d+$/.test(newTrimmed)) {
      return { success: false, error: "Staff ID must contain numeric digits only." };
    }
    if (staffIds.includes(newTrimmed) && newTrimmed !== oldTrimmed) {
      return { success: false, error: "This Staff ID is already registered." };
    }

    // Update locally
    const updated = staffIds.map((sid) => (sid === oldTrimmed ? newTrimmed : sid));
    setStaffIds(updated);
    localStorage.setItem("store_staff_ids", JSON.stringify(updated));

    try {
      const { error } = await supabase
        .from("styvex_staff_ids")
        .update({ staff_id: newTrimmed })
        .eq("staff_id", oldTrimmed);
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("Failed to update staff ID in Supabase:", err);
      return { success: false, error: err.message || "Failed to update in database." };
    }
  };

  return {
    products,
    getProducts,
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
    editProduct,
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
    registerStaffId,
    deleteStaffId,
    updateStaffId,
    // Supabase specific fields
    supabaseStatus,
    isSyncing,
    syncError,
    syncFromSupabase
  };
}
