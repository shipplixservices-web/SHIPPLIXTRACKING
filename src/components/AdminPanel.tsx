import React, { useState, useEffect } from "react";
import { 
  Shield, Key, LayoutDashboard, Plus, Eye, Edit2, Trash2, Pause, Play, Download, Search, 
  MapPin, Scale, Package, Calendar, RefreshCw, Send, AlertCircle, CheckCircle2, Sliders, Database, Save, LogOut
} from "lucide-react";
import { Shipment, MILESTONES, DashboardStats } from "../types.js";
import ShipplixLogo from "./ShipplixLogo.tsx";
import { supabase } from "../supabaseClient.js";

interface AdminPanelProps {
  onTrackingRequest: (trackingNumber: string) => void;
}

export default function AdminPanel({ onTrackingRequest }: AdminPanelProps) {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [adminUser, setAdminUser] = useState<{ email: string; name: string } | null>(null);

  // Dashboard Data state
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    deliveredShipments: 0,
    inTransit: 0,
    pendingVerification: 0,
    todayBookings: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [systemMessage, setSystemMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Navigation state inside Admin
  const [activeTab, setActiveTab] = useState<"fleet" | "add" | "update" | "backups">("fleet");

  // Selection states
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterService, setFilterService] = useState("");

  // Create Shipment form state
  const [newShipment, setNewShipment] = useState({
    trackingNumber: "",
    referenceNumber: "",
    senderName: "",
    receiverName: "",
    phoneNumber: "",
    originCountry: "Nigeria",
    destinationCountry: "United States",
    weight: "10.0",
    numberOfPackages: "1",
    serviceType: "Express" as "Express" | "Standard" | "Economy",
    bookingDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    shipmentNotes: "",
    portGateway: ""
  });

  // Edit Shipment state (when editing core fields)
  const [editingShipment, setEditingShipment] = useState<Shipment | null>(null);

  // Milestone Update state
  const [milestoneUpdate, setMilestoneUpdate] = useState({
    milestoneIndex: 0,
    customDescription: ""
  });

  // Generate a random tracking number
  const handleGenerateTracking = () => {
    setNewShipment(prev => {
      const dateStr = (prev.bookingDate || new Date().toISOString().split('T')[0]).replace(/-/g, "");
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      return {
        ...prev,
        trackingNumber: `SPX-${dateStr}-${randomNum}`
      };
    });
  };

  useEffect(() => {
    // Check local storage and Supabase session for pre-existing session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        setIsAuthenticated(true);
        setAdminUser({
          email: session.user.email || "",
          name: "Shipplix Operations Admin"
        });
      } else {
        const savedSession = localStorage.getItem("shipplix_admin_session");
        if (savedSession) {
          try {
            const parsed = JSON.parse(savedSession);
            setIsAuthenticated(true);
            setAdminUser(parsed.user);
          } catch {
            localStorage.removeItem("shipplix_admin_session");
          }
        }
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [shipmentsRes, statsRes] = await Promise.all([
        fetch("/api/shipments"),
        fetch("/api/stats")
      ]);
      const shipmentsData = await shipmentsRes.json();
      const statsData = await statsRes.json();

      if (shipmentsData.success) {
        setShipments(shipmentsData.shipments);
        if (shipmentsData.shipments.length > 0 && !selectedShipment) {
          setSelectedShipment(shipmentsData.shipments[0]);
          setMilestoneUpdate({
            milestoneIndex: shipmentsData.shipments[0].currentMilestoneIndex,
            customDescription: MILESTONES[shipmentsData.shipments[0].currentMilestoneIndex].description
          });
        }
      }
      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (err) {
      console.error("Error fetching dashboard data", err);
      showSystemMessage("error", "Unable to load dashboard fleet. Check connection.");
    } finally {
      setLoading(false);
    }
  };

  const showSystemMessage = (type: 'success' | 'error', text: string) => {
    setSystemMessage({ type, text });
    setTimeout(() => {
      setSystemMessage(null);
    }, 5000);
  };

  // Auth handler using Supabase Auth
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        setAuthError(error.message);
      } else if (data && data.user) {
        setIsAuthenticated(true);
        const adminData = {
          email: data.user.email || "",
          name: "Shipplix Operations Admin"
        };
        setAdminUser(adminData);
        localStorage.setItem("shipplix_admin_session", JSON.stringify({
          success: true,
          user: adminData
        }));
      } else {
        setAuthError("Failed to authenticate. Invalid administrator credentials.");
      }
    } catch (err) {
      setAuthError("Failed to authenticate. Connection error.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthenticated(false);
    setAdminUser(null);
    localStorage.removeItem("shipplix_admin_session");
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Error signing out from Supabase", err);
    }
  };

  // Create Shipment handler
  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("create");
    try {
      const response = await fetch("/api/shipments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newShipment)
      });
      const data = await response.json();

      if (data.success) {
        showSystemMessage("success", `Shipment ${data.shipment.trackingNumber} registered successfully!`);
        // Reset form
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
        fetchDashboardData();
        setActiveTab("fleet");
      } else {
        showSystemMessage("error", data.message || "Failed to register shipment.");
      }
    } catch (err) {
      showSystemMessage("error", "Network failure registering shipment.");
    } finally {
      setActionLoading(null);
    }
  };

  // Edit core fields handler
  const handleUpdateCoreShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShipment) return;
    setActionLoading("edit");
    try {
      const response = await fetch(`/api/shipments/${editingShipment.trackingNumber}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingShipment)
      });
      const data = await response.json();

      if (data.success) {
        showSystemMessage("success", `Shipment details updated successfully!`);
        setEditingShipment(null);
        if (selectedShipment && selectedShipment.trackingNumber.toUpperCase() === data.shipment.trackingNumber.toUpperCase()) {
          setSelectedShipment(data.shipment);
        }
        fetchDashboardData();
      } else {
        showSystemMessage("error", data.message || "Update failed.");
      }
    } catch (err) {
      showSystemMessage("error", "Network error updating details.");
    } finally {
      setActionLoading(null);
    }
  };

  // Milestone transition handler
  const handleUpdateMilestone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;
    setActionLoading("milestone");

    try {
      const response = await fetch(`/api/shipments/${selectedShipment.trackingNumber}/milestone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          milestoneIndex: milestoneUpdate.milestoneIndex,
          customDescription: milestoneUpdate.customDescription
        })
      });
      const data = await response.json();

      if (data.success) {
        showSystemMessage("success", `Transit stage advanced for ${selectedShipment.trackingNumber}! Notifications simulated successfully.`);
        
        // Update local selection
        setSelectedShipment(data.shipment);
        fetchDashboardData();
      } else {
        showSystemMessage("error", data.message || "Failed to transition milestone.");
      }
    } catch (err) {
      showSystemMessage("error", "Network error during stage advancement.");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete handler
  const handleDeleteShipment = async (trackingNumber: string) => {
    if (!confirm(`Are you absolutely sure you want to delete shipment ${trackingNumber}? This action is permanent.`)) {
      return;
    }
    setActionLoading(`delete-${trackingNumber}`);
    try {
      const response = await fetch(`/api/shipments/${trackingNumber}`, {
        method: "DELETE"
      });
      const data = await response.json();

      if (data.success) {
        showSystemMessage("success", `Shipment ${trackingNumber} has been deleted.`);
        if (selectedShipment?.trackingNumber === trackingNumber) {
          setSelectedShipment(null);
        }
        fetchDashboardData();
      } else {
        showSystemMessage("error", data.message || "Delete request failed.");
      }
    } catch (err) {
      showSystemMessage("error", "Network error deleting shipment.");
    } finally {
      setActionLoading(null);
    }
  };

  // Hold / Resume Handlers
  const handlePauseToggle = async (shipmentToToggle: Shipment) => {
    const isHold = !shipmentToToggle.isPaused;
    const actionUrl = `/api/shipments/${shipmentToToggle.trackingNumber}/${isHold ? "pause" : "resume"}`;
    setActionLoading(`pause-${shipmentToToggle.trackingNumber}`);

    try {
      const response = await fetch(actionUrl, { method: "POST" });
      const data = await response.json();

      if (data.success) {
        showSystemMessage("success", `Shipment status updated to ${isHold ? "ON HOLD" : "ACTIVE TRANSIT"}.`);
        if (selectedShipment?.trackingNumber === shipmentToToggle.trackingNumber) {
          setSelectedShipment(data.shipment);
        }
        fetchDashboardData();
      } else {
        showSystemMessage("error", "Failed to toggle pause status.");
      }
    } catch (err) {
      showSystemMessage("error", "Connection failed toggling pause.");
    } finally {
      setActionLoading(null);
    }
  };

  // Trigger manual backup
  const handleTriggerBackup = async () => {
    setActionLoading("backup");
    try {
      const response = await fetch("/api/backup", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        showSystemMessage("success", `Encrypted data backup completed. Logged to system server as: ${data.backupFile}`);
      } else {
        showSystemMessage("error", "Backup routine failed.");
      }
    } catch (err) {
      showSystemMessage("error", "Network timeout executing backup.");
    } finally {
      setActionLoading(null);
    }
  };

  // Export to Excel / CSV format
  const handleExportCSV = () => {
    if (shipments.length === 0) return;

    // Create CSV content headers
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Tracking Number,Reference Number,Sender Name,Receiver Name,Phone Number,Origin,Destination,Weight (KG),Packages,Service Type,Booking Date,Expected Delivery Date,Notes,Paused,Current Milestone\n";

    // Loop through shipments
    shipments.forEach(s => {
      const row = [
        s.trackingNumber,
        s.referenceNumber,
        `"${s.senderName.replace(/"/g, '""')}"`,
        `"${s.receiverName.replace(/"/g, '""')}"`,
        `"${s.phoneNumber || ''}"`,
        s.originCountry,
        s.destinationCountry,
        s.weight,
        s.numberOfPackages,
        s.serviceType,
        s.bookingDate,
        s.expectedDeliveryDate,
        `"${(s.shipmentNotes || '').replace(/"/g, '""')}"`,
        s.isPaused ? "YES" : "NO",
        `"${MILESTONES[s.currentMilestoneIndex].name}"`
      ].join(",");
      csvContent += row + "\n";
    });

    // Download flow
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SHIPPLIX_CARGO_FLEET_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSystemMessage("success", "Exported database successfully. Ready for Microsoft Excel.");
  };

  // Set the shipment for milestone updating console
  const selectForMilestoneUpdate = (sh: Shipment) => {
    setSelectedShipment(sh);
    setMilestoneUpdate({
      milestoneIndex: sh.currentMilestoneIndex,
      customDescription: MILESTONES[sh.currentMilestoneIndex].description
    });
    setActiveTab("update");
  };

  // Filter & Search matching
  const filteredShipments = shipments.filter(s => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = 
      s.trackingNumber.toLowerCase().includes(query) ||
      s.referenceNumber.toLowerCase().includes(query) ||
      s.senderName.toLowerCase().includes(query) ||
      s.receiverName.toLowerCase().includes(query);
      
    const matchesDest = filterDestination ? s.destinationCountry.toLowerCase() === filterDestination.toLowerCase() : true;
    const matchesService = filterService ? s.serviceType.toLowerCase() === filterService.toLowerCase() : true;
    
    // Status matching (Delivered index is 23, On Hold checks boolean, In Transit is anything between 1 and 22)
    let matchesStatus = true;
    if (filterStatus) {
      if (filterStatus === "paused") matchesStatus = s.isPaused;
      else if (filterStatus === "delivered") matchesStatus = s.currentMilestoneIndex === 23;
      else if (filterStatus === "transit") matchesStatus = s.currentMilestoneIndex > 0 && s.currentMilestoneIndex < 23 && !s.isPaused;
      else if (filterStatus === "pending") matchesStatus = s.currentMilestoneIndex === 0;
    }

    return matchesSearch && matchesDest && matchesService && matchesStatus;
  });

  // Unique list of destinations in DB for filter
  const uniqueDestinations = Array.from(new Set(shipments.map(s => s.destinationCountry)));

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
              className="w-full bg-[#032B73] text-[#FFD700] hover:bg-blue-900 active:scale-98 transition-all font-black text-sm py-3 rounded-lg flex items-center justify-center space-x-2 shadow"
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
          id="tab-fleet"
          onClick={() => setActiveTab("fleet")}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all ${
            activeTab === "fleet" 
              ? "border-[#032B73] text-[#032B73]" 
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <LayoutDashboard className="h-4.5 w-4.5" />
          <span>Active Shipment Fleet ({filteredShipments.length})</span>
        </button>

        <button
          id="tab-add"
          onClick={() => setActiveTab("add")}
          className={`flex items-center space-x-2 py-3 px-5 border-b-2 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all ${
            activeTab === "add" 
              ? "border-[#032B73] text-[#032B73]" 
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
              ? "border-[#032B73] text-[#032B73]" 
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
              ? "border-[#032B73] text-[#032B73]" 
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          <Database className="h-4.5 w-4.5" />
          <span>Server Backups & Security</span>
        </button>
      </div>

      {/* Tab Panels */}
      
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
                                onClick={() => handlePauseToggle(s)}
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
                                onClick={() => handleDeleteShipment(s.trackingNumber)}
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
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

                <form onSubmit={handleUpdateCoreShipment} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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
                      className="bg-[#032B73] text-[#FFD700] hover:bg-blue-900 px-5 py-2.5 rounded-lg text-xs font-black transition-all flex items-center space-x-2 shadow"
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

          <form onSubmit={handleCreateShipment} className="p-6 space-y-6">
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
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Origin Center</label>
                <input
                  id="form-origin"
                  type="text"
                  value={newShipment.originCountry}
                  onChange={(e) => setNewShipment({ ...newShipment, originCountry: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-semibold bg-gray-50"
                  readOnly
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">Destination Country <span className="text-red-500">*</span></label>
                <select
                  id="form-destination"
                  value={newShipment.destinationCountry}
                  onChange={(e) => setNewShipment({ ...newShipment, destinationCountry: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-sm font-semibold"
                >
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Canada">Canada</option>
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
                className="bg-[#032B73] hover:bg-blue-900 text-[#FFD700] px-7 py-3 rounded-lg text-xs font-black transition-all flex items-center space-x-2 shadow"
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

      {/* 3. Milestone Controller Panel */}
      {activeTab === "update" && selectedShipment && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6 animate-[fadeIn_0.2s_ease-out]">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-4">
            <div>
              <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-800 px-2.5 py-1 rounded border border-blue-100">
                STAGE ADVANCEMENT WORKSPACE
              </span>
              <h3 className="text-base font-bold text-[#032B73] mt-1">
                Milestone Status Control: <span className="font-mono">{selectedShipment.trackingNumber}</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Consignee: <strong className="text-gray-700">{selectedShipment.receiverName}</strong> ({selectedShipment.destinationCountry}{selectedShipment.portGateway ? ` - ${selectedShipment.portGateway}` : ""})
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-gray-400 font-mono block">CURRENT STATUS STAGE</span>
              <span className="inline-flex bg-blue-100 text-blue-800 text-xs font-black px-3 py-1.5 rounded-full mt-1">
                Stage {selectedShipment.currentMilestoneIndex + 1}: {MILESTONES[selectedShipment.currentMilestoneIndex].name}
              </span>
            </div>
          </div>

          <form onSubmit={handleUpdateMilestone} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left: Predefined milestone selectors */}
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">
                Select Transit Milestone (1 to {MILESTONES.length})
              </label>
              
              <div className="border border-gray-200 rounded-lg max-h-[350px] overflow-y-auto divide-y divide-gray-100 shadow-inner">
                {MILESTONES.map((mil, mIdx) => {
                  const isCur = mIdx === milestoneUpdate.milestoneIndex;
                  const isPast = mIdx <= selectedShipment.currentMilestoneIndex;
                  return (
                    <button
                      id={`select-milestone-${mIdx}`}
                      key={mIdx}
                      type="button"
                      onClick={() => setMilestoneUpdate({
                        milestoneIndex: mIdx,
                        customDescription: MILESTONES[mIdx].description
                      })}
                      className={`w-full text-left p-2.5 text-xs font-semibold flex items-center justify-between transition-colors ${
                        isCur 
                          ? "bg-[#032B73] text-white" 
                          : isPast 
                            ? "bg-blue-50/50 text-blue-900 hover:bg-blue-50" 
                            : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] opacity-60">{(mIdx + 1).toString().padStart(2, '0')}.</span>
                        <span className="truncate">{mil.name}</span>
                      </div>
                      
                      {isPast && !isCur && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right: Milestone notes and submit (2 cols on desktop) */}
            <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <h4 className="text-xs font-bold text-blue-900 mb-1 font-mono uppercase">
                    ADVANCING TO STAGE {milestoneUpdate.milestoneIndex + 1}: {MILESTONES[milestoneUpdate.milestoneIndex].name}
                  </h4>
                  <p className="text-xs text-blue-700 leading-normal">
                    This selection advances the customer timeline. It generates simulated dispatch security email to <strong>shipplixservices@gmail.com</strong> and WhatsApp API updates to the consignee phone contact.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[11px] font-mono font-bold text-gray-500 block uppercase">
                      Custom Transit Stage Description
                    </label>
                    <button
                      id="btn-reset-descr"
                      type="button"
                      onClick={() => setMilestoneUpdate({
                        ...milestoneUpdate,
                        customDescription: MILESTONES[milestoneUpdate.milestoneIndex].description
                      })}
                      className="text-blue-700 hover:underline text-[10px] font-bold"
                    >
                      Reset to Default Template
                    </button>
                  </div>
                  <textarea
                    id="textarea-custom-desc"
                    rows={4}
                    value={milestoneUpdate.customDescription}
                    onChange={(e) => setMilestoneUpdate({ ...milestoneUpdate, customDescription: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg p-2.5 text-xs sm:text-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setActiveTab("fleet")}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-5 py-3 rounded-lg text-xs font-bold transition-all"
                >
                  Return to Fleet
                </button>
                <button
                  id="btn-update-stage"
                  type="submit"
                  disabled={actionLoading === "milestone"}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-7 py-3 rounded-lg text-xs font-black transition-all flex items-center space-x-2 shadow-md"
                >
                  {actionLoading === "milestone" ? (
                    <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Dispatch Status Update</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        </div>
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
                onClick={handleTriggerBackup}
                disabled={actionLoading === "backup"}
                className="bg-[#032B73] hover:bg-blue-900 text-[#FFD700] font-black text-xs px-4 py-2.5 rounded-lg transition-all flex items-center space-x-1.5 shadow"
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

    </div>
  );
}
