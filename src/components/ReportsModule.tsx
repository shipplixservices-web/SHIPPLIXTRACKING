import React, { useState, useMemo } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell 
} from "recharts";
import { 
  FileText, Download, Calendar, MapPin, Users, AlertCircle, TrendingUp, Percent, 
  DollarSign, Package, Filter, CheckCircle2, ShieldAlert, RefreshCw, UserCheck
} from "lucide-react";
import { Shipment, MILESTONES } from "../types.js";
import { parseShipmentNotesAndFinance } from "../utils/financeUtils.ts";
import { formatCurrency, getCurrencySymbol } from "../utils/currencyUtils.ts";
import { shipmentService } from "../services/shipmentService.ts";
import { jsPDF } from "jspdf";
import "jspdf-autotable";

interface ReportsModuleProps {
  shipments: Shipment[];
  loading: boolean;
}

type ReportType = "revenue" | "shipment" | "customer" | "outstanding" | "profit";

export default function ReportsModule({ shipments, loading }: ReportsModuleProps) {
  const symbol = getCurrencySymbol();
  // 1. Report Type Selection
  const [activeReport, setActiveReport] = useState<ReportType>("revenue");

  // 2. Filter States
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterOrigin, setFilterOrigin] = useState<string>("all");
  const [filterDest, setFilterDest] = useState<string>("all");
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterShipmentStatus, setFilterShipmentStatus] = useState<string>("all");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string>("all");
  const [filterService, setFilterService] = useState<string>("all");

  // 3. Reset Filters
  const handleResetFilters = () => {
    setStartDate("");
    setEndDate("");
    setFilterOrigin("all");
    setFilterDest("all");
    setFilterCustomer("");
    setFilterShipmentStatus("all");
    setFilterPaymentStatus("all");
    setFilterService("all");
  };

  // 4. Extract unique drop-down options from current shipments dataset
  const uniqueOrigins = useMemo(() => {
    const list = shipments.map(s => s.originCountry).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [shipments]);

  const uniqueDestinations = useMemo(() => {
    const list = shipments.map(s => s.destinationCountry).filter(Boolean);
    return Array.from(new Set(list)).sort();
  }, [shipments]);

  // Helper: map a shipment's current index to status category
  const getShipmentStatusCategory = (s: Shipment): string => {
    if (s.isPaused) return "On Hold";
    if (s.currentMilestoneIndex === 23) return "Delivered";
    if (s.currentMilestoneIndex === 0) return "Pending Verification";
    return "In Transit";
  };

  // 5. Apply filters dynamically to compile the parsed report dataset
  const reportDataset = useMemo(() => {
    return shipments.map(s => {
      const { notes, finance } = parseShipmentNotesAndFinance(s);
      return {
        shipment: s,
        notes,
        finance,
        statusCategory: getShipmentStatusCategory(s)
      };
    }).filter(item => {
      // Date Filter
      if (startDate && item.shipment.bookingDate < startDate) return false;
      if (endDate && item.shipment.bookingDate > endDate) return false;

      // Origin Country Filter
      if (filterOrigin !== "all" && item.shipment.originCountry !== filterOrigin) return false;

      // Destination Country Filter
      if (filterDest !== "all" && item.shipment.destinationCountry !== filterDest) return false;

      // Customer Filter (Match sender or receiver name)
      if (filterCustomer.trim()) {
        const query = filterCustomer.toLowerCase();
        const matchesSender = item.shipment.senderName.toLowerCase().includes(query);
        const matchesReceiver = item.shipment.receiverName.toLowerCase().includes(query);
        if (!matchesSender && !matchesReceiver) return false;
      }

      // Shipment Status Filter
      if (filterShipmentStatus !== "all") {
        if (filterShipmentStatus === "On Hold" && !item.shipment.isPaused) return false;
        if (filterShipmentStatus === "Delivered" && item.shipment.currentMilestoneIndex !== 23) return false;
        if (filterShipmentStatus === "Pending Verification" && item.shipment.currentMilestoneIndex !== 0) return false;
        if (filterShipmentStatus === "In Transit" && (item.shipment.currentMilestoneIndex === 23 || item.shipment.currentMilestoneIndex === 0 || item.shipment.isPaused)) return false;
      }

      // Payment Status Filter
      if (filterPaymentStatus !== "all" && item.finance.paymentStatus !== filterPaymentStatus) return false;

      // Service Speed Filter
      if (filterService !== "all" && item.shipment.serviceType !== filterService) return false;

      return true;
    });
  }, [
    shipments, startDate, endDate, filterOrigin, filterDest, 
    filterCustomer, filterShipmentStatus, filterPaymentStatus, filterService
  ]);

  // 5.5 Memoized and Grouped Customer Summary List
  const customerSummaryList = useMemo(() => {
    const customerMap: { [name: string]: { name: string; bookings: number; totalWeight: number; spend: number; paid: number; balance: number; lastDate: string } } = {};
    reportDataset.forEach(item => {
      const name = item.shipment.senderName;
      if (!customerMap[name]) {
        customerMap[name] = { name, bookings: 0, totalWeight: 0, spend: 0, paid: 0, balance: 0, lastDate: "" };
      }
      customerMap[name].bookings += 1;
      customerMap[name].totalWeight += item.shipment.weight;
      customerMap[name].spend += item.finance.totalCharged;
      customerMap[name].paid += item.finance.amountPaid;
      customerMap[name].balance += item.finance.balance;
      if (!customerMap[name].lastDate || item.shipment.bookingDate > customerMap[name].lastDate) {
        customerMap[name].lastDate = item.shipment.bookingDate;
      }
    });
    return Object.values(customerMap).sort((a, b) => b.spend - a.spend);
  }, [reportDataset]);

  // 6. High-level metric card aggregates based on the active report type
  const reportMetrics = useMemo(() => {
    const totalCount = reportDataset.length;
    
    // Default zero structures
    if (totalCount === 0) {
      return {
        card1: { title: "Total Items", value: "0", detail: "No records found" },
        card2: { title: "Total Revenue", value: "$0.00", detail: "No transactions" },
        card3: { title: "Total Net Profit", value: "$0.00", detail: "0% margin" },
        card4: { title: "Balance Receivable", value: "$0.00", detail: "0 accounts" }
      };
    }

    const totalRevenue = reportDataset.reduce((sum, item) => sum + item.finance.totalCharged, 0);
    const totalCost = reportDataset.reduce((sum, item) => sum + item.finance.actualCost, 0);
    const totalProfit = reportDataset.reduce((sum, item) => sum + item.finance.profit, 0);
    const totalPaid = reportDataset.reduce((sum, item) => sum + item.finance.amountPaid, 0);
    const totalBalance = reportDataset.reduce((sum, item) => sum + item.finance.balance, 0);

    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgOrderVal = totalRevenue / totalCount;

    if (activeReport === "revenue") {
      return {
        card1: { title: "Gross Revenue", value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: "Accumulated billings" },
        card2: { title: "Collected Cash", value: `$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: `${Math.round((totalPaid / totalRevenue) * 100)}% realization rate` },
        card3: { title: "Accounts Receivable", value: `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: `${reportDataset.filter(i => i.finance.balance > 0).length} pending balances` },
        card4: { title: "Avg Order Value", value: `$${avgOrderVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: `Across ${totalCount} active shipments` }
      };
    } else if (activeReport === "shipment") {
      const deliveredCount = reportDataset.filter(i => i.shipment.currentMilestoneIndex === 23).length;
      const onHoldCount = reportDataset.filter(i => i.shipment.isPaused).length;
      const totalWeight = reportDataset.reduce((sum, item) => sum + item.shipment.weight, 0);
      const avgWeight = totalWeight / totalCount;

      return {
        card1: { title: "Total Bookings", value: totalCount.toString(), detail: "Shipments in context" },
        card2: { title: "Delivered Status", value: `${deliveredCount} pkgs`, detail: `${Math.round((deliveredCount / totalCount) * 100)}% delivery rate` },
        card3: { title: "Hold Exceptions", value: `${onHoldCount} items`, detail: `${Math.round((onHoldCount / totalCount) * 100)}% of dataset` },
        card4: { title: "Aggregate Weight", value: `${totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} KG`, detail: `Avg: ${avgWeight.toFixed(1)} KG per booking` }
      };
    } else if (activeReport === "customer") {
      // Group spend by senderName
      const clientMap: { [name: string]: { count: number; spend: number } } = {};
      reportDataset.forEach(i => {
        const name = i.shipment.senderName;
        if (!clientMap[name]) clientMap[name] = { count: 0, spend: 0 };
        clientMap[name].count += 1;
        clientMap[name].spend += i.finance.totalCharged;
      });

      const uniqueCustomersCount = Object.keys(clientMap).length;
      let topClientName = "N/A";
      let topClientSpend = 0;
      Object.entries(clientMap).forEach(([name, data]) => {
        if (data.spend > topClientSpend) {
          topClientSpend = data.spend;
          topClientName = name;
        }
      });

      return {
        card1: { title: "Active Customers", value: uniqueCustomersCount.toString(), detail: "Unique consignors" },
        card2: { title: "Top Sender", value: topClientName.split("(")[0].trim(), detail: `Spent $${topClientSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
        card3: { title: "Avg Booking/Client", value: (totalCount / (uniqueCustomersCount || 1)).toFixed(1), detail: "Bookings per sender" },
        card4: { title: "Client Gross billing", value: `$${totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, detail: `Avg spend: $${(totalRevenue / (uniqueCustomersCount || 1)).toLocaleString(undefined, { maximumFractionDigits: 0 })}` }
      };
    } else if (activeReport === "outstanding") {
      const outstandingItems = reportDataset.filter(i => i.finance.balance > 0);
      const outstandingCount = outstandingItems.length;
      const maxOutstanding = outstandingCount > 0 ? Math.max(...outstandingItems.map(i => i.finance.balance)) : 0;

      return {
        card1: { title: "Total Unsettled", value: `$${totalBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: "Arrears balance due" },
        card2: { title: "Pending Invoices", value: `${outstandingCount} bills`, detail: `${Math.round((outstandingCount / totalCount) * 100)}% of total orders` },
        card3: { title: "Collected Portion", value: `$${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: `${Math.round((totalPaid / (totalRevenue || 1)) * 100)}% of total context` },
        card4: { title: "Peak Receivables", value: `$${maxOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, detail: "Highest single exposure" }
      };
    } else { // profit
      return {
        card1: { title: "Total Billings", value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: "Gross gross revenue" },
        card2: { title: "Operating Expenses", value: `$${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: "Logistics cost & handlers" },
        card3: { title: "Net Op Profit", value: `$${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, detail: "Gross profit generated" },
        card4: { title: "Profit Margin %", value: `${profitMargin.toFixed(1)}%`, detail: `Net yield on sales` }
      };
    }
  }, [reportDataset, activeReport]);

  // 7. Recharts Visualization Data Compiler
  const chartData = useMemo(() => {
    if (reportDataset.length === 0) return [];

    if (activeReport === "revenue" || activeReport === "profit") {
      // Group by date or service type
      const serviceMap: { [service: string]: { revenue: number; cost: number; profit: number; count: number } } = {
        "Express": { revenue: 0, cost: 0, profit: 0, count: 0 },
        "Standard": { revenue: 0, cost: 0, profit: 0, count: 0 },
        "Economy": { revenue: 0, cost: 0, profit: 0, count: 0 }
      };

      reportDataset.forEach(i => {
        const type = i.shipment.serviceType || "Standard";
        if (serviceMap[type]) {
          serviceMap[type].revenue += i.finance.totalCharged;
          serviceMap[type].cost += i.finance.actualCost;
          serviceMap[type].profit += i.finance.profit;
          serviceMap[type].count += 1;
        }
      });

      return Object.entries(serviceMap).map(([name, data]) => ({
        name,
        Revenue: Math.round(data.revenue * 100) / 100,
        Cost: Math.round(data.cost * 100) / 100,
        Profit: Math.round(data.profit * 100) / 100,
        Bookings: data.count
      }));
    } else if (activeReport === "shipment") {
      // Group by Status category for visual breakdowns
      const statusMap: { [status: string]: number } = {
        "Delivered": 0,
        "In Transit": 0,
        "Pending Verification": 0,
        "On Hold": 0
      };

      reportDataset.forEach(i => {
        const cat = i.statusCategory;
        if (statusMap[cat] !== undefined) {
          statusMap[cat] += 1;
        } else {
          statusMap[cat] = 1;
        }
      });

      return Object.entries(statusMap).map(([name, value]) => ({
        name,
        value
      })).filter(i => i.value > 0);
    } else if (activeReport === "customer") {
      // Top 5 spend customers
      const clientSpend: { [name: string]: number } = {};
      reportDataset.forEach(i => {
        const name = i.shipment.senderName.split("(")[0].trim();
        clientSpend[name] = (clientSpend[name] || 0) + i.finance.totalCharged;
      });

      return Object.entries(clientSpend)
        .map(([name, value]) => ({ name, spend: Math.round(value) }))
        .sort((a, b) => b.spend - a.spend)
        .slice(0, 5);
    } else { // outstanding
      // Group unpaid balances by destination country
      const destBalance: { [country: string]: { balance: number; paid: number } } = {};
      reportDataset.forEach(i => {
        const dest = i.shipment.destinationCountry;
        if (!destBalance[dest]) destBalance[dest] = { balance: 0, paid: 0 };
        destBalance[dest].balance += i.finance.balance;
        destBalance[dest].paid += i.finance.amountPaid;
      });

      return Object.entries(destBalance)
        .map(([name, data]) => ({
          name,
          "Balance Due": Math.round(data.balance * 100) / 100,
          "Amount Paid": Math.round(data.paid * 100) / 100
        }))
        .sort((a, b) => b["Balance Due"] - a["Balance Due"])
        .slice(0, 5);
    }
  }, [reportDataset, activeReport]);

  const COLORS = ["#032B73", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

  // 8. Export Handlers (CSV, Excel-optimized, PDF)
  
  // EXPORT 1: CSV Export
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeReport === "revenue") {
      headers = ["Tracking Number", "Reference", "Booking Date", "Sender", "Receiver", "Payment Status", "Shipping Fee ($)", "Total Charged ($)", "Amount Paid ($)", "Balance Due ($)"];
      rows = reportDataset.map(item => [
        item.shipment.trackingNumber,
        item.shipment.referenceNumber,
        item.shipment.bookingDate,
        item.shipment.senderName,
        item.shipment.receiverName,
        item.finance.paymentStatus,
        item.finance.shippingFee.toString(),
        item.finance.totalCharged.toString(),
        item.finance.amountPaid.toString(),
        item.finance.balance.toString()
      ]);
    } else if (activeReport === "shipment") {
      headers = ["Tracking Number", "Reference", "Booking Date", "Sender", "Receiver", "Origin", "Destination", "Service Type", "Weight (KG)", "Packages", "Status"];
      rows = reportDataset.map(item => [
        item.shipment.trackingNumber,
        item.shipment.referenceNumber,
        item.shipment.bookingDate,
        item.shipment.senderName,
        item.shipment.receiverName,
        item.shipment.originCountry,
        item.shipment.destinationCountry,
        item.shipment.serviceType,
        item.shipment.weight.toString(),
        item.shipment.numberOfPackages.toString(),
        item.statusCategory
      ]);
    } else if (activeReport === "customer") {
      // Grouped by customer
      const customerMap: { [name: string]: any } = {};
      reportDataset.forEach(item => {
        const name = item.shipment.senderName;
        if (!customerMap[name]) {
          customerMap[name] = { bookings: 0, totalWeight: 0, spend: 0, paid: 0, balance: 0, lastDate: "" };
        }
        customerMap[name].bookings += 1;
        customerMap[name].totalWeight += item.shipment.weight;
        customerMap[name].spend += item.finance.totalCharged;
        customerMap[name].paid += item.finance.amountPaid;
        customerMap[name].balance += item.finance.balance;
        if (!customerMap[name].lastDate || item.shipment.bookingDate > customerMap[name].lastDate) {
          customerMap[name].lastDate = item.shipment.bookingDate;
        }
      });

      headers = ["Customer Name", "Total Bookings", "Aggregate Weight (KG)", "Total Billing ($)", "Total Paid ($)", "Outstanding Balance ($)", "Last Booking Date"];
      rows = Object.entries(customerMap).map(([name, data]: [string, any]) => [
        name,
        data.bookings.toString(),
        data.totalWeight.toFixed(2),
        data.spend.toFixed(2),
        data.paid.toFixed(2),
        data.balance.toFixed(2),
        data.lastDate
      ]);
    } else if (activeReport === "outstanding") {
      headers = ["Tracking Number", "Customer Name", "Booking Date", "Service Type", "Total Billings ($)", "Amount Paid ($)", "Outstanding Arrears ($)", "Payment Status"];
      rows = reportDataset.filter(i => i.finance.balance > 0).map(item => [
        item.shipment.trackingNumber,
        item.shipment.senderName,
        item.shipment.bookingDate,
        item.shipment.serviceType,
        item.finance.totalCharged.toString(),
        item.finance.amountPaid.toString(),
        item.finance.balance.toString(),
        item.finance.paymentStatus
      ]);
    } else { // profit
      headers = ["Tracking Number", "Customer Name", "Booking Date", "Service Type", "Revenue ($)", "Operating Expense ($)", "Net Profit ($)", "Profit Margin (%)"];
      rows = reportDataset.map(item => {
        const margin = item.finance.totalCharged > 0 ? ((item.finance.profit / item.finance.totalCharged) * 100).toFixed(1) : "0.0";
        return [
          item.shipment.trackingNumber,
          item.shipment.senderName,
          item.shipment.bookingDate,
          item.shipment.serviceType,
          item.finance.totalCharged.toString(),
          item.finance.actualCost.toString(),
          item.finance.profit.toString(),
          margin + "%"
        ];
      });
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shipplix_${activeReport}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Record action
    shipmentService.logAdminAction(
      "Generate Report",
      "-",
      `Exported ${activeReport.toUpperCase()} report with ${reportDataset.length} records to CSV format`
    );
  };

  // EXPORT 2: Excel Optimized Tab Delimited HTML Export
  const handleExportExcel = () => {
    // Generate an HTML structure with Excel MIME type that supports cell styling
    let tableHeaders = "";
    let tableRows = "";
    let reportTitle = `${activeReport.toUpperCase()} REPORT - SHIPPLIX LEDGER`;

    if (activeReport === "revenue") {
      tableHeaders = `<tr><th>Tracking Number</th><th>Reference</th><th>Booking Date</th><th>Sender</th><th>Receiver</th><th>Payment Status</th><th>Shipping Fee (${symbol})</th><th>Total Charged (${symbol})</th><th>Amount Paid (${symbol})</th><th>Balance Due (${symbol})</th></tr>`;
      tableRows = reportDataset.map(item => `
        <tr>
          <td>${item.shipment.trackingNumber}</td>
          <td>${item.shipment.referenceNumber}</td>
          <td>${item.shipment.bookingDate}</td>
          <td>${item.shipment.senderName}</td>
          <td>${item.shipment.receiverName}</td>
          <td>${item.finance.paymentStatus}</td>
          <td>${item.finance.shippingFee}</td>
          <td>${item.finance.totalCharged}</td>
          <td>${item.finance.amountPaid}</td>
          <td>${item.finance.balance}</td>
        </tr>
      `).join("");
    } else if (activeReport === "shipment") {
      tableHeaders = "<tr><th>Tracking Number</th><th>Reference</th><th>Booking Date</th><th>Sender</th><th>Receiver</th><th>Origin</th><th>Destination</th><th>Service Type</th><th>Weight (KG)</th><th>Packages</th><th>Status</th></tr>";
      tableRows = reportDataset.map(item => `
        <tr>
          <td>${item.shipment.trackingNumber}</td>
          <td>${item.shipment.referenceNumber}</td>
          <td>${item.shipment.bookingDate}</td>
          <td>${item.shipment.senderName}</td>
          <td>${item.shipment.receiverName}</td>
          <td>${item.shipment.originCountry}</td>
          <td>${item.shipment.destinationCountry}</td>
          <td>${item.shipment.serviceType}</td>
          <td>${item.shipment.weight}</td>
          <td>${item.shipment.numberOfPackages}</td>
          <td>${item.statusCategory}</td>
        </tr>
      `).join("");
    } else if (activeReport === "customer") {
      const customerMap: { [name: string]: any } = {};
      reportDataset.forEach(item => {
        const name = item.shipment.senderName;
        if (!customerMap[name]) {
          customerMap[name] = { bookings: 0, totalWeight: 0, spend: 0, paid: 0, balance: 0, lastDate: "" };
        }
        customerMap[name].bookings += 1;
        customerMap[name].totalWeight += item.shipment.weight;
        customerMap[name].spend += item.finance.totalCharged;
        customerMap[name].paid += item.finance.amountPaid;
        customerMap[name].balance += item.finance.balance;
        if (!customerMap[name].lastDate || item.shipment.bookingDate > customerMap[name].lastDate) {
          customerMap[name].lastDate = item.shipment.bookingDate;
        }
      });

      tableHeaders = `<tr><th>Customer Name</th><th>Total Bookings</th><th>Aggregate Weight (KG)</th><th>Total Billing (${symbol})</th><th>Total Paid (${symbol})</th><th>Outstanding Balance (${symbol})</th><th>Last Booking Date</th></tr>`;
      tableRows = Object.entries(customerMap).map(([name, data]: [string, any]) => `
        <tr>
          <td>${name}</td>
          <td>${data.bookings}</td>
          <td>${data.totalWeight.toFixed(2)}</td>
          <td>${data.spend.toFixed(2)}</td>
          <td>${data.paid.toFixed(2)}</td>
          <td>${data.balance.toFixed(2)}</td>
          <td>${data.lastDate}</td>
        </tr>
      `).join("");
    } else if (activeReport === "outstanding") {
      tableHeaders = `<tr><th>Tracking Number</th><th>Customer Name</th><th>Booking Date</th><th>Service Type</th><th>Total Billings (${symbol})</th><th>Amount Paid (${symbol})</th><th>Outstanding Arrears (${symbol})</th><th>Payment Status</th></tr>`;
      tableRows = reportDataset.filter(i => i.finance.balance > 0).map(item => `
        <tr>
          <td>${item.shipment.trackingNumber}</td>
          <td>${item.shipment.senderName}</td>
          <td>${item.shipment.bookingDate}</td>
          <td>${item.shipment.serviceType}</td>
          <td>${item.finance.totalCharged}</td>
          <td>${item.finance.amountPaid}</td>
          <td>${item.finance.balance}</td>
          <td>${item.finance.paymentStatus}</td>
        </tr>
      `).join("");
    } else { // profit
      tableHeaders = `<tr><th>Tracking Number</th><th>Customer Name</th><th>Booking Date</th><th>Service Type</th><th>Revenue (${symbol})</th><th>Operating Expense (${symbol})</th><th>Net Profit (${symbol})</th><th>Profit Margin (%)</th></tr>`;
      tableRows = reportDataset.map(item => {
        const margin = item.finance.totalCharged > 0 ? ((item.finance.profit / item.finance.totalCharged) * 100).toFixed(1) : "0.0";
        return `
          <tr>
            <td>${item.shipment.trackingNumber}</td>
            <td>${item.shipment.senderName}</td>
            <td>${item.shipment.bookingDate}</td>
            <td>${item.shipment.serviceType}</td>
            <td>${item.finance.totalCharged}</td>
            <td>${item.finance.actualCost}</td>
            <td>${item.finance.profit}</td>
            <td>${margin}%</td>
          </tr>
        `;
      }).join("");
    }

    const htmlTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <style>
          table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
          th { background-color: #032B73; color: white; font-weight: bold; padding: 8px; border: 1px solid #ddd; }
          td { padding: 6px; border: 1px solid #ddd; text-align: left; }
          .title { font-size: 16px; font-weight: bold; margin-bottom: 12px; color: #032B73; font-family: sans-serif; }
          .meta { font-size: 11px; color: #555; margin-bottom: 20px; font-family: sans-serif; }
        </style>
      </head>
      <body>
        <div class="title">${reportTitle}</div>
        <div class="meta">Generated: ${new Date().toLocaleString()} | Filtered Count: ${reportDataset.length} records</div>
        <table>
          <thead>${tableHeaders}</thead>
          <tbody>${tableRows}</tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([htmlTemplate], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `shipplix_${activeReport}_report_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Record action
    shipmentService.logAdminAction(
      "Generate Report",
      "-",
      `Exported ${activeReport.toUpperCase()} report with ${reportDataset.length} records to Excel format`
    );
  };

  // EXPORT 3: PDF Generation (jspdf & jspdf-autotable)
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4"
    });

    // Brand styling
    const primaryColor = [3, 43, 115]; // Navy
    const secondaryColor = [80, 80, 80];

    // Document header banner
    doc.setFillColor(3, 43, 115);
    doc.rect(0, 0, 297, 25, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SHIPPLIX PREMIUM LOGISTICS", 14, 11);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("ADMINISTRATIVE LEDGER PORTAL & STRATEGIC INSIGHTS", 14, 18);

    doc.setFontSize(8);
    doc.text(`GENERATED: ${new Date().toLocaleString().toUpperCase()}`, 220, 15);

    // Report title section
    doc.setTextColor(3, 43, 115);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const reportLabel = `${activeReport.toUpperCase()} REPORT - INTEL REGISTER`;
    doc.text(reportLabel, 14, 34);

    // Horizontal Rule
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(14, 38, 283, 38);

    // Stats quick snapshot blocks
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(`METRICS SNAPSHOT:`, 14, 45);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`${reportMetrics.card1.title}: ${reportMetrics.card1.value}  |  ${reportMetrics.card2.title}: ${reportMetrics.card2.value}  |  ${reportMetrics.card3.title}: ${reportMetrics.card3.value}  |  ${reportMetrics.card4.title}: ${reportMetrics.card4.value}`, 50, 45);

    // Build table columns and rows dynamically
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    if (activeReport === "revenue") {
      tableHeaders = ["Tracking ID", "Booking Date", "Sender", "Receiver", "Pay Status", "Base Fee", "Extra Fees", "Discount", "Total Rev", "Paid"];
      tableRows = reportDataset.map(item => [
        item.shipment.trackingNumber,
        item.shipment.bookingDate,
        item.shipment.senderName.split("(")[0].trim(),
        item.shipment.receiverName,
        item.finance.paymentStatus,
        `${symbol}${item.finance.shippingFee.toFixed(2)}`,
        `${symbol}${(item.finance.packagingFee + item.finance.pickupFee + item.finance.insurance + item.finance.customCharge + item.finance.otherCharges).toFixed(2)}`,
        `${symbol}${item.finance.discount.toFixed(2)}`,
        `${symbol}${item.finance.totalCharged.toFixed(2)}`,
        `${symbol}${item.finance.amountPaid.toFixed(2)}`
      ]);
    } else if (activeReport === "shipment") {
      tableHeaders = ["Tracking ID", "Booking Date", "Sender", "Receiver", "Origin", "Destination", "Service", "Weight", "Packages", "Status"];
      tableRows = reportDataset.map(item => [
        item.shipment.trackingNumber,
        item.shipment.bookingDate,
        item.shipment.senderName.split("(")[0].trim(),
        item.shipment.receiverName,
        item.shipment.originCountry,
        item.shipment.destinationCountry,
        item.shipment.serviceType,
        `${item.shipment.weight} KG`,
        item.shipment.numberOfPackages.toString(),
        item.statusCategory
      ]);
    } else if (activeReport === "customer") {
      const customerMap: { [name: string]: any } = {};
      reportDataset.forEach(item => {
        const name = item.shipment.senderName;
        if (!customerMap[name]) {
          customerMap[name] = { bookings: 0, totalWeight: 0, spend: 0, paid: 0, balance: 0, lastDate: "" };
        }
        customerMap[name].bookings += 1;
        customerMap[name].totalWeight += item.shipment.weight;
        customerMap[name].spend += item.finance.totalCharged;
        customerMap[name].paid += item.finance.amountPaid;
        customerMap[name].balance += item.finance.balance;
        if (!customerMap[name].lastDate || item.shipment.bookingDate > customerMap[name].lastDate) {
          customerMap[name].lastDate = item.shipment.bookingDate;
        }
      });

      tableHeaders = ["Customer Name", "Total Bookings", "Aggregate Weight (KG)", "Total Spend", "Total Paid", "Outstanding Arrears", "Last Booking Date"];
      tableRows = Object.entries(customerMap).map(([name, data]: [string, any]) => [
        name,
        data.bookings.toString(),
        data.totalWeight.toFixed(1),
        `${symbol}${data.spend.toFixed(2)}`,
        `${symbol}${data.paid.toFixed(2)}`,
        `${symbol}${data.balance.toFixed(2)}`,
        data.lastDate
      ]);
    } else if (activeReport === "outstanding") {
      tableHeaders = ["Tracking ID", "Customer Name", "Booking Date", "Service Speed", "Total Billing", "Cash Collected", "Outstanding Balance", "Pay Status"];
      tableRows = reportDataset.filter(i => i.finance.balance > 0).map(item => [
        item.shipment.trackingNumber,
        item.shipment.senderName.split("(")[0].trim(),
        item.shipment.bookingDate,
        item.shipment.serviceType,
        `${symbol}${item.finance.totalCharged.toFixed(2)}`,
        `${symbol}${item.finance.amountPaid.toFixed(2)}`,
        `${symbol}${item.finance.balance.toFixed(2)}`,
        item.finance.paymentStatus
      ]);
    } else { // profit
      tableHeaders = ["Tracking ID", "Customer Name", "Booking Date", "Service Speed", "Gross Billing", "Operating Cost", "Net Profit", "Margin %"];
      tableRows = reportDataset.map(item => {
        const margin = item.finance.totalCharged > 0 ? ((item.finance.profit / item.finance.totalCharged) * 100).toFixed(1) : "0.0";
        return [
          item.shipment.trackingNumber,
          item.shipment.senderName.split("(")[0].trim(),
          item.shipment.bookingDate,
          item.shipment.serviceType,
          `${symbol}${item.finance.totalCharged.toFixed(2)}`,
          `${symbol}${item.finance.actualCost.toFixed(2)}`,
          `${symbol}${item.finance.profit.toFixed(2)}`,
          margin + "%"
        ];
      });
    }

    // Generate AutoTable
    // @ts-ignore
    doc.autoTable({
      head: [tableHeaders],
      body: tableRows,
      startY: 50,
      theme: "striped",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: "bold",
        halign: "left"
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [50, 50, 50],
        cellPadding: 2.5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { fontStyle: "bold" } // Make Tracking ID or first column bold
      },
      didDrawPage: (data: any) => {
        // Footer pagination
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `SHIPPLIX SECURITY PROTOCOL - STRICTLY CONFIDENTIAL - PAGE ${data.pageNumber}`,
          14,
          205
        );
        doc.text(
          `SHIPPLIX DIGITAL RECONCILIATION SYSTEMS - INTEL-REPORT ENGINE`,
          220,
          205
        );
      }
    });

    // Save File
    doc.save(`shipplix_${activeReport}_report_${new Date().toISOString().split('T')[0]}.pdf`);

    // Record action
    shipmentService.logAdminAction(
      "Generate Report",
      "-",
      `Exported ${activeReport.toUpperCase()} report with ${reportDataset.length} records to PDF format`
    );
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: REPORT SELECTOR BUTTONS */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-50 border border-slate-100 p-2 rounded-2xl">
        <button
          onClick={() => { setActiveReport("revenue"); handleResetFilters(); }}
          className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all ${
            activeReport === "revenue" 
              ? "bg-[#032B73] text-white shadow-xs" 
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <DollarSign className="h-4 w-4" />
          <span>Revenue Report</span>
        </button>

        <button
          onClick={() => { setActiveReport("shipment"); handleResetFilters(); }}
          className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all ${
            activeReport === "shipment" 
              ? "bg-[#032B73] text-white shadow-xs" 
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Package className="h-4 w-4" />
          <span>Shipment Report</span>
        </button>

        <button
          onClick={() => { setActiveReport("customer"); handleResetFilters(); }}
          className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all ${
            activeReport === "customer" 
              ? "bg-[#032B73] text-white shadow-xs" 
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Customer Report</span>
        </button>

        <button
          onClick={() => { setActiveReport("outstanding"); handleResetFilters(); }}
          className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all ${
            activeReport === "outstanding" 
              ? "bg-[#032B73] text-white shadow-xs" 
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <AlertCircle className="h-4 w-4" />
          <span>Outstanding Payment</span>
        </button>

        <button
          onClick={() => { setActiveReport("profit"); handleResetFilters(); }}
          className={`flex items-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-mono font-bold transition-all ${
            activeReport === "profit" 
              ? "bg-[#032B73] text-white shadow-xs" 
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Percent className="h-4 w-4" />
          <span>Profit Report</span>
        </button>
      </div>

      {/* SECTION 2: REPORT-SPECIFIC FILTERS CONTROL BAR */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-[#032B73]" />
            <h4 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wide">
              Configure Report Filter Matrix
            </h4>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-[10px] font-mono text-[#032B73] hover:underline font-bold flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reset Matrix</span>
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="font-bold text-gray-500 block uppercase tracking-wider text-[10px]">
              Start Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pl-8 text-xs focus:outline-none focus:ring-1 focus:ring-blue-800"
              />
            </div>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="font-bold text-gray-500 block uppercase tracking-wider text-[10px]">
              End Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pl-8 text-xs focus:outline-none focus:ring-1 focus:ring-blue-800"
              />
            </div>
          </div>

          {/* Country (Origin) */}
          <div className="space-y-1">
            <label className="font-bold text-gray-500 block uppercase tracking-wider text-[10px]">
              Country (Origin)
            </label>
            <select
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-800"
            >
              <option value="all">All Origins</option>
              {uniqueOrigins.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <label className="font-bold text-gray-500 block uppercase tracking-wider text-[10px]">
              Destination
            </label>
            <select
              value={filterDest}
              onChange={(e) => setFilterDest(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-800"
            >
              <option value="all">All Destinations</option>
              {uniqueDestinations.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Customer */}
          <div className="space-y-1">
            <label className="font-bold text-gray-500 block uppercase tracking-wider text-[10px]">
              Customer / Client Name
            </label>
            <div className="relative">
              <Users className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Client..."
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 pl-8 focus:outline-none focus:ring-1 focus:ring-blue-800"
              />
            </div>
          </div>

          {/* Shipment Status */}
          <div className="space-y-1">
            <label className="font-bold text-gray-500 block uppercase tracking-wider text-[10px]">
              Shipment Status
            </label>
            <select
              value={filterShipmentStatus}
              onChange={(e) => setFilterShipmentStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-800"
            >
              <option value="all">All Statuses</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="On Hold">On Hold</option>
            </select>
          </div>

          {/* Payment Status */}
          <div className="space-y-1">
            <label className="font-bold text-gray-500 block uppercase tracking-wider text-[10px]">
              Payment Status
            </label>
            <select
              value={filterPaymentStatus}
              onChange={(e) => setFilterPaymentStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-800"
            >
              <option value="all">All Payment Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          {/* Service */}
          <div className="space-y-1">
            <label className="font-bold text-gray-500 block uppercase tracking-wider text-[10px]">
              Service Speed
            </label>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-800"
            >
              <option value="all">All Service Speeds</option>
              <option value="Express">Express</option>
              <option value="Standard">Standard</option>
              <option value="Economy">Economy</option>
            </select>
          </div>
        </div>
      </div>

      {/* SECTION 3: METRIC SNAPSHOT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] text-gray-400 font-mono block uppercase tracking-wider">
            {reportMetrics.card1.title}
          </span>
          <p className="text-xl font-black text-[#032B73] font-mono mt-1">
            {reportMetrics.card1.value}
          </p>
          <span className="text-[9px] text-slate-500 font-mono block mt-1">
            {reportMetrics.card1.detail}
          </span>
        </div>

        {/* CARD 2 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] text-gray-400 font-mono block uppercase tracking-wider">
            {reportMetrics.card2.title}
          </span>
          <p className="text-xl font-black text-slate-700 font-mono mt-1">
            {reportMetrics.card2.value}
          </p>
          <span className="text-[9px] text-slate-400 font-mono block mt-1">
            {reportMetrics.card2.detail}
          </span>
        </div>

        {/* CARD 3 */}
        <div className="bg-white p-5 rounded-2xl border border-l-4 border-l-[#FFD700] border-gray-200 shadow-xs">
          <span className="text-[10px] text-emerald-800 font-mono block uppercase tracking-wider font-bold">
            {reportMetrics.card3.title}
          </span>
          <p className="text-xl font-black text-emerald-600 font-mono mt-1">
            {reportMetrics.card3.value}
          </p>
          <span className="text-[9px] text-emerald-600 font-bold block mt-1">
            {reportMetrics.card3.detail}
          </span>
        </div>

        {/* CARD 4 */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
          <span className="text-[10px] text-gray-400 font-mono block uppercase tracking-wider">
            {reportMetrics.card4.title}
          </span>
          <p className="text-xl font-black text-blue-600 font-mono mt-1">
            {reportMetrics.card4.value}
          </p>
          <span className="text-[9px] text-blue-500 font-mono block mt-1">
            {reportMetrics.card4.detail}
          </span>
        </div>
      </div>

      {/* SECTION 4: CHARTS AND VISUALIZATIONS */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
          <h4 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-3 mb-4">
            Intel Visualization Engine
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {activeReport === "revenue" ? (
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#032B73" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#032B73" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} />
                  <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                  <Area name={`Revenue (${symbol})`} type="monotone" dataKey="Revenue" stroke="#032B73" fillOpacity={1} fill="url(#colorRev)" />
                </AreaChart>
              ) : activeReport === "profit" ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} />
                  <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                  <Bar dataKey="Revenue" name={`Revenue (${symbol})`} fill="#032B73" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Cost" name={`Cost (${symbol})`} fill="#94A3B8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" name={`Profit (${symbol})`} fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : activeReport === "shipment" ? (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} layout="horizontal" verticalAlign="bottom" align="center" />
                </PieChart>
              ) : activeReport === "customer" ? (
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontFamily: "monospace" }} width={100} />
                  <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Bar dataKey="spend" name={`Gross Billings (${symbol})`} fill="#032B73" radius={[0, 4, 4, 0]} />
                </BarChart>
              ) : ( // outstanding
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "monospace" }} />
                  <YAxis tick={{ fontSize: 10, fontFamily: "monospace" }} />
                  <Tooltip contentStyle={{ fontSize: 11, fontFamily: "monospace" }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontFamily: "monospace" }} />
                  <Bar dataKey="Amount Paid" name={`Amount Paid (${symbol})`} fill="#10B981" stackId="a" />
                  <Bar dataKey="Balance Due" name={`Balance Due (${symbol})`} fill="#EF4444" stackId="a" />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* SECTION 5: REPORT ACTION BAR */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 font-mono">
        <div className="text-center md:text-left space-y-1">
          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wide">
            Intel Ledger Exporter
          </h4>
          <p className="text-[11px] text-slate-300">
            Active Dataset Context: <span className="text-white font-bold">{reportDataset.length}</span> matching shipment files
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 text-xs">
          {/* Export PDF */}
          <button
            onClick={handleExportPDF}
            className="bg-[#032B73] hover:bg-blue-900 border border-blue-800 text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <FileText className="h-4 w-4 text-amber-400" />
            <span>Export to PDF</span>
          </button>

          {/* Export Excel */}
          <button
            onClick={handleExportExcel}
            className="bg-emerald-700 hover:bg-emerald-800 border border-emerald-600 text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-emerald-300" />
            <span>Export to Excel</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Download className="h-4 w-4 text-slate-300" />
            <span>Export to CSV</span>
          </button>
        </div>
      </div>

      {/* SECTION 6: STRUCTURED REPORT TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {activeReport === "revenue" && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 px-4">Tracking Number</th>
                  <th className="py-3 px-4">Booking Date</th>
                  <th className="py-3 px-4">Customer Sender</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-right">Base Shipping</th>
                  <th className="py-3 px-4 text-right">Extra Charges</th>
                  <th className="py-3 px-4 text-right">Discounts</th>
                  <th className="py-3 px-4 text-right">Total Billings</th>
                  <th className="py-3 px-4 text-right">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportDataset.length > 0 ? (
                  reportDataset.map((item) => {
                    let pBadge = "bg-gray-100 text-gray-800";
                    if (item.finance.paymentStatus === "Paid") pBadge = "bg-emerald-100 text-emerald-800 font-bold";
                    else if (item.finance.paymentStatus === "Partially Paid") pBadge = "bg-amber-100 text-amber-800 font-bold";
                    else if (item.finance.paymentStatus === "Unpaid") pBadge = "bg-red-100 text-red-800 font-bold";
                    else if (item.finance.paymentStatus === "Refunded") pBadge = "bg-slate-150 text-slate-700";

                    const extraCharges = item.finance.packagingFee + item.finance.pickupFee + item.finance.insurance + item.finance.customCharge + item.finance.otherCharges;

                    return (
                      <tr key={item.shipment.trackingNumber} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#032B73]">
                          {item.shipment.trackingNumber}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-600">
                          {item.shipment.bookingDate}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-800 truncate max-w-[150px]">
                          {item.shipment.senderName}
                        </td>
                        <td className="py-3 px-4 font-mono">
                          <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full ${pBadge}`}>
                            {item.finance.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {formatCurrency(item.finance.shippingFee)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-700">
                          {formatCurrency(extraCharges)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-red-500 font-bold">
                          {item.finance.discount > 0 ? `-${formatCurrency(item.finance.discount)}` : formatCurrency(0)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-900">
                          {formatCurrency(item.finance.totalCharged)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600">
                          {formatCurrency(item.finance.amountPaid)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400 font-mono text-xs">
                      No matching transaction files found for the given criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeReport === "shipment" && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 px-4">Tracking Number</th>
                  <th className="py-3 px-4">Booking Date</th>
                  <th className="py-3 px-4">Consignor (Shipper)</th>
                  <th className="py-3 px-4">Receiver (Consignee)</th>
                  <th className="py-3 px-4">Route Info</th>
                  <th className="py-3 px-4">Service Speed</th>
                  <th className="py-3 px-4">Cargo weight</th>
                  <th className="py-3 px-4">Packages</th>
                  <th className="py-3 px-4">Logistics Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportDataset.length > 0 ? (
                  reportDataset.map((item) => {
                    let sBadge = "bg-blue-100 text-blue-800 border-blue-200";
                    if (item.shipment.currentMilestoneIndex === 23) sBadge = "bg-emerald-100 text-emerald-800 font-bold border-emerald-200";
                    else if (item.shipment.isPaused) sBadge = "bg-red-100 text-red-800 font-bold border-red-200 animate-pulse";

                    return (
                      <tr key={item.shipment.trackingNumber} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#032B73]">
                          {item.shipment.trackingNumber}
                          <span className="text-[9px] text-gray-400 block">REF: {item.shipment.referenceNumber}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-600">
                          {item.shipment.bookingDate}
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-800">
                          {item.shipment.senderName}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-700">
                          {item.shipment.receiverName}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-700">
                          <span className="text-gray-400">From:</span> {item.shipment.originCountry} <br/>
                          <span className="text-gray-400">To:</span> {item.shipment.destinationCountry}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold uppercase text-[9px]">
                            {item.shipment.serviceType}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {item.shipment.weight} KG
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {item.shipment.numberOfPackages} Pcs
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] border ${sBadge}`}>
                            {item.shipment.isPaused ? "On Hold" : MILESTONES[item.shipment.currentMilestoneIndex].name}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400 font-mono text-xs">
                      No matching shipment ledger files found for the given criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeReport === "customer" && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 px-4">Consignor / Customer Name</th>
                  <th className="py-3 px-4 text-center">Total Shipments Booked</th>
                  <th className="py-3 px-4 text-right">Aggregate Weight (KG)</th>
                  <th className="py-3 px-4 text-right">Gross Billing Revenue</th>
                  <th className="py-3 px-4 text-right">Settled Amount Paid</th>
                  <th className="py-3 px-4 text-right text-red-500">Outstanding balance</th>
                  <th className="py-3 px-4 text-right">Average Spend Per Booking</th>
                  <th className="py-3 px-4 text-center">Last Booking Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customerSummaryList.length > 0 ? (
                  customerSummaryList.map((customer) => {
                    const avgSpend = customer.spend / customer.bookings;
                    return (
                      <tr key={customer.name} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-[#032B73]">
                          {customer.name}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-800">
                          {customer.bookings}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                          {customer.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} KG
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-black text-slate-900">
                          {formatCurrency(customer.spend)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-600">
                          {formatCurrency(customer.paid)}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-mono font-bold ${customer.balance > 0 ? "text-red-500 bg-red-50/10" : "text-gray-500"}`}>
                          {formatCurrency(customer.balance)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                          {formatCurrency(avgSpend)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono text-gray-500">
                          {customer.lastDate}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-mono text-xs">
                      No matching customer records found in the given filter context.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeReport === "outstanding" && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 px-4">Tracking Number</th>
                  <th className="py-3 px-4">Customer Consignor</th>
                  <th className="py-3 px-4">Booking Date</th>
                  <th className="py-3 px-4">Service Type</th>
                  <th className="py-3 px-4 text-right">Total Billings</th>
                  <th className="py-3 px-4 text-right">Amount Settled Paid</th>
                  <th className="py-3 px-4 text-right text-red-500">Outstanding Arrears Balance</th>
                  <th className="py-3 px-4">Current Milestone Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportDataset.filter(i => i.finance.balance > 0).length > 0 ? (
                  reportDataset.filter(i => i.finance.balance > 0).map((item) => (
                    <tr key={item.shipment.trackingNumber} className="hover:bg-red-50/5 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#032B73]">
                        {item.shipment.trackingNumber}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {item.shipment.senderName}
                        <span className="text-[9px] text-gray-400 font-mono block">Recv: {item.shipment.receiverName} • {item.shipment.phoneNumber}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600">
                        {item.shipment.bookingDate}
                      </td>
                      <td className="py-3 px-4 font-semibold font-mono uppercase text-[10px] text-slate-500">
                        {item.shipment.serviceType}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">
                        {formatCurrency(item.finance.totalCharged)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-600">
                        {formatCurrency(item.finance.amountPaid)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-red-600 bg-red-50/10">
                        {formatCurrency(item.finance.balance)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-[10px] font-bold text-slate-700">
                          {item.shipment.isPaused ? "On Hold" : MILESTONES[item.shipment.currentMilestoneIndex].name}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-emerald-600 font-mono text-xs font-bold bg-emerald-50/20">
                      Excellent! No outstanding accounts receivable found under the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {activeReport === "profit" && (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-100 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wide">
                  <th className="py-3 px-4">Tracking Number</th>
                  <th className="py-3 px-4">Customer Sender</th>
                  <th className="py-3 px-4">Booking Date</th>
                  <th className="py-3 px-4">Service Speed</th>
                  <th className="py-3 px-4 text-right">Total Billings (Revenue)</th>
                  <th className="py-3 px-4 text-right">Actual Operational Cost</th>
                  <th className="py-3 px-4 text-right text-emerald-600">Net Profit Generated</th>
                  <th className="py-3 px-4 text-right">Profit Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportDataset.length > 0 ? (
                  reportDataset.map((item) => {
                    const margin = item.finance.totalCharged > 0 ? (item.finance.profit / item.finance.totalCharged) * 100 : 0;
                    return (
                      <tr key={item.shipment.trackingNumber} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-[#032B73]">
                          {item.shipment.trackingNumber}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-900">
                          {item.shipment.senderName}
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-600">
                          {item.shipment.bookingDate}
                        </td>
                        <td className="py-3 px-4 font-semibold font-mono uppercase text-[10px] text-slate-500">
                          {item.shipment.serviceType}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-slate-800">
                          {formatCurrency(item.finance.totalCharged)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          {formatCurrency(item.finance.actualCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-black text-emerald-600 bg-emerald-50/10">
                          {formatCurrency(item.finance.profit)}
                        </td>
                        <td className={`py-3 px-4 text-right font-mono font-bold ${margin >= 40 ? "text-emerald-600" : margin >= 20 ? "text-blue-600" : "text-amber-600"}`}>
                          {margin.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400 font-mono text-xs">
                      No matching profitability data found in the current selection context.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

    </div>
  );
}
