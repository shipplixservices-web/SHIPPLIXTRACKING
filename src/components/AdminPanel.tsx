import React, { useState, useEffect, useMemo } from "react";
import { 
  Shield, Key, LayoutDashboard, Plus, Eye, Edit2, Trash2, Pause, Play, Download, Search, 
  MapPin, Scale, Package, Calendar, RefreshCw, Send, AlertCircle, CheckCircle2, Sliders, Database, Save, LogOut, Receipt,
  FileText, Settings
} from "lucide-react";
import { Shipment, MILESTONES } from "../types.js";
import ShipplixLogo from "./ShipplixLogo.tsx";
import { authService, AdminUser } from "../services/authService.ts";
import { useShipments } from "../hooks/useShipments.ts";
import { exportShipmentsToCSV } from "../utils/csvUtils.ts";
import OperationsDashboard from "./OperationsDashboard.tsx";
import FinanceModule from "./FinanceModule.tsx";
import ReportsModule from "./ReportsModule.tsx";
import SettingsModule from "./SettingsModule.tsx";
import { getAppSettings } from "../utils/settingsUtils.ts";
import { ShipmentManagementHub } from "./ShipmentManagementHub.tsx";

interface AdminPanelProps {
  onTrackingRequest: (trackingNumber: string) => void;
}

