/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useAppState } from "./hooks/useAppState";
import CustomerPortal from "./components/CustomerPortal";
import StaffPortal from "./components/StaffPortal";
import StaffAuthGate from "./components/StaffAuthGate";
import { Sliders, ShoppingBag, Info, Sparkles, Zap } from "lucide-react";

export default function App() {
  const [portalMode, setPortalMode] = useState<"customer" | "staff">("customer");
  const [authenticatedStaffId, setAuthenticatedStaffId] = useState<string | null>(null);

  // Load centralized reactive states from the useAppState engine
  const state = useAppState();

  return (
    <div className="flex flex-col min-h-screen bg-natural-bg text-natural-text font-sans">
      {/* Dynamic Portal Swapper Header */}
      <div className="bg-white/80 backdrop-blur-md text-natural-text border-b border-natural-border px-6 py-3.5 flex flex-col md:flex-row justify-between items-center gap-4 z-49 shadow-xs">
        {/* Portal Info Title */}
        <div className="flex items-center space-x-3">
          <div className="bg-brand p-2.5 rounded-xl text-white shadow-md shadow-brand/10">
            <Zap className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="font-serif font-black text-base italic tracking-tight text-brand flex items-center gap-1.5">
              Dual-Channel Retail Simulator
            </h2>
            <p className="text-natural-muted text-[10px] uppercase font-bold tracking-wider mt-0.5">Real-time customer &amp; staff syncing</p>
          </div>
        </div>

        {/* Action Toggle Switch */}
        <div className="flex items-center space-x-1.5 bg-natural-secondary border border-natural-border p-1 rounded-xl">
          <button
            id="btn-portal-customer"
            onClick={() => setPortalMode("customer")}
            className={`px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              portalMode === "customer"
                ? "bg-brand text-white shadow-sm"
                : "text-natural-muted hover:text-natural-text"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>🛒 Customer Shop</span>
          </button>
          <button
            id="btn-portal-staff"
            onClick={() => setPortalMode("staff")}
            className={`px-4.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              portalMode === "staff"
                ? "bg-brand text-white shadow-sm"
                : "text-natural-muted hover:text-natural-text"
            }`}
          >
            <Sliders className="h-3.5 w-3.5" />
            <span>🛠️ Staff Console</span>
          </button>
        </div>

        {/* Quick Sync Notice */}
        <div className="hidden lg:flex items-center space-x-2 text-xs bg-natural-secondary px-3 py-1.5 rounded-lg border border-natural-border text-natural-muted">
          <Info className="h-3.5 w-3.5 text-brand" />
          <span>Syncing: <strong className="text-brand">{state.products.length}</strong> items, <strong className="text-brand">{state.orders.length}</strong> orders, <strong className="text-brand">{state.vouchers.length}</strong> vouchers.</span>
        </div>
      </div>

      {/* Main Portals Renderer */}
      <div className="flex-1">
        {portalMode === "customer" ? (
          <CustomerPortal
            products={state.products}
            vouchers={state.vouchers}
            shippingMethods={state.shippingMethods}
            orders={state.orders}
            currentUser={state.currentUser}
            registerUser={state.registerUser}
            loginUser={state.loginUser}
            logoutUser={state.logoutUser}
            setGuestSession={state.setGuestSession}
            createOrder={state.createOrder}
          />
        ) : !authenticatedStaffId ? (
          <StaffAuthGate
            staffIds={state.staffIds}
            onAuthenticate={(id) => setAuthenticatedStaffId(id)}
            onRegisterStaffId={state.registerStaffId}
            onBackToCustomer={() => setPortalMode("customer")}
          />
        ) : (
          <StaffPortal
            products={state.products}
            vouchers={state.vouchers}
            shippingMethods={state.shippingMethods}
            orders={state.orders}
            addProduct={state.addProduct}
            toggleProductStatus={state.toggleProductStatus}
            updateProductStock={state.updateProductStock}
            addOptionToProduct={state.addOptionToProduct}
            removeOptionFromProduct={state.removeOptionFromProduct}
            addVoucher={state.addVoucher}
            toggleVoucherStatus={state.toggleVoucherStatus}
            addShippingMethod={state.addShippingMethod}
            toggleShippingStatus={state.toggleShippingStatus}
            updateOrderStatus={state.updateOrderStatus}
            deleteProduct={state.deleteProduct}
            deleteOrder={state.deleteOrder}
            authenticatedStaffId={authenticatedStaffId}
            onLogoutStaff={() => setAuthenticatedStaffId(null)}
            staffIds={state.staffIds}
            registerStaffId={state.registerStaffId}
            supabaseStatus={state.supabaseStatus}
            isSyncing={state.isSyncing}
            syncError={state.syncError}
            syncFromSupabase={state.syncFromSupabase}
          />
        )}
      </div>
    </div>
  );
}
