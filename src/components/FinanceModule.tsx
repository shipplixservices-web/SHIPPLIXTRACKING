import React, { useState, useMemo } from "react";
import * as d3 from "d3";
import { 
  DollarSign, Package, TrendingUp, AlertCircle, CheckCircle2, ShieldAlert, 
  HelpCircle, Search, Edit2, ChevronRight, Save, Receipt, Building, Filter, ArrowUpRight
} from "lucide-react";
import { Shipment } from "../types.js";
import { formatCurrency, getCurrencySymbol } from "../utils/currencyUtils.ts";
import { 
  ShipmentFinance, parseShipmentNotesAndFinance, serializeNotesWithFinance, calculateFinanceCalculatedFields 
} from "../utils/financeUtils.ts";

interface FinanceModuleProps {
  shipments: Shipment[];
  loading: boolean;
  onUpdateShipmentDetails: (shipment: Shipment) => Promise<boolean>;
}

export default function FinanceModule({ shipments, loading, onUpdateShipmentDetails }: FinanceModuleProps) {
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Selected shipment to edit
  const [selectedTracking, setSelectedTracking] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [formShippingFee, setFormShippingFee] = useState("0");
  const [formPackagingFee, setFormPackagingFee] = useState("0");
  const [formPickupFee, setFormPickupFee] = useState("0");
  const [formInsurance, setFormInsurance] = useState("0");
  const [formCustomCharge, setFormCustomCharge] = useState("0");
  const [formDiscount, setFormDiscount] = useState("0");
  const [formOtherCharges, setFormOtherCharges] = useState("0");
  const [formActualCost, setFormActualCost] = useState("0");
  const [formPaymentStatus, setFormPaymentStatus] = useState<ShipmentFinance["paymentStatus"]>("Paid");
  const [formAmountPaid, setFormAmountPaid] = useState("0");

  // 1. High-Performance Financial Rollup
  const financeRollup = useMemo(() => {
    if (!shipments || shipments.length === 0) {
      return {
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        totalPaid: 0,
        totalBalance: 0,
        unpaidCount: 0,
        partialCount: 0,
        paidCount: 0,
        refundedCount: 0
      };
    }

    const parsedFinances = shipments.map(s => parseShipmentNotesAndFinance(s).finance);

    const totalRevenue = d3.sum(parsedFinances, f => f.totalCharged);
    const totalCost = d3.sum(parsedFinances, f => f.actualCost);
    const totalProfit = d3.sum(parsedFinances, f => f.profit);
    const totalPaid = d3.sum(parsedFinances, f => f.amountPaid);
    const totalBalance = d3.sum(parsedFinances, f => f.balance);

    const unpaidCount = parsedFinances.filter(f => f.paymentStatus === "Unpaid").length;
    const partialCount = parsedFinances.filter(f => f.paymentStatus === "Partially Paid").length;
    const paidCount = parsedFinances.filter(f => f.paymentStatus === "Paid").length;
    const refundedCount = parsedFinances.filter(f => f.paymentStatus === "Refunded").length;

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCost: Math.round(totalCost * 100) / 100,
      totalProfit: Math.round(totalProfit * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      totalBalance: Math.round(totalBalance * 100) / 100,
      unpaidCount,
      partialCount,
      paidCount,
      refundedCount
    };
  }, [shipments]);

  // 2. Parsed & Filtered List of Shipments
  const parsedShipments = useMemo(() => {
    return shipments.map(s => {
      const { notes, finance } = parseShipmentNotesAndFinance(s);
      return {
        shipment: s,
        notes,
        finance
      };
    });
  }, [shipments]);

  const filteredShipments = useMemo(() => {
    return parsedShipments.filter(item => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = 
        item.shipment.trackingNumber.toLowerCase().includes(query) ||
        item.shipment.senderName.toLowerCase().includes(query) ||
        item.shipment.receiverName.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" ? true : item.finance.paymentStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [parsedShipments, searchQuery, statusFilter]);

  // Find currently selected shipment
  const selectedRecord = useMemo(() => {
    if (!selectedTracking) return null;
    return parsedShipments.find(item => item.shipment.trackingNumber === selectedTracking) || null;
  }, [parsedShipments, selectedTracking]);

  // Load selected shipment details into form state
  const handleSelectShipment = (tracking: string) => {
    const record = parsedShipments.find(item => item.shipment.trackingNumber === tracking);
    if (record) {
      setSelectedTracking(tracking);
      setFormShippingFee(record.finance.shippingFee.toString());
      setFormPackagingFee(record.finance.packagingFee.toString());
      setFormPickupFee(record.finance.pickupFee.toString());
      setFormInsurance(record.finance.insurance.toString());
      setFormCustomCharge(record.finance.customCharge.toString());
      setFormDiscount(record.finance.discount.toString());
      setFormOtherCharges(record.finance.otherCharges.toString());
      setFormActualCost(record.finance.actualCost.toString());
      setFormPaymentStatus(record.finance.paymentStatus);
      setFormAmountPaid(record.finance.amountPaid.toString());
      setSaveSuccess(null);
      setSaveError(null);
    }
  };

  // 3. Real-time automatic calculations during input typing
  const liveCalculatedFields = useMemo(() => {
    const sFee = parseFloat(formShippingFee) || 0;
    const pkgFee = parseFloat(formPackagingFee) || 0;
    const pFee = parseFloat(formPickupFee) || 0;
    const ins = parseFloat(formInsurance) || 0;
    const cust = parseFloat(formCustomCharge) || 0;
    const disc = parseFloat(formDiscount) || 0;
    const other = parseFloat(formOtherCharges) || 0;
    const cost = parseFloat(formActualCost) || 0;
    const paid = parseFloat(formAmountPaid) || 0;

    const totalCharged = Math.round((sFee + pkgFee + pFee + ins + cust + other - disc) * 100) / 100;
    const profit = Math.round((totalCharged - cost) * 100) / 100;
    const balance = Math.round((totalCharged - paid) * 100) / 100;

    return {
      totalCharged,
      profit,
      balance
    };
  }, [
    formShippingFee, formPackagingFee, formPickupFee, formInsurance, 
    formCustomCharge, formDiscount, formOtherCharges, formActualCost, formAmountPaid
  ]);

  // 4. Save handler to serialize and save back to Supabase
  const handleSaveFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;

    setIsSaving(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const updatedFinance: ShipmentFinance = {
        shippingFee: parseFloat(formShippingFee) || 0,
        packagingFee: parseFloat(formPackagingFee) || 0,
        pickupFee: parseFloat(formPickupFee) || 0,
        insurance: parseFloat(formInsurance) || 0,
        customCharge: parseFloat(formCustomCharge) || 0,
        discount: parseFloat(formDiscount) || 0,
        otherCharges: parseFloat(formOtherCharges) || 0,
        totalCharged: liveCalculatedFields.totalCharged,
        actualCost: parseFloat(formActualCost) || 0,
        profit: liveCalculatedFields.profit,
        paymentStatus: formPaymentStatus,
        amountPaid: parseFloat(formAmountPaid) || 0,
        balance: liveCalculatedFields.balance
      };

      // Serialize into shipment_notes
      const serializedNotes = serializeNotesWithFinance(selectedRecord.notes, updatedFinance);

      // Construct shipment update payload
      const shipmentUpdatePayload = {
        ...selectedRecord.shipment,
        shipmentNotes: serializedNotes
      };

      const ok = await onUpdateShipmentDetails(shipmentUpdatePayload);
      if (ok) {
        setSaveSuccess(`Financial record for ${selectedRecord.shipment.trackingNumber} saved & synced successfully!`);
        // Refresh local values in selected record
        setTimeout(() => setSaveSuccess(null), 4000);
      } else {
        setSaveError("Cloud synchronization failed. Please inspect logs.");
      }
    } catch (err: any) {
      console.error("Failed to save finance record", err);
      setSaveError(`Error: ${err.message || err}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Receipt className="h-10 w-10 text-blue-800 animate-spin" />
        <p className="text-sm font-mono text-gray-500">Loading ledger databases...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Rollup Stats Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* TOTAL REVENUE */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] text-gray-400 font-mono block uppercase tracking-wider">Total Revenue</span>
          <p className="text-2xl font-black text-brand-blue font-mono mt-1">
            {formatCurrency(financeRollup.totalRevenue)}
          </p>
          <span className="text-[9px] text-gray-500 font-mono block mt-1">Aggregate gross billings</span>
        </div>

        {/* TOTAL OPERATING COSTS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] text-gray-400 font-mono block uppercase tracking-wider">Operating Costs</span>
          <p className="text-2xl font-black text-slate-700 font-mono mt-1">
            {formatCurrency(financeRollup.totalCost)}
          </p>
          <span className="text-[9px] text-slate-400 font-mono block mt-1">Aggregate actual expenses</span>
        </div>

        {/* NET PROFIT */}
        <div className="bg-white p-5 rounded-2xl border border-brand-yellow/20 border-l-4 shadow-xs">
          <span className="text-[10px] text-emerald-700 font-mono block uppercase tracking-wider font-bold">Net Profit</span>
          <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
            {formatCurrency(financeRollup.totalProfit)}
          </p>
          <span className="text-[9px] text-emerald-600 font-bold block mt-1">
            Margin: {financeRollup.totalRevenue > 0 ? Math.round((financeRollup.totalProfit / financeRollup.totalRevenue) * 100) : 0}%
          </span>
        </div>

        {/* TOTAL PAYMENTS COLLECTED */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <span className="text-[10px] text-gray-400 font-mono block uppercase tracking-wider font-semibold">Collected Cash</span>
          <p className="text-2xl font-black text-blue-600 font-mono mt-1">
            {formatCurrency(financeRollup.totalPaid)}
          </p>
          <span className="text-[9px] text-emerald-600 font-bold block mt-1">
            {financeRollup.totalRevenue > 0 ? Math.round((financeRollup.totalPaid / financeRollup.totalRevenue) * 100) : 0}% Collection Rate
          </span>
        </div>

        {/* TOTAL OUTSTANDING BALANCES */}
        <div className="bg-white p-5 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-xs">
          <span className="text-[10px] text-amber-800 font-mono block uppercase tracking-wider font-bold">Accounts Receivable</span>
          <p className="text-2xl font-black text-amber-700 font-mono mt-1">
            {formatCurrency(financeRollup.totalBalance)}
          </p>
          <span className="text-[9px] text-amber-700 font-medium block mt-1">
            Outstanding from {financeRollup.unpaidCount + financeRollup.partialCount} files
          </span>
        </div>

      </div>

      {/* Payment Status Quick Badges Bar */}
      <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono">
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mr-2">Audit Summary:</span>
        <span className="bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold">Paid: {financeRollup.paidCount}</span>
        <span className="bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-bold">Partial: {financeRollup.partialCount}</span>
        <span className="bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-bold">Unpaid: {financeRollup.unpaidCount}</span>
        <span className="bg-gray-100 text-gray-800 px-2.5 py-0.5 rounded-full font-bold">Refunded: {financeRollup.refundedCount}</span>
      </div>

      {/* 2. Interactive Workspace: Ledger List & Split Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: SHIPMENT FINANCE LIST (5/12 width or full on small screens) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs lg:col-span-7 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wide">Shipment Billing Registry</h3>
              <p className="text-[11px] text-gray-400">Select any active or past shipment container to edit or audit metrics</p>
            </div>

            {/* Status Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-800 font-mono"
            >
              <option value="all">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by Tracking #, Sender, or Receiver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-blue-800 focus:bg-white transition-all font-mono"
            />
          </div>

          {/* Shipments List */}
          <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50 max-h-[500px] overflow-y-auto">
            {filteredShipments.length > 0 ? (
              filteredShipments.map((item) => {
                const isSelected = selectedTracking === item.shipment.trackingNumber;
                
                let badgeClass = "bg-gray-100 text-gray-800";
                if (item.finance.paymentStatus === "Paid") badgeClass = "bg-emerald-100 text-emerald-800 font-bold";
                else if (item.finance.paymentStatus === "Partially Paid") badgeClass = "bg-amber-100 text-amber-800 font-bold";
                else if (item.finance.paymentStatus === "Unpaid") badgeClass = "bg-red-100 text-red-800 font-bold";
                else if (item.finance.paymentStatus === "Refunded") badgeClass = "bg-gray-200 text-gray-700";

                return (
                  <div
                    key={item.shipment.trackingNumber}
                    onClick={() => handleSelectShipment(item.shipment.trackingNumber)}
                    className={`p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                      isSelected 
                        ? "bg-blue-50/60 border-l-4 border-blue-800" 
                        : "hover:bg-slate-50/50"
                    }`}
                  >
                    <div className="space-y-1 pr-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-xs text-brand-blue hover:underline">
                          {item.shipment.trackingNumber}
                        </span>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                          {item.shipment.serviceType}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-gray-600 font-medium truncate max-w-sm">
                        <span className="text-gray-400">Shipper:</span> {item.shipment.senderName}
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        Date: {item.shipment.bookingDate} • {item.shipment.weight}kg • {item.shipment.numberOfPackages} pkg
                      </div>
                    </div>

                    <div className="text-right shrink-0 space-y-1">
                      <p className="text-xs font-mono font-black text-slate-800">
                        {formatCurrency(item.finance.totalCharged)}
                      </p>
                      
                      <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full ${badgeClass}`}>
                        {item.finance.paymentStatus}
                      </span>
                      
                      {item.finance.balance > 0 && (
                        <p className="text-[9px] font-mono font-semibold text-red-500 block">
                          Bal: {formatCurrency(item.finance.balance)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-gray-400 font-mono text-xs">
                No financial records match the current filter search.
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: INTERACTIVE FORM & REALTIME CALCULATOR (5/12 width) */}
        <div className="lg:col-span-5">
          {selectedRecord ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-5 sticky top-4 animate-[fadeIn_0.2s_ease-out]">
              
              <div className="flex justify-between items-start border-b border-gray-100 pb-3">
                <div>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                    Finance Ledger Editor
                  </span>
                  <h3 className="text-sm font-black text-gray-900 font-mono mt-1.5">
                    {selectedRecord.shipment.trackingNumber}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTracking(null)}
                  className="text-xs text-gray-400 hover:text-gray-600 font-mono font-bold"
                >
                  Close
                </button>
              </div>

              {/* Real-time calculated telemetry feedback */}
              <div className="bg-slate-900 text-white p-4 rounded-xl space-y-3 font-mono">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>TELEMETRY METRICS</span>
                  <span className="text-emerald-400 animate-pulse font-bold text-[9px] flex items-center">
                    <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full mr-1.5"></span>
                    AUTO-COMPUTING
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1.5">
                  <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 block uppercase">Total Charged</span>
                    <span className="text-xs font-black text-amber-300">
                      {formatCurrency(liveCalculatedFields.totalCharged)}
                    </span>
                  </div>

                  <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 block uppercase">Profit Margin</span>
                    <span className={`text-xs font-black ${liveCalculatedFields.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {formatCurrency(liveCalculatedFields.profit)}
                    </span>
                  </div>

                  <div className="bg-slate-800 p-2 rounded border border-slate-700">
                    <span className="text-[9px] text-slate-400 block uppercase">Balance Due</span>
                    <span className={`text-xs font-black ${liveCalculatedFields.balance > 0 ? "text-red-400" : "text-slate-300"}`}>
                      {formatCurrency(liveCalculatedFields.balance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notification Toasts */}
              {saveSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center space-x-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="font-semibold">{saveSuccess}</span>
                </div>
              )}
              {saveError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center space-x-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
                  <span className="font-semibold">{saveError}</span>
                </div>
              )}

              {/* Main Ledger Form */}
              <form onSubmit={handleSaveFinance} className="space-y-4 text-xs">
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Shipping Fee */}
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 font-mono uppercase tracking-wide block">
                      Shipping Fee ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formShippingFee}
                      onChange={(e) => setFormShippingFee(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:ring-1 focus:ring-blue-800 focus:bg-white"
                      required
                    />
                  </div>

                  {/* Packaging Fee */}
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 font-mono uppercase tracking-wide block">
                      Packaging Fee ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPackagingFee}
                      onChange={(e) => setFormPackagingFee(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:ring-1 focus:ring-blue-800 focus:bg-white"
                      required
                    />
                  </div>

                  {/* Pickup Fee */}
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 font-mono uppercase tracking-wide block">
                      Pickup Fee ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPickupFee}
                      onChange={(e) => setFormPickupFee(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:ring-1 focus:ring-blue-800 focus:bg-white"
                      required
                    />
                  </div>

                  {/* Insurance */}
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 font-mono uppercase tracking-wide block">
                      Insurance ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formInsurance}
                      onChange={(e) => setFormInsurance(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:ring-1 focus:ring-blue-800 focus:bg-white"
                      required
                    />
                  </div>

                  {/* Custom Charge */}
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 font-mono uppercase tracking-wide block">
                      Customs Charge ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formCustomCharge}
                      onChange={(e) => setFormCustomCharge(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:ring-1 focus:ring-blue-800 focus:bg-white"
                      required
                    />
                  </div>

                  {/* Discount */}
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 font-mono uppercase tracking-wide block">
                      Discount ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formDiscount}
                      onChange={(e) => setFormDiscount(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:ring-1 focus:ring-blue-800 text-red-600 focus:bg-white font-bold"
                      required
                    />
                  </div>

                  {/* Other Charges */}
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 font-mono uppercase tracking-wide block">
                      Other Charges ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formOtherCharges}
                      onChange={(e) => setFormOtherCharges(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:ring-1 focus:ring-blue-800 focus:bg-white"
                      required
                    />
                  </div>

                  {/* Actual Cost */}
                  <div className="space-y-1">
                    <label className="font-bold text-brand-blue font-mono uppercase tracking-wide block">
                      Actual Cost ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formActualCost}
                      onChange={(e) => setFormActualCost(e.target.value)}
                      className="w-full bg-blue-50/50 border border-blue-200 rounded-lg p-2 font-mono focus:outline-none focus:ring-1 focus:ring-blue-800 focus:bg-white font-bold"
                      required
                    />
                  </div>

                </div>

                <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-3">
                  {/* Payment Status Dropdown */}
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 font-mono uppercase tracking-wide block">
                      Payment Status
                    </label>
                    <select
                      value={formPaymentStatus}
                      onChange={(e) => {
                        const newStatus = e.target.value as ShipmentFinance["paymentStatus"];
                        setFormPaymentStatus(newStatus);
                        // Auto-fill Amount Paid helper
                        if (newStatus === "Paid") {
                          setFormAmountPaid(liveCalculatedFields.totalCharged.toString());
                        } else if (newStatus === "Unpaid") {
                          setFormAmountPaid("0");
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:ring-1 focus:ring-blue-800 focus:bg-white"
                    >
                      <option value="Paid">Paid</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Unpaid">Unpaid</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>

                  {/* Amount Paid */}
                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 font-mono uppercase tracking-wide block">
                      Amount Paid ({getCurrencySymbol()})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formAmountPaid}
                      onChange={(e) => setFormAmountPaid(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono focus:outline-none focus:ring-1 focus:ring-blue-800 focus:bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Submit save button */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full mt-4 bg-brand-blue hover:bg-brand-blue-dark text-white font-mono font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-sm transition-all disabled:opacity-50"
                >
                  <Save className="h-4.5 w-4.5" />
                  <span>{isSaving ? "Synchronizing Cloud..." : "Save Financial Record"}</span>
                </button>

              </form>

            </div>
          ) : (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3 sticky top-4">
              <Receipt className="h-12 w-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700 font-mono uppercase">No Selection Made</h4>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Click on any shipment from the billing registry list to view and configure its financial breakdowns.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
