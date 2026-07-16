import React, { useMemo, useState } from "react";
import * as d3 from "d3";
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell 
} from "recharts";
import { 
  TrendingUp, Users, DollarSign, Package, Calendar, Clock, AlertTriangle, CheckCircle, 
  ChevronRight, ArrowUpRight, ArrowDownRight, Award, ShieldAlert, ShoppingBag, MapPin
} from "lucide-react";
import { Shipment, MILESTONES } from "../types.js";

interface OperationsDashboardProps {
  shipments: Shipment[];
  loading: boolean;
  onSelectShipment: (trackingNumber: string) => void;
}

import { parseShipmentNotesAndFinance } from "../utils/financeUtils.ts";

// 1. Unified Financial Formula Helper
export function calculateShipmentFinancials(shipment: Shipment) {
  const { finance } = parseShipmentNotesAndFinance(shipment);
  return {
    revenue: finance.totalCharged,
    expenses: finance.actualCost,
    profit: finance.profit,
    paymentStatus: finance.paymentStatus,
    amountPaid: finance.amountPaid,
    balance: finance.balance
  };
}

export default function OperationsDashboard({ shipments, loading, onSelectShipment }: OperationsDashboardProps) {
  const [selectedActivityFilter, setSelectedActivityFilter] = useState<"all" | "milestone" | "paused">("all");

  // 2. High-Performance Statistics Rollup (Optimized with useMemo + D3)
  const stats = useMemo(() => {
    if (!shipments || shipments.length === 0) {
      return {
        totalShipments: 0,
        todayShipments: 0,
        pendingShipments: 0,
        deliveredShipments: 0,
        cancelledShipments: 0,
        revenue: 0,
        expenses: 0,
        profit: 0,
        pendingPayments: 0,
        pendingPaymentsCount: 0,
        totalCustomers: 0,
        uniqueSenders: [] as string[]
      };
    }

    const todayStr = new Date().toISOString().split("T")[0]; // "2026-07-16"
    
    // Core Counts
    const totalShipments = shipments.length;
    const todayShipments = shipments.filter(s => s.bookingDate === todayStr).length;
    
    // Pending: Active transit, index is between 0 and 22 inclusive, and not paused/hold
    const pendingShipments = shipments.filter(s => s.currentMilestoneIndex < 23 && !s.isPaused).length;
    
    // Delivered: index is exactly 23
    const deliveredShipments = shipments.filter(s => s.currentMilestoneIndex === 23).length;
    
    // Cancelled / Return to Sender / Abandoned: 43 (Return to Sender), 44 (Abandoned), 45 (Closed)
    const cancelledShipments = shipments.filter(s => s.currentMilestoneIndex === 43 || s.currentMilestoneIndex === 44 || s.currentMilestoneIndex === 45).length;

    // Financial sums using D3 maps
    const financials = shipments.map(s => calculateShipmentFinancials(s));
    const totalRevenue = d3.sum(financials, f => f.revenue);
    const totalExpenses = d3.sum(financials, f => f.expenses);
    const totalProfit = d3.sum(financials, f => f.profit);

    // Pending Payments: shipments with "Unpaid" or "Partially Paid" status, sum of balance
    const pendingPaymentShipments = shipments.filter(s => {
      const { finance } = parseShipmentNotesAndFinance(s);
      return finance.paymentStatus === "Unpaid" || finance.paymentStatus === "Partially Paid";
    });
    const pendingPaymentsAmount = d3.sum(pendingPaymentShipments, s => {
      const { finance } = parseShipmentNotesAndFinance(s);
      return finance.balance;
    });
    const pendingPaymentsCount = pendingPaymentShipments.length;

    // Unique Customers: unique Senders
    const customersSet = new Set(shipments.map(s => s.senderName.trim()));
    const totalCustomers = customersSet.size;

    return {
      totalShipments,
      todayShipments,
      pendingShipments,
      deliveredShipments,
      cancelledShipments,
      revenue: Math.round(totalRevenue * 100) / 100,
      expenses: Math.round(totalExpenses * 100) / 100,
      profit: Math.round(totalProfit * 100) / 100,
      pendingPayments: Math.round(pendingPaymentsAmount * 100) / 100,
      pendingPaymentsCount,
      totalCustomers,
      uniqueSenders: Array.from(customersSet)
    };
  }, [shipments]);

  // 3. Chart Data Grouping & Sorting using D3.js
  const chartData = useMemo(() => {
    if (!shipments || shipments.length === 0) return [];

    // Grouping shipments by booking date using d3.groups
    const grouped = d3.groups(shipments, s => s.bookingDate);
    
    // Sort chronologically
    grouped.sort((a, b) => a[0].localeCompare(b[0]));

    // Format for Recharts AreaChart
    return grouped.map(([date, groupShipments]) => {
      const revenue = d3.sum(groupShipments, s => calculateShipmentFinancials(s).revenue);
      const expenses = d3.sum(groupShipments, s => calculateShipmentFinancials(s).expenses);
      const profit = d3.sum(groupShipments, s => calculateShipmentFinancials(s).profit);
      
      // Formatting date e.g. "2026-06-24" -> "Jun 24"
      let formattedDate = date;
      try {
        const parts = date.split("-");
        if (parts.length === 3) {
          const mIdx = parseInt(parts[1]) - 1;
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          formattedDate = `${months[mIdx]} ${parts[2]}`;
        }
      } catch (e) {}

      return {
        date: formattedDate,
        rawDate: date,
        "Shipment Count": groupShipments.length,
        "Revenue ($)": Math.round(revenue),
        "Expenses ($)": Math.round(expenses),
        "Profit ($)": Math.round(profit)
      };
    });
  }, [shipments]);

  // 4. Geographical Destination Distribution (Donut Chart Data)
  const destinationData = useMemo(() => {
    if (!shipments || shipments.length === 0) return [];

    const grouped = d3.groups(shipments, s => s.destinationCountry);
    return grouped.map(([country, groupShipments]) => {
      const revenue = d3.sum(groupShipments, s => calculateShipmentFinancials(s).revenue);
      return {
        name: country,
        value: groupShipments.length,
        revenue: Math.round(revenue)
      };
    });
  }, [shipments]);

  // COLORS for pie chart slices
  const DEST_COLORS = ["#032B73", "#FFD700", "#10B981", "#8B5CF6", "#F59E0B"];

  // 5. Volume by Service Speed (Bar Chart Data)
  const serviceSpeedData = useMemo(() => {
    if (!shipments || shipments.length === 0) return [];

    const grouped = d3.groups(shipments, s => s.serviceType);
    return grouped.map(([service, groupShipments]) => {
      const revenue = d3.sum(groupShipments, s => calculateShipmentFinancials(s).revenue);
      return {
        service,
        "Shipments": groupShipments.length,
        "Revenue": Math.round(revenue)
      };
    });
  }, [shipments]);

  // 6. Chronological Recent Activities Feed
  const recentActivities = useMemo(() => {
    if (!shipments || shipments.length === 0) return [];

    interface ActivityEvent {
      id: string;
      trackingNumber: string;
      receiverName: string;
      milestoneName: string;
      description: string;
      timestamp: string;
      type: "milestone" | "pause" | "create";
    }

    const events: ActivityEvent[] = [];

    shipments.forEach(s => {
      // Create initial register event
      events.push({
        id: `reg-${s.trackingNumber}`,
        trackingNumber: s.trackingNumber,
        receiverName: s.receiverName,
        milestoneName: "Shipment Created",
        description: `Shipment booked for ${s.receiverName} to ${s.destinationCountry} via ${s.serviceType}.`,
        timestamp: s.bookingDate + "T08:00:00Z",
        type: "create"
      });

      // Gather from milestone history
      s.milestoneHistory?.forEach((m, idx) => {
        events.push({
          id: `mil-${s.trackingNumber}-${m.milestoneIndex}-${idx}`,
          trackingNumber: s.trackingNumber,
          receiverName: s.receiverName,
          milestoneName: m.milestoneName,
          description: m.description,
          timestamp: m.timestamp,
          type: "milestone"
        });
      });

      // Gather pause/unpause status
      if (s.isPaused) {
        events.push({
          id: `pause-${s.trackingNumber}`,
          trackingNumber: s.trackingNumber,
          receiverName: s.receiverName,
          milestoneName: "Placed on Hold",
          description: `Logistics manager suspended active dispatch for cargo parcel.`,
          timestamp: new Date().toISOString(), // Fallback for simulation
          type: "pause"
        });
      }
    });

    // Sort by timestamp descending
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Return the top 15 recent activities
    return events.slice(0, 15);
  }, [shipments]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return recentActivities.filter(act => {
      if (selectedActivityFilter === "all") return true;
      if (selectedActivityFilter === "milestone") return act.type === "milestone";
      if (selectedActivityFilter === "paused") return act.type === "pause";
      return true;
    });
  }, [recentActivities, selectedActivityFilter]);

  // 7. Customers Dashboard List
  const customersList = useMemo(() => {
    if (!shipments || shipments.length === 0) return [];

    const grouped = d3.groups(shipments, s => s.senderName.trim());
    const list = grouped.map(([name, groupShipments]) => {
      const revenue = d3.sum(groupShipments, s => calculateShipmentFinancials(s).revenue);
      const profit = d3.sum(groupShipments, s => calculateShipmentFinancials(s).profit);
      const latestShipment = groupShipments.sort((a, b) => b.bookingDate.localeCompare(a.bookingDate))[0];

      return {
        name,
        totalShipments: groupShipments.length,
        revenue: Math.round(revenue * 100) / 100,
        profit: Math.round(profit * 100) / 100,
        latestDate: latestShipment.bookingDate,
        latestTracking: latestShipment.trackingNumber,
        destination: latestShipment.destinationCountry
      };
    });

    // Sort by revenue descending to highlight top shippers
    return list.sort((a, b) => b.revenue - a.revenue);
  }, [shipments]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Clock className="h-10 w-10 text-blue-800 animate-spin" />
        <p className="text-sm font-mono text-gray-500">Loading secure executive console data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 3x3 Grid of Executive Statistics (Visual Bento Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* TOTAL SHIPMENTS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono block uppercase tracking-wider">Total Shipments</span>
            <p className="text-3xl font-black text-[#032B73] font-mono">{stats.totalShipments}</p>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center">
              <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" />
              <span>Full registry history</span>
            </span>
          </div>
          <div className="p-3 bg-blue-50 text-[#032B73] rounded-xl">
            <Package className="h-6 w-6" />
          </div>
        </div>

        {/* TODAY'S SHIPMENTS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono block uppercase tracking-wider">Today's Shipments</span>
            <p className="text-3xl font-black text-purple-600 font-mono">{stats.todayShipments}</p>
            <span className="text-[10px] text-purple-500 font-medium flex items-center">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              <span>Registered today</span>
            </span>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        {/* PENDING ACTIVE SHIPMENTS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono block uppercase tracking-wider">Pending Shipments</span>
            <p className="text-3xl font-black text-amber-500 font-mono">{stats.pendingShipments}</p>
            <span className="text-[10px] text-gray-400 font-medium">In active transit hub</span>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* DELIVERED SHIPMENTS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono block uppercase tracking-wider">Delivered</span>
            <p className="text-3xl font-black text-emerald-600 font-mono">{stats.deliveredShipments}</p>
            <span className="text-[10px] text-emerald-600 font-bold flex items-center">
              <CheckCircle className="h-3.5 w-3.5 mr-0.5" />
              <span>{stats.totalShipments > 0 ? Math.round((stats.deliveredShipments / stats.totalShipments) * 100) : 0}% Completion Rate</span>
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        {/* CANCELLED SHIPMENTS */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono block uppercase tracking-wider">Cancelled Shipments</span>
            <p className="text-3xl font-black text-red-500 font-mono">{stats.cancelledShipments}</p>
            <span className="text-[10px] text-red-500 font-medium">Abandoned or returned</span>
          </div>
          <div className="p-3 bg-red-50 text-red-500 rounded-xl">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>

        {/* REVENUE */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono block uppercase tracking-wider">Revenue</span>
            <p className="text-3xl font-black text-[#032B73] font-mono">${stats.revenue.toLocaleString()}</p>
            <span className="text-[10px] text-slate-500">Gross billing charges</span>
          </div>
          <div className="p-3 bg-blue-50 text-[#032B73] rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* EXPENSES */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 font-mono block uppercase tracking-wider">Expenses</span>
            <p className="text-3xl font-black text-gray-600 font-mono">${stats.expenses.toLocaleString()}</p>
            <span className="text-[10px] text-slate-400 font-medium">Ops, Customs & Freight cost</span>
          </div>
          <div className="p-3 bg-gray-50 text-gray-500 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>

        {/* PROFIT */}
        <div className="bg-white p-5 rounded-2xl border border-[#FFD700]/30 shadow-xs flex items-center justify-between border-l-4">
          <div className="space-y-1">
            <span className="text-[11px] text-[#032B73] font-mono font-bold block uppercase tracking-wider">Net Profit</span>
            <p className="text-3xl font-black text-emerald-600 font-mono">${stats.profit.toLocaleString()}</p>
            <span className="text-[10px] text-emerald-600 font-semibold">
              Margin: {stats.revenue > 0 ? Math.round((stats.profit / stats.revenue) * 100) : 0}%
            </span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* HIGHLIGHT BOX: PENDING PAYMENTS & CUSTOMERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* PENDING PAYMENTS ALERT CARD */}
        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl p-5 flex items-start space-x-4">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-xl">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="space-y-1 flex-grow">
            <span className="text-xs font-mono text-amber-800 font-bold uppercase block tracking-wider">Outstanding Accounts Receivable</span>
            <h4 className="text-2xl font-black text-amber-900 font-mono">
              ${stats.pendingPayments.toLocaleString()}
            </h4>
            <p className="text-xs text-amber-700 leading-normal">
              Accumulated outstanding billing fees from <strong>{stats.pendingPaymentsCount} shipments</strong> currently flagged on <strong>"Payment Pending"</strong> transit hold. Release packages only after full clearance settlement.
            </p>
          </div>
        </div>

        {/* CUSTOMER DIRECTORY CARD */}
        <div className="bg-blue-50/30 border border-blue-100 rounded-2xl p-5 flex items-start space-x-4">
          <div className="p-3 bg-blue-100 text-blue-800 rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div className="space-y-1 flex-grow">
            <span className="text-xs font-mono text-blue-800 font-bold uppercase block tracking-wider">Client Accounts Directory</span>
            <h4 className="text-2xl font-black text-[#032B73] font-mono">
              {stats.totalCustomers} Active Shippers
            </h4>
            <p className="text-xs text-blue-700 leading-normal">
              Unique vendors, exporters, and merchants shipping weekly batches of African apparel, bulk food, cosmetics, and handcrafted items through Lagos center.
            </p>
          </div>
        </div>

      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FINANCIAL TRENDS AREA CHART (2/3 width) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wide">Financial Ledger Timeline</h4>
              <p className="text-[11px] text-gray-400">Daily gross revenue vs structural operations expenses and net profit</p>
            </div>
            <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-mono text-slate-600 font-bold">
              Grouped by Booking Date
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#032B73" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#032B73" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" tickLine={false} style={{ fontSize: '10px', fontFamily: 'monospace' }} stroke="#94A3B8" />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px', fontFamily: 'monospace' }} stroke="#94A3B8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderRadius: '8px', 
                    border: 'none', 
                    color: '#fff', 
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }} 
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="Revenue ($)" stroke="#032B73" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" />
                <Area type="monotone" dataKey="Profit ($)" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorProfit)" />
                <Area type="monotone" dataKey="Expenses ($)" stroke="#94A3B8" strokeWidth={1.5} fill="none" strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GEOGRAPHICAL DONUT CHART (1/3 width) */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wide">Destination Volume</h4>
            <p className="text-[11px] text-gray-400">Shipment shares by target country markets</p>
          </div>

          <div className="h-[200px] flex justify-center items-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={destinationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {destinationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={DEST_COLORS[index % DEST_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderRadius: '8px', 
                    border: 'none', 
                    color: '#fff', 
                    fontSize: '11px' 
                  }} 
                  formatter={(value, name, props: any) => [`${value} parcels ($${props.payload.revenue.toLocaleString()})`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Absolute Centered Total Widget */}
            <div className="absolute text-center">
              <span className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">Total</span>
              <p className="text-2xl font-black text-[#032B73] font-mono leading-none mt-0.5">{stats.totalShipments}</p>
            </div>
          </div>

          {/* Donut Legend */}
          <div className="space-y-1.5 pt-2">
            {destinationData.map((d, index) => (
              <div key={d.name} className="flex justify-between items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DEST_COLORS[index % DEST_COLORS.length] }} />
                  <span className="font-medium text-gray-700">{d.name}</span>
                </div>
                <div className="font-mono text-gray-500 font-bold">
                  {d.value} ({Math.round((d.value / stats.totalShipments) * 100)}%)
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* SERVICE SPEED & TOP EXPORTERS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SERVICE TYPE SPEED volume BAR CHART */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wide">Service Type Staging</h4>
            <p className="text-[11px] text-gray-400">Total volume and revenue generated per speed priority level</p>
          </div>

          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceSpeedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="service" tickLine={false} style={{ fontSize: '11px', fontWeight: 'bold' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px', fontFamily: 'monospace' }} stroke="#94A3B8" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1E293B', 
                    borderRadius: '8px', 
                    border: 'none', 
                    color: '#fff', 
                    fontSize: '11px' 
                  }} 
                />
                <Bar dataKey="Shipments" fill="#032B73" radius={[4, 4, 0, 0]} barSize={35} />
                <Bar dataKey="Revenue" fill="#FFD700" radius={[4, 4, 0, 0]} barSize={35} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOP MERCHANTS & EXPORTERS LEADERBOARD */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wide">Client Ledger & Volume Rankings</h4>
              <p className="text-[11px] text-gray-400">Top-generating exporters and merchants ranked by gross billing value</p>
            </div>
            <span className="text-[10px] bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded border border-blue-100 uppercase tracking-widest font-mono font-bold">
              VIP Accounts
            </span>
          </div>

          <div className="divide-y divide-gray-100 overflow-y-auto max-h-[250px] pr-1">
            {customersList.map((cust, idx) => (
              <div key={cust.name} className="py-2.5 flex items-center justify-between hover:bg-slate-50/50 transition-colors px-1 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xs text-slate-700 font-mono">
                    {idx + 1}
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-gray-800 leading-snug">{cust.name}</h5>
                    <p className="text-[10px] text-gray-400 flex items-center">
                      <MapPin className="h-3 w-3 mr-0.5" />
                      <span>Last to {cust.destination} ({cust.latestDate})</span>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-black text-[#032B73] font-mono">${cust.revenue.toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-600 font-bold font-mono">
                    {cust.totalShipments} {cust.totalShipments === 1 ? "parcel" : "parcels"} • ${cust.profit.toLocaleString()} Net
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RECENT OPERATIONAL ACTIVITIES FEED */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h4 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wide">Operational Logs & Milestone Events</h4>
            <p className="text-[11px] text-gray-400">Chronological history of security updates, customs clearance, transit milestones, and pauses</p>
          </div>

          {/* Activity Filters */}
          <div className="flex bg-slate-100 p-1 rounded-lg self-start">
            <button
              onClick={() => setSelectedActivityFilter("all")}
              className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition-all ${
                selectedActivityFilter === "all" ? "bg-white text-[#032B73] shadow-xs" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              All Events ({recentActivities.length})
            </button>
            <button
              onClick={() => setSelectedActivityFilter("milestone")}
              className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition-all ${
                selectedActivityFilter === "milestone" ? "bg-white text-blue-800 shadow-xs" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Milestones
            </button>
            <button
              onClick={() => setSelectedActivityFilter("paused")}
              className={`px-3 py-1 text-[10px] font-mono font-bold rounded-md transition-all ${
                selectedActivityFilter === "paused" ? "bg-white text-red-700 shadow-xs" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              On Hold
            </button>
          </div>
        </div>

        {/* Timelines Feed list */}
        <div className="border border-slate-100 rounded-xl overflow-hidden max-h-[350px] overflow-y-auto divide-y divide-slate-50">
          {filteredActivities.length > 0 ? (
            filteredActivities.map((act) => {
              const dateObj = new Date(act.timestamp);
              const isToday = dateObj.toDateString() === new Date().toDateString();
              const timeFormatted = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const dateFormatted = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

              return (
                <div 
                  key={act.id} 
                  className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                >
                  <div className="flex items-start space-x-3">
                    
                    {/* Badge Indicator based on type */}
                    <div className="pt-0.5">
                      <span className={`inline-block h-2 w-2 rounded-full mt-1.5 ${
                        act.type === "pause" 
                          ? "bg-red-500 animate-ping" 
                          : act.type === "create" 
                            ? "bg-purple-500" 
                            : "bg-blue-600"
                      }`} />
                    </div>

                    <div className="space-y-0.5">
                      
                      {/* Event description */}
                      <div className="flex flex-wrap items-baseline gap-1.5">
                        <span 
                          onClick={() => onSelectShipment(act.trackingNumber)}
                          className="font-mono font-bold text-[#032B73] hover:underline cursor-pointer"
                        >
                          {act.trackingNumber}
                        </span>
                        <span className="font-semibold text-gray-800">{act.milestoneName}</span>
                      </div>

                      <p className="text-gray-500 text-[11px] leading-relaxed max-w-2xl">{act.description}</p>
                    </div>

                  </div>

                  {/* Datetime stamp on the right */}
                  <div className="sm:text-right shrink-0 font-mono text-[10px] text-gray-400">
                    <span className="block font-bold text-gray-600">
                      {isToday ? "Today" : dateFormatted}
                    </span>
                    <span>{timeFormatted}</span>
                  </div>

                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-gray-400 font-mono text-xs">
              No recent logs match the selected filter.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