export default function AdminPanel({ onTrackingRequest }: AdminPanelProps) {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);

  // Check initial local session on mount
  useEffect(() => {
    const session = authService.getLocalSession();
    if (session) {
      setAdminUser(session);
      setIsAuthenticated(true);
    }
  }, []);

  // Use the modular shipment dashboard hook
  const {
    shipments,
    loading,
    actionLoading,
    systemMessage,
    stats,
    searchQuery,
    setSearchQuery,
    filterDestination,
    setFilterDestination,
    filterService,
    setFilterService,
    filterStatus,
    setFilterStatus,
    filteredShipments,
    indexedShipments,
    uniqueDestinations,
    registerShipment,
    updateShipmentDetails,
    updateMilestone,
    deleteShipment,
    togglePauseStatus,
    triggerBackup,
    showSystemMessage,
    updateStatusAndHealth,
    addInternalNote,
    uploadDocument,
    addPaymentTransaction
  } = useShipments(isAuthenticated);

  // Component local states for UI Navigation & Forms
  const [activeTab, setActiveTab] = useState<"dashboard" | "finance" | "reports" | "fleet" | "add" | "update" | "backups" | "settings">("dashboard");
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);

  // Global Command Search States
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");
  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return [];
    return indexedShipments
      .filter(item => item.searchString.includes(q))
      .map(item => ({
        shipment: item.shipment,
        matchedFields: item.searchString
      }));
  }, [indexedShipments, globalSearchQuery]);

  // Load settings
  const settings = getAppSettings();

  const [newShipment, setNewShipment] = useState({
    trackingNumber: "",
    referenceNumber: "",
    senderName: "",
    receiverName: "",
    phoneNumber: "",
    originCountry: settings.countries.supportedOrigins[0] || "Nigeria",
    destinationCountry: settings.countries.supportedDestinations[0] || "United States",
    weight: "10.0",
    numberOfPackages: "1",
    serviceType: "Express" as const,
    bookingDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    shipmentNotes: "",
    portGateway: ""
  });

  const [milestoneUpdate, setMilestoneUpdate] = useState({
    milestoneIndex: 0,
    customDescription: ""
  });

  // Dynamic visual theme listener
  useEffect(() => {
    const applyTheme = () => {
      const activeSettings = getAppSettings();
      const theme = activeSettings.theme.themeName;
      let primaryColor = "#032B73";
      let primaryHover = "#1e40af";
      let secondaryColor = "#ffd700";

      if (theme === "Cosmic Indigo") {
        primaryColor = "#4F46E5";
        primaryHover = "#4338ca";
        secondaryColor = "#c084fc";
      } else if (theme === "Teal Forest") {
        primaryColor = "#0D9488";
        primaryHover = "#0f766e";
        secondaryColor = "#34d399";
      }

      let styleEl = document.getElementById("shipplix-theme-overrides");
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "shipplix-theme-overrides";
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `
        /* Dynamic Theme overrides */
        .text-\\[\\#032B73\\] { color: ${primaryColor} !important; }
        .bg-\\[\\#032B73\\] { background-color: ${primaryColor} !important; }
        .hover\\:bg-blue-900:hover { background-color: ${primaryHover} !important; }
        .border-\\[\\#032B73\\] { border-color: ${primaryColor} !important; }
        .focus\\:ring-\\[\\#032B73\\]:focus { --tw-ring-color: ${primaryColor} !important; }
        .focus\\:ring-2:focus { --tw-ring-color: ${primaryColor} !important; }
        .text-\\[\\#FFD700\\] { color: ${secondaryColor} !important; }
        .border-b-2.border-\\[\\#032B73\\] { border-color: ${primaryColor} !important; text-color: ${primaryColor} !important; }
      `;
    };

    applyTheme();
    window.addEventListener("shipplixSettingsChanged", applyTheme);
    return () => {
      window.removeEventListener("shipplixSettingsChanged", applyTheme);
    };
  }, []);

  // Automatically select first shipment as default selected to match old behavior
  useEffect(() => {
    if (shipments.length > 0 && !selectedShipment) {
      setSelectedShipment(shipments[0]);
      setMilestoneUpdate({
        milestoneIndex: shipments[0].currentMilestoneIndex,
        customDescription: MILESTONES[shipments[0].currentMilestoneIndex].description
      });
    }
  }, [shipments, selectedShipment]);

  // Find matching active shipment from fleet array to prevent stale local selection state
  const activeShipment = selectedShipment 
    ? shipments.find(s => s.trackingNumber.toUpperCase() === selectedShipment.trackingNumber.toUpperCase()) || selectedShipment 
    : null;

  // Auth Handlers using the AuthService
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const user = await authService.login(email, password);
      setAdminUser(user);
      setIsAuthenticated(true);
    } catch (err: any) {
      setAuthError(err.message || "Failed to authenticate. Connection error.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setAdminUser(null);
    setSelectedShipment(null);
    await authService.logout();
  };

  // Generate unique ID in the form matching the old action
  const handleGenerateTracking = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, "");
    const randomFour = Math.floor(1000 + Math.random() * 9000);
    const generatedId = `SPX-${dateStr}-${randomFour}`;
    setNewShipment(prev => ({ ...prev, trackingNumber: generatedId }));
  };

  // Create Shipment Form Submission
  const handleCreateShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trackingNum = newShipment.trackingNumber.trim().toUpperCase();
    if (!trackingNum) {
      showSystemMessage("error", "Tracking number is required.");
      return;
    }

    const success = await registerShipment({
      trackingNumber: trackingNum,
      referenceNumber: newShipment.referenceNumber,
      senderName: newShipment.senderName,
      receiverName: newShipment.receiverName,
      phoneNumber: newShipment.phoneNumber,
      originCountry: newShipment.originCountry,
      destinationCountry: newShipment.destinationCountry,
      weight: newShipment.weight,
      numberOfPackages: newShipment.numberOfPackages,
      serviceType: newShipment.serviceType,
      bookingDate: newShipment.bookingDate,
      expectedDeliveryDate: newShipment.expectedDeliveryDate,
      shipmentNotes: newShipment.shipmentNotes,
      portGateway: newShipment.portGateway
    });

    if (success) {
      // Reset Form State
      setNewShipment({
        trackingNumber: "",
        referenceNumber: "",
        senderName: "",
        receiverName: "",
        phoneNumber: "",
        originCountry: "Nigeria",
        destinationCountry: "United States",
        weight: "10.0",
        numberOfPackages: "1",
        serviceType: "Express",
        bookingDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        shipmentNotes: "",
        portGateway: ""
      });
      setActiveTab("fleet");
    }
  };

  // Edit Core Fields Form Submission
  const handleUpdateCoreShipmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;

    const success = await updateShipmentDetails(editingShipment);
    if (success) {
      if (selectedShipment && selectedShipment.trackingNumber.toUpperCase() === editingShipment.trackingNumber.toUpperCase()) {
        setSelectedShipment(editingShipment);
      }
      setEditingShipment(null);
    }
  };

  // Milestone Update Form Submission
  const handleUpdateMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    const updated = await updateMilestone(selectedShipment, milestoneUpdate.milestoneIndex, milestoneUpdate.customDescription);
    if (updated) {
      setSelectedShipment(updated);
    }
  };

  // Delete Action
  const handleDeleteAction = async (trackingNumber: string) => {
    const success = await deleteShipment(trackingNumber);
    if (success && selectedShipment?.trackingNumber === trackingNumber) {
      setSelectedShipment(null);
    }
  };

  // Hold / Resume Toggle Action
  const handlePauseToggleAction = async (shipment: Shipment) => {
    const updated = await togglePauseStatus(shipment);
    if (updated && selectedShipment?.trackingNumber === shipment.trackingNumber) {
      setSelectedShipment(updated);
    }
  };

  // Export CSV helper
  const handleExportCSV = () => {
    const result = exportShipmentsToCSV(shipments);
    if (result.success) {
      showSystemMessage("success", result.message);
    } else {
      showSystemMessage("error", result.message);
    }
  };

  // Set selected shipment for milestone update control tab
  const selectForMilestoneUpdate = (sh: Shipment) => {
    setSelectedShipment(sh);
    setMilestoneUpdate({
      milestoneIndex: sh.currentMilestoneIndex,
      customDescription: MILESTONES[sh.currentMilestoneIndex].description
    });
    setActiveTab("update");
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 animate-[fadeIn_0.3s_ease-out]">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          {/* Brand header banner */}
          <div className="bg-[#032B73] text-white p-6 text-center border-b-4 border-[#FFD700] flex flex-col items-center">
            <ShipplixLogo variant="banner" textColor="text-white" className="mb-2" />
            <h2 className="text-sm font-black tracking-widest uppercase text-[#FFD700] mt-3">SECURED LOGISTICS CONSOLE</h2>
            <p className="text-[10px] text-blue-200 uppercase tracking-wider mt-0.5">Authorized Administrative Access Only</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4">
            {authError && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded p-3 text-xs text-red-700 flex items-start space-x-2">
                <AlertCircle className="h-4.5 w-4.5 text-red-500 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Administrator Email Address</label>
              <input
                id="admin-email-input"
                type="text"
                placeholder="e.g. shipplixservices@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#032B73]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Administrative Password</label>
              <input
                id="admin-password-input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#032B73]"
              />
            </div>

            <button
              id="admin-login-submit"
              type="submit"
              disabled={authLoading}
              className="w-full bg-[#032B73] text-[#FFD700] hover:bg-blue-900 active:scale-98 transition-all font-black text-sm py-3 rounded-lg flex items-center justify-center space-x-2 shadow text-center"
            >
              {authLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  <span>Authenticate Admin</span>
                </>
              )}
            </button>

            {/* Secure Admin Note */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3.5 text-[11px] text-slate-600 space-y-1 leading-normal font-mono mt-4">
              <span className="font-bold uppercase block text-slate-800 flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-[#032B73] mr-2 animate-pulse" />
                SECURE ACCESS REQUIRED
              </span>
              <span>Authorized personnel only. Please input your secure administrator username/email and credentials to log in.</span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Admin Title Info bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-[10px] font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100 uppercase tracking-widest font-mono">
            SHIPP-CONSOLE LIVE PORTAL
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-[#032B73]">
            Logistics Command Center
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Signed in as: <strong className="text-gray-700">{adminUser?.email}</strong>
          </p>
        </div>

        <button
          id="admin-logout-btn"
          onClick={handleLogout}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out Session</span>
        </button>
      </div>

      {/* GLOBAL COMMAND SEARCH BAR */}
      <div className="bg-[#032B73] rounded-xl border border-blue-800 p-5 shadow-sm space-y-3 relative text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <span className="text-[10px] font-bold text-[#FFD700] bg-white/10 px-2.5 py-0.5 rounded border border-white/15 uppercase tracking-widest font-mono">
              ⚡ INSTANT GLOBAL FLEET SEARCH
            </span>
            <h3 className="text-sm font-bold text-white mt-1">
              Global Search Engine
            </h3>
            <p className="text-xs text-blue-100/80">
              Locate any shipment by Tracking Number, Reference Number, Customer Name, Phone, Email, Destination, Country, or Receiver Name instantly.
            </p>
          </div>
          
          <div className="text-right text-xs text-blue-200 font-mono hidden sm:block">
            ACTIVE FLEET ENTRIES: <span className="text-[#FFD700] font-bold">{indexedShipments.length}</span>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-blue-300" />
          <input
            id="global-command-search"
            type="text"
            placeholder="Search shipments..."
            value={globalSearchQuery}
            onChange={(e) => setGlobalSearchQuery(e.target.value)}
            className="w-full bg-white/10 hover:bg-white/15 focus:bg-white text-white focus:text-slate-900 pl-10 pr-16 py-3.5 rounded-lg border border-white/10 focus:border-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FFD700] transition-all placeholder-blue-200/60 focus:placeholder-slate-400 font-medium"
          />
          {globalSearchQuery && (
            <button
              onClick={() => setGlobalSearchQuery("")}
              className="absolute right-3.5 top-2.5 text-blue-300 hover:text-white focus:outline-none text-xs bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-md font-bold transition-all"
            >
              Clear
            </button>
          )}
        </div>

        {/* Floating results panel */}
        {globalSearchQuery.trim() !== "" && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 bg-white rounded-xl border border-gray-200 shadow-2xl max-h-[380px] overflow-y-auto divide-y divide-gray-100 text-slate-900 animate-[fadeIn_0.15s_ease-out]">
            <div className="bg-slate-50 px-4 py-2.5 flex justify-between items-center text-[10px] text-gray-500 font-mono font-bold border-b border-gray-100 tracking-wider">
              <span>MATCHING SHIPMENTS ({globalSearchResults.length} FOUND)</span>
              <span>ESC / CLEAR TO DISMISS</span>
            </div>
            
            {globalSearchResults.length === 0 ? (
              <div className="p-8 text-center text-gray-500 space-y-1">
                <p className="text-sm font-bold text-[#032B73]">No matching shipments found</p>
                <p className="text-xs text-gray-400">Try searching with other details like phone, destination, or reference number</p>
              </div>
            ) : (
              globalSearchResults.map(({ shipment }) => {
                const isDelivered = shipment.currentMilestoneIndex === 23;
                const isPaused = shipment.isPaused;
                
                return (
                  <div 
                    key={shipment.trackingNumber} 
                    className="p-3.5 sm:p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-1.5 flex-grow min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#032B73] bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded">
                          {shipment.trackingNumber}
                        </span>
                        <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          REF: {shipment.referenceNumber}
                        </span>
                        
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          isPaused
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : isDelivered
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-blue-100 text-blue-800 border border-blue-200"
                        }`}>
                          {isPaused ? "ON HOLD" : isDelivered ? "DELIVERED" : `STAGE ${shipment.currentMilestoneIndex + 1}`}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
                        <p className="text-gray-700 truncate">
                          <strong className="text-gray-900 font-bold">Customer:</strong> {shipment.senderName}
                        </p>
                        <p className="text-gray-700 truncate">
                          <strong className="text-gray-900 font-bold">Receiver:</strong> {shipment.receiverName}
                        </p>
                        <p className="text-gray-500 font-mono text-[11px]">
                          <strong className="font-sans text-gray-900 font-bold">Phone:</strong> {shipment.phoneNumber}
                        </p>
                        <p className="text-gray-500 font-mono text-[11px] truncate">
                          <strong className="font-sans text-gray-900 font-bold">Email:</strong> {shipment.notifications?.find(n => n.type === 'email')?.recipient || "None"}
                        </p>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[10px] text-gray-600 font-semibold bg-gray-50 p-1.5 rounded border border-gray-100 w-fit mt-1">
                        <span className="bg-[#032B73] text-white font-mono text-[9px] px-1.5 py-0.5 rounded uppercase">ROUTE</span>
                        <span>{shipment.originCountry} → {shipment.destinationCountry} {shipment.portGateway ? `(${shipment.portGateway})` : ""}</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-row md:flex-col lg:flex-row items-stretch md:items-end gap-2 shrink-0 w-full md:w-auto">
                      <button
                        onClick={() => {
                          setSelectedShipment(shipment);
                          setActiveTab("update");
                          setGlobalSearchQuery("");
                        }}
                        className="flex-1 md:flex-none text-center bg-[#032B73] hover:bg-blue-900 text-white font-bold text-xs px-4 py-2.5 rounded-lg transition-all flex items-center justify-center space-x-1 shadow-sm"
                      >
                        <Sliders className="h-3.5 w-3.5" />
                        <span>Transit Control</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          onTrackingRequest(shipment.trackingNumber);
                          setGlobalSearchQuery("");
                        }}
                        className="flex-1 md:flex-none text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs px-3 py-2.5 rounded-lg transition-all flex items-center justify-center space-x-1 border border-gray-200"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Public Track</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* System Toast Alerts */}
      {systemMessage && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center space-x-3 border ${
          systemMessage.type === "success" 
            ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
            : "bg-red-50 text-red-800 border-red-200"
        } animate-bounce`}>
          {systemMessage.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
          )}
          <span className="text-xs font-semibold font-mono">{systemMessage.text}</span>
        </div>
      )}

      {/* Overview Statistics widgets */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2">
          <span className="text-[10px] text-gray-400 font-mono block uppercase">Total Shipments</span>
          <p className="text-2xl sm:text-3xl font-black text-[#032B73] font-mono">
            {loading ? "..." : stats.totalShipments}
          </p>
          <div className="h-1 w-full bg-blue-100 rounded-full">
            <div className="h-full bg-[#032B73] rounded-full" style={{ width: '100%' }} />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2">
          <span className="text-[10px] text-gray-400 font-mono block uppercase">Delivered</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">
            {loading ? "..." : stats.deliveredShipments}
          </p>
          <div className="h-1 w-full bg-emerald-100 rounded-full">
            <div 
              className="h-full bg-emerald-500 rounded-full" 
              style={{ width: `${stats.totalShipments > 0 ? (stats.deliveredShipments / stats.totalShipments) * 100 : 0}%` }} 
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2">
          <span className="text-[10px] text-gray-400 font-mono block uppercase">In Transit</span>
          <p className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">
            {loading ? "..." : stats.inTransit}
          </p>
          <div className="h-1 w-full bg-blue-50 rounded-full">
            <div 
              className="h-full bg-blue-500 rounded-full" 
              style={{ width: `${stats.totalShipments > 0 ? (stats.inTransit / stats.totalShipments) * 100 : 0}%` }} 
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2">
          <span className="text-[10px] text-gray-400 font-mono block uppercase">Pending Verify</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">
            {loading ? "..." : stats.pendingVerification}
          </p>
          <div className="h-1 w-full bg-amber-100 rounded-full">
            <div 
              className="h-full bg-amber-400 rounded-full" 
              style={{ width: `${stats.totalShipments > 0 ? (stats.pendingVerification / stats.totalShipments) * 100 : 0}%` }} 
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs col-span-2 md:col-span-1 space-y-2">
          <span className="text-[10px] text-gray-400 font-mono block uppercase">Today's Bookings</span>
          <p className="text-2xl sm:text-3xl font-black text-purple-600 font-mono">
            {loading ? "..." : stats.todayBookings}
          </p>
          <div className="h-1 w-full bg-purple-100 rounded-full">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: '40%' }} />
          </div>
        </div>

      </div>

      {/* Tab Navigation links */}
      <div className="flex border-b border-gray-200 overflow-x-auto pb-px">
        <button
          id="tab-dashboard"
          onClick={() => setActiveTab("dashboard")}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all ${
            activeTab === "dashboard" 
              ? "border-b-2 border-[#032B73] text-[#032B73]" 
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <LayoutDashboard className="h-4.5 w-4.5 text-blue-800" />
          <span>Executive Dashboard</span>
        </button>

        <button
          id="tab-finance"
          onClick={() => setActiveTab("finance")}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all ${
            activeTab === "finance" 
              ? "border-b-2 border-[#032B73] text-[#032B73]" 
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Receipt className="h-4.5 w-4.5 text-blue-800" />
          <span>Finance Ledger</span>
        </button>

        <button
          id="tab-reports"
          onClick={() => setActiveTab("reports")}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all ${
            activeTab === "reports" 
              ? "border-b-2 border-[#032B73] text-[#032B73]" 
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <FileText className="h-4.5 w-4.5 text-blue-800" />
          <span>Reports & Insights</span>
        </button>

        <button
          id="tab-fleet"
          onClick={() => setActiveTab("fleet")}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all ${
            activeTab === "fleet" 
              ? "border-b-2 border-[#032B73] text-[#032B73]" 
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Package className="h-4.5 w-4.5" />
          <span>Active Shipment Fleet ({filteredShipments.length})</span>
        </button>

        <button
          id="tab-add"
          onClick={() => setActiveTab("add")}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all ${
            activeTab === "add" 
              ? "border-b-2 border-[#032B73] text-[#032B73]" 
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Create New Shipment</span>
        </button>

        <button
          id="tab-update"
          disabled={!selectedShipment}
          onClick={() => setActiveTab("update")}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all ${
            !selectedShipment ? "opacity-40 cursor-not-allowed" : ""
          } ${
            activeTab === "update" 
              ? "border-b-2 border-[#032B73] text-[#032B73]" 
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Sliders className="h-4.5 w-4.5" />
          <span>Transit Status Control</span>
        </button>

        <button
          id="tab-backups"
          onClick={() => setActiveTab("backups")}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all ${
            activeTab === "backups" 
              ? "border-b-2 border-[#032B73] text-[#032B73]" 
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Database className="h-4.5 w-4.5" />
          <span>Server Backups & Security</span>
        </button>

        <button
          id="tab-settings"
          onClick={() => setActiveTab("settings")}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all ${
            activeTab === "settings" 
              ? "border-b-2 border-[#032B73] text-[#032B73]" 
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Settings className="h-4.5 w-4.5" />
          <span>Business Settings</span>
        </button>
      </div>

      {/* Tab Panels */}
      
      {/* 0. Operations Dashboard Panel */}
      {activeTab === "dashboard" && (
        <div className="animate-[fadeIn_0.2s_ease-out]">
          <OperationsDashboard 
            shipments={shipments} 
            loading={loading} 
            onSelectShipment={(trackingNum) => {
              const found = shipments.find(s => s.trackingNumber === trackingNum);
              if (found) {
                setSelectedShipment(found);
                setMilestoneUpdate({
                  milestoneIndex: found.currentMilestoneIndex,
                  customDescription: MILESTONES[found.currentMilestoneIndex].description
                });
                setActiveTab("fleet");
              }
            }}
          />
        </div>
      )}

      {/* 0.5 Finance Ledger Panel */}
      {activeTab === "finance" && (
        <div className="animate-[fadeIn_0.2s_ease-out]">
          <FinanceModule 
            shipments={shipments}
            loading={loading}
            onUpdateShipmentDetails={updateShipmentDetails}
          />
        </div>
      )}

      {/* 0.75 Reports & Insights Panel */}
      {activeTab === "reports" && (
        <div className="animate-[fadeIn_0.2s_ease-out]">
          <ReportsModule 
            shipments={shipments}
            loading={loading}
          />
        </div>
      )}
      
      {/* 1. Fleet Panel */}
      {activeTab === "fleet" && (
        <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
          
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col lg:flex-row gap-4 justify-between items-stretch lg:items-center">
            
            {/* Search Input */}
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                id="fleet-search"
                type="text"
                placeholder="Search by Tracking ID, Sender, Receiver..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#032B73]"
              />
            </div>

            {/* Selector Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              
              <select
                id="filter-dest"
                value={filterDestination}
                onChange={(e) => setFilterDestination(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#032B73]"
              >
                <option value="">All Destinations</option>
                {uniqueDestinations.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                id="filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#032B73]"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending Verify</option>
                <option value="transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="paused">On Hold</option>
              </select>

              <select
                id="filter-service"
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#032B73]"
              >
                <option value="">All Service Speeds</option>
                <option value="Express">Express</option>
                <option value="Standard">Standard</option>
                <option value="Economy">Economy</option>
              </select>

              {/* Excel Exporter */}
              <button
                id="btn-export-excel"
                onClick={handleExportCSV}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span className="sm:inline hidden">Export to Excel</span>
              </button>

            </div>
          </div>

          {/* Core Shipments Data Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-100 text-[11px] font-mono font-bold text-gray-500 uppercase">
                    <th className="py-3 px-4">Tracking Number</th>
                    <th className="py-3 px-4">Consignor & Receiver</th>
                    <th className="py-3 px-4">Destination</th>
                    <th className="py-3 px-4">Logistics Stats</th>
                    <th className="py-3 px-4">Current Milestone</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs sm:text-sm">
                  {filteredShipments.length > 0 ? (
                    filteredShipments.map((s) => {
                      const isSel = selectedShipment?.trackingNumber === s.trackingNumber;
                      return (
                        <tr 
                          key={s.trackingNumber}
                          className={`hover:bg-slate-50/50 transition-colors ${
                            isSel ? "bg-blue-50/20" : ""
                          }`}
                        >
                          {/* Tracking details */}
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-gray-900 flex items-center space-x-1.5">
                              <span className="text-[#032B73]">{s.trackingNumber}</span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-mono block">REF: {s.referenceNumber}</span>
                          </td>

                          {/* Consignee */}
                          <td className="py-3.5 px-4 space-y-0.5">
                            <p className="text-gray-800 font-bold leading-tight">From: {s.senderName}</p>
                            <p className="text-gray-500 leading-tight">To: {s.receiverName}</p>
                          </td>

                          {/* Destination */}
                          <td className="py-3.5 px-4 font-semibold text-gray-700">
                            <div className="flex items-center">
                              <MapPin className="h-3.5 w-3.5 text-gray-400 mr-1.5" />
                              <span>{s.destinationCountry}</span>
                            </div>
                          </td>

                          {/* Weight & Type */}
                          <td className="py-3.5 px-4 font-mono text-[11px] space-y-0.5">
                            <p className="text-gray-700 font-bold">{s.weight} KG • {s.numberOfPackages} Pcs</p>
                            <span className="inline-block bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider font-bold">
                              {s.serviceType}
                            </span>
                          </td>

                          {/* Current Status Milestones */}
                          <td className="py-3.5 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide ${
                              s.currentMilestoneIndex === 23
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : s.isPaused
                                  ? "bg-red-100 text-red-800 border border-red-200 animate-pulse"
                                  : "bg-blue-100 text-blue-800 border border-blue-200"
                            }`}>
                              {s.isPaused ? "On Hold" : MILESTONES[s.currentMilestoneIndex].name}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              
                              {/* Quick Track link */}
                              <button
                                id={`btn-track-${s.trackingNumber}`}
                                title="Customer View"
                                onClick={() => onTrackingRequest(s.trackingNumber)}
                                className="p-1.5 text-gray-400 hover:text-[#032B73] hover:bg-gray-100 rounded transition-all"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {/* Milestone control */}
                              <button
                                id={`btn-milestone-${s.trackingNumber}`}
                                title="Milestone Stage"
                                onClick={() => selectForMilestoneUpdate(s)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                              >
                                <Sliders className="h-4 w-4" />
                              </button>

                              {/* Quick edit */}
                              <button
                                id={`btn-edit-${s.trackingNumber}`}
                                title="Edit Core Fields"
                                onClick={() => setEditingShipment(s)}
                                className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-all"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>

                              {/* Quick hold / resume toggle */}
                              <button
                                id={`btn-hold-${s.trackingNumber}`}
                                title={s.isPaused ? "Resume Dispatch" : "Pause / Hold"}
                                onClick={() => handlePauseToggleAction(s)}
                                className={`p-1.5 rounded transition-all ${
                                  s.isPaused 
                                    ? "text-emerald-600 bg-emerald-50 hover:bg-emerald-100" 
                                    : "text-red-500 hover:text-red-700 hover:bg-red-50"
                                }`}
                              >
                                {s.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                              </button>

                              {/* Delete */}
                              <button
                                id={`btn-delete-${s.trackingNumber}`}
                                title="Delete Permanently"
                                onClick={() => handleDeleteAction(s.trackingNumber)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-gray-400 font-mono">
                        No active shipments matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Edit Modal Layer (Conditional Overlap) */}
          {editingShipment && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-[fadeIn_0.2s_ease-out]">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-2xl w-full overflow-hidden animate-[zoomIn_0.2s_ease-out]">
                <div className="bg-[#032B73] text-white p-5 flex justify-between items-center border-b-4 border-[#FFD700]">
                  <h3 className="text-lg font-black tracking-tight">Edit Shipment Fields - {editingShipment.trackingNumber}</h3>
                  <button 
                    onClick={() => setEditingShipment(null)}
                    className="text-white/80 hover:text-white font-bold"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleUpdateCoreShipmentSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-gray-400 block">SENDER/CONSIGNOR HUB</label>
                      <input
                        type="text"
                        value={editingShipment.senderName}
                        onChange={(e) => setEditingShipment({ ...editingShipment, senderName: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                        required
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-gray-400 block">RECEIVER/CONSIGNEE NAME</label>
                      <input
                        type="text"
                        value={editingShipment.receiverName}
                        onChange={(e) => setEditingShipment({ ...editingShipment, receiverName: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-gray-400 block">CONSIGNEE PHONE</label>
                      <input
                        type="text"
                        value={editingShipment.phoneNumber || ""}
                        onChange={(e) => setEditingShipment({ ...editingShipment, phoneNumber: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-gray-400 block">DESTINATION PORT</label>
                      <input
                        type="text"
                        value={editingShipment.destinationCountry}
                        onChange={(e) => setEditingShipment({ ...editingShipment, destinationCountry: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-gray-400 block">PORT GATEWAY (MAP LABEL)</label>
                      <input
                        type="text"
                        placeholder="e.g. JFK, LHR, YYZ, MIA"
                        value={editingShipment.portGateway || ""}
                        onChange={(e) => setEditingShipment({ ...editingShipment, portGateway: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                      />
                      <p className="text-[9px] text-gray-400">Customizes the live tracking map's destination airport label directly.</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-gray-400 block">WEIGHT (KG)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={editingShipment.weight}
                        onChange={(e) => setEditingShipment({ ...editingShipment, weight: parseFloat(e.target.value) || 0.1 })}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-gray-400 block">PARCEL COUNT</label>
                      <input
                        type="number"
                        value={editingShipment.numberOfPackages}
                        onChange={(e) => setEditingShipment({ ...editingShipment, numberOfPackages: parseInt(e.target.value) || 1 })}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-gray-400 block">EST. ARRIVAL DATE</label>
                      <input
                        type="date"
                        value={editingShipment.expectedDeliveryDate.split('T')[0]}
                        onChange={(e) => setEditingShipment({ ...editingShipment, expectedDeliveryDate: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono font-bold text-gray-400 block">SERVICE SPEED</label>
                      <select
                        value={editingShipment.serviceType}
                        onChange={(e) => setEditingShipment({ ...editingShipment, serviceType: e.target.value as any })}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                      >
                        <option value="Express">Express Speed</option>
                        <option value="Standard">Standard Speed</option>
                        <option value="Economy">Economy Speed</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1 pt-2">
                    <label className="text-[11px] font-mono font-bold text-gray-400 block">SHIPMENT REMARKS / PRIVATE NOTES</label>
                    <textarea
                      rows={3}
                      value={editingShipment.shipmentNotes}
                      onChange={(e) => setEditingShipment({ ...editingShipment, shipmentNotes: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setEditingShipment(null)}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-xs font-bold transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading === "edit"}
                      className="bg-[#032B73] text-[#FFD700] hover:bg-blue-900 px-5 py-2.5 rounded-lg text-xs font-black transition-all flex items-center justify-center space-x-2 shadow text-center"
                    >
                      {actionLoading === "edit" ? <RefreshCw className="h-4.5 w-4.5 animate-spin" /> : <span>Apply Changes</span>}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 2. Create Shipment Panel */}
      {activeTab === "add" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-slate-50 border-b border-gray-100 p-5 flex justify-between items-center">
            <div>
              <h3 className="text-base font-bold text-[#032B73]">New Shipment Registration</h3>
              <p className="text-xs text-gray-500">Add a new verified parcel to the Shipplix registry</p>
            </div>
            
            <button
              id="btn-auto-tracking"
              type="button"
              onClick={handleGenerateTracking}
              className="bg-[#032B73] hover:bg-blue-900 text-[#FFD700] px-3.5 py-1.5 rounded-lg text-[11px] font-bold tracking-wider uppercase font-mono transition-all shadow-xs"
            >
              Generate ID
            </button>
          </div>

          <form onSubmit={handleCreateShipmentSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Tracking ID <span className="text-red-500">*</span></label>
                <input
                  id="form-tracking"
                  type="text"
                  placeholder="e.g. SPX-20260625-5522"
                  value={newShipment.trackingNumber}
                  onChange={(e) => setNewShipment({ ...newShipment, trackingNumber: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-mono font-bold uppercase"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Reference Number</label>
                <input
                  id="form-reference"
                  type="text"
                  placeholder="e.g. REF-29103847"
                  value={newShipment.referenceNumber}
                  onChange={(e) => setNewShipment({ ...newShipment, referenceNumber: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-mono font-bold uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Service Speed <span className="text-red-500">*</span></label>
                <select
                  id="form-service"
                  value={newShipment.serviceType}
                  onChange={(e) => setNewShipment({ ...newShipment, serviceType: e.target.value as any })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                >
                  <option value="Express">Express Delivery</option>
                  <option value="Standard">Standard Courier</option>
                  <option value="Economy">Economy Freight</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Sender / Consignor <span className="text-red-500">*</span></label>
                <input
                  id="form-sender"
                  type="text"
                  placeholder="Sender name or exporter hub"
                  value={newShipment.senderName}
                  onChange={(e) => setNewShipment({ ...newShipment, senderName: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Consignee / Receiver <span className="text-red-500">*</span></label>
                <input
                  id="form-receiver"
                  type="text"
                  placeholder="Full recipient name"
                  value={newShipment.receiverName}
                  onChange={(e) => setNewShipment({ ...newShipment, receiverName: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Consignee Contact Phone</label>
                <input
                  id="form-phone"
                  type="text"
                  placeholder="e.g. +1 (415) 555-0199"
                  value={newShipment.phoneNumber}
                  onChange={(e) => setNewShipment({ ...newShipment, phoneNumber: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Origin Center <span className="text-red-500">*</span></label>
                <select
                  id="form-origin"
                  value={newShipment.originCountry}
                  onChange={(e) => setNewShipment({ ...newShipment, originCountry: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-semibold"
                >
                  {settings.countries.supportedOrigins.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Destination Country <span className="text-red-500">*</span></label>
                <select
                  id="form-destination"
                  value={newShipment.destinationCountry}
                  onChange={(e) => setNewShipment({ ...newShipment, destinationCountry: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-semibold"
                >
                  {settings.countries.supportedDestinations.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Port Gateway (Map Label)</label>
                <input
                  id="form-portgateway"
                  type="text"
                  placeholder="e.g. JFK, LHR, YYZ, MIA"
                  value={newShipment.portGateway || ""}
                  onChange={(e) => setNewShipment({ ...newShipment, portGateway: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
                />
                <p className="text-[9px] text-gray-400">Customizes the destination terminal code on the live tracking map (falls back to defaults if left blank).</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Booking Date</label>
                <input
                  id="form-booking"
                  type="date"
                  value={newShipment.bookingDate}
                  onChange={(e) => setNewShipment({ ...newShipment, bookingDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Gross Weight (KG)</label>
                <input
                  id="form-weight"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 15.50"
                  value={newShipment.weight}
                  onChange={(e) => setNewShipment({ ...newShipment, weight: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Number of Packages</label>
                <input
                  id="form-packages"
                  type="number"
                  placeholder="e.g. 2"
                  value={newShipment.numberOfPackages}
                  onChange={(e) => setNewShipment({ ...newShipment, numberOfPackages: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Expected Delivery Date</label>
                <input
                  id="form-delivery"
                  type="date"
                  value={newShipment.expectedDeliveryDate}
                  onChange={(e) => setNewShipment({ ...newShipment, expectedDeliveryDate: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-mono"
                  required
                />
              </div>

            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Exporters Notes & Content stencil specifications</label>
              <textarea
                id="form-notes"
                rows={3}
                placeholder="Declare types of food, clothing, fragile warnings, and package dimensions here..."
                value={newShipment.shipmentNotes}
                onChange={(e) => setNewShipment({ ...newShipment, shipmentNotes: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
              />
            </div>

            <div className="flex justify-end space-x-3 border-t border-gray-100 pt-5">
              <button
                type="button"
                onClick={() => setActiveTab("fleet")}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 rounded-lg text-xs font-bold transition-all"
              >
                Discard
              </button>
              <button
                id="btn-register-submit"
                type="submit"
                disabled={actionLoading === "create"}
                className="bg-[#032B73] hover:bg-blue-900 text-[#FFD700] px-7 py-3 rounded-lg text-xs font-black transition-all flex items-center justify-center space-x-2 shadow text-center"
              >
                {actionLoading === "create" ? (
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Register Shipplix Cargo Parcel</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. Milestone & Shipment Management Hub */}
      {activeTab === "update" && activeShipment && (
        <ShipmentManagementHub
          shipment={activeShipment}
          actionLoading={actionLoading}
          onUpdateMilestone={updateMilestone}
          onUpdateStatusAndHealth={updateStatusAndHealth}
          onAddInternalNote={addInternalNote}
          onUploadDocument={uploadDocument}
          onAddPaymentTransaction={addPaymentTransaction}
          onReturnToFleet={() => setActiveTab("fleet")}
          adminEmail={adminUser?.email || "admin@shipplix.com"}
        />
      )}

      {/* 4. Security & Backups Panel */}
      {activeTab === "backups" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6 animate-[fadeIn_0.2s_ease-out]">
          <div>
            <h3 className="text-base font-bold text-[#032B73]">Server Backups & Security Diagnostics</h3>
            <p className="text-xs text-gray-500">Manage JSON-based persistence encryption status, automatic backups, and disaster recovery routines.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Backup Operations */}
            <div className="border border-gray-100 rounded-xl p-5 space-y-4 bg-slate-50">
              <h4 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wide flex items-center">
                <Database className="h-4.5 w-4.5 text-blue-600 mr-2" />
                Snapshot Routines
              </h4>
              
              <p className="text-xs text-gray-500 leading-normal">
                Executing a manual snapshot creates an encrypted, dated clone of your `shipments.json` database in the server `/backups/` system folder. Max 10 rotations.
              </p>

              <button
                id="btn-trigger-backup-now"
                onClick={triggerBackup}
                disabled={actionLoading === "backup"}
                className="bg-[#032B73] hover:bg-blue-900 text-[#FFD700] font-black text-xs px-4 py-2.5 rounded-lg transition-all flex items-center justify-center space-x-1.5 shadow text-center"
              >
                {actionLoading === "backup" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <span>Execute Snapshot Backup</span>}
              </button>
            </div>

            {/* Encryption & Cyber Security Logs */}
            <div className="border border-gray-100 rounded-xl p-5 space-y-4">
              <h4 className="text-sm font-bold text-gray-900 font-mono uppercase tracking-wide flex items-center">
                <Shield className="h-4.5 w-4.5 text-emerald-600 mr-2" />
                Encryption & Access Safeguards
              </h4>
              
              <div className="space-y-2 font-mono text-[11px] text-gray-500">
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span>Database Format:</span>
                  <strong className="text-slate-800">Filesystem JSON Persistence</strong>
                </div>
                
                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span>SSL State:</span>
                  <strong className="text-emerald-600 flex items-center">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    HTTPS Strict Enabled
                  </strong>
                </div>

                <div className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span>JWT Session State:</span>
                  <strong className="text-emerald-600">Encrypted Stateless Cookies</strong>
                </div>

                <div className="flex justify-between">
                  <span>Auto-Backup Interval:</span>
                  <strong className="text-slate-800">Every New Order Insertion</strong>
                </div>
              </div>
            </div>

          </div>

          {/* Simulated Backup logs */}
          <div className="border border-gray-100 rounded-xl p-5 space-y-3">
            <h4 className="text-xs font-mono font-bold text-gray-400 uppercase">LOGISTICS SECURE DIARY ACTIONS:</h4>
            <div className="bg-slate-900 text-slate-300 font-mono text-[10px] p-4 rounded-lg overflow-y-auto max-h-[150px] leading-relaxed space-y-1 border border-slate-950">
              <p className="text-slate-500">[2026-06-27 01:27:36] - SERVER - Shipplix Logistics Port 3000 online.</p>
              <p className="text-emerald-400">[2026-06-27 01:27:38] - SECURE - Loaded 4 records successfully from shipments.json.</p>
              <p className="text-blue-400">[2026-06-27 01:28:10] - AUTH - Session authorized token shipplix-jwt-token-hash-2026-admin-access for shipplixservices@gmail.com.</p>
              <p className="text-slate-500">[2026-06-27 01:28:15] - SYSTEM - Automatic background log rotations verified (Status: Green).</p>
            </div>
          </div>

        </div>
      )}

      {/* 4. Business Settings Panel */}
      {activeTab === "settings" && (
        <div className="animate-[fadeIn_0.2s_ease-out]">
          <SettingsModule 
            showSystemMessage={showSystemMessage}
          />
        </div>
      )}

    </div>
  );
}
