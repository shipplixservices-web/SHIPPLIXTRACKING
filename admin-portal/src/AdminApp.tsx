import React, { useState, useEffect } from "react";
import { 
  Shield, Key, LayoutDashboard, Plus, Eye, Edit2, Trash2, Pause, Play, Download, Search, 
  MapPin, Scale, Package, Calendar, RefreshCw, Send, AlertCircle, CheckCircle2, Sliders, Database, Save, LogOut, FileText, ChevronRight, User, Users
} from "lucide-react";
import { Shipment, MILESTONES, DashboardStats } from "../../shared/types.ts";
import { ShipplixApiClient } from "../../shared/api.ts";
import { 
  formatSimpleDate, 
  generateTrackingNumberString, 
  generateReferenceNumberString,
  validateTrackingNumber,
  validateWeight,
  validatePackages
} from "../../shared/utils.ts";

export default function AdminApp() {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [adminUser, setAdminUser] = useState<{ email: string; name: string } | null>(null);

  // App Data State
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    deliveredShipments: 0,
    inTransit: 0,
    pendingVerification: 0,
    todayBookings: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "shipments" | "transit" | "customers" | "reports" | "settings">("dashboard");

  // Operational State & Forms
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  // Status Change State
  const [selectedStatusShipment, setSelectedStatusShipment] = useState<Shipment | null>(null);
  const [newMilestoneIndex, setNewMilestoneIndex] = useState(0);
  const [customDescription, setCustomDescription] = useState("");
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Shipment Creation/Editing Form Fields
  const [formTracking, setFormTracking] = useState("");
  const [formReference, setFormReference] = useState("");
  const [formSender, setFormSender] = useState("");
  const [formReceiver, setFormReceiver] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formOrigin, setFormOrigin] = useState("Nigeria");
  const [formDestination, setFormDestination] = useState("");
  const [formWeight, setFormWeight] = useState("10.0");
  const [formPackages, setFormPackages] = useState("1");
  const [formServiceType, setFormServiceType] = useState<"Express" | "Standard" | "Economy">("Express");
  const [formNotes, setFormNotes] = useState("");
  const [formPortGateway, setFormPortGateway] = useState("");
  const [formBookingDate, setFormBookingDate] = useState("");
  const [formExpectedDate, setFormExpectedDate] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Backup System State
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupResult, setBackupResult] = useState<{ filename?: string; message?: string } | null>(null);

  // Operational Audit Logs (Simulated)
  const [auditLogs, setAuditLogs] = useState<Array<{ time: string; action: string; type: "info" | "warn" | "success" }>>([
    { time: new Date().toLocaleTimeString(), action: "Admin System core modules initialized.", type: "info" },
    { time: new Date().toLocaleTimeString(), action: "Secure handshake with Supabase database verified.", type: "success" }
  ]);

  const addAuditLog = (action: string, type: "info" | "warn" | "success" = "info") => {
    setAuditLogs(prev => [{ time: new Date().toLocaleTimeString(), action, type }, ...prev]);
  };

  // Check persistent session
  useEffect(() => {
    const savedSession = localStorage.getItem("shipplix_admin_session");
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        setIsAuthenticated(true);
        setAdminUser(session.user);
        addAuditLog(`Persistent session restored for administrative account: ${session.user.email}`, "success");
      } catch (e) {
        localStorage.removeItem("shipplix_admin_session");
      }
    }
  }, []);

  // Fetch all shipments & recalculate statistics
  const fetchShipmentsAndStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const mappedShipments = await ShipplixApiClient.fetchAllShipments();
      setShipments(mappedShipments);

      // Recalculate local statistics using shared client utility
      const calculatedStats = ShipplixApiClient.calculateStats(mappedShipments);
      setStats(calculatedStats);

    } catch (err: any) {
      console.error("Error loading admin datasets:", err);
      setError(err?.message || "Failed to load database. Check network connection.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchShipmentsAndStats();
    }
  }, [isAuthenticated]);

  // Handle Login authentication
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);

    try {
      const result = await ShipplixApiClient.adminLogin(email, password);

      setIsAuthenticated(true);
      setAdminUser(result.user);
      localStorage.setItem("shipplix_admin_session", JSON.stringify({
        token: result.token,
        user: result.user
      }));
      addAuditLog(`Successful authentication from administrative portal for user ${email}`, "success");
    } catch (err: any) {
      setAuthError(err?.message || "Invalid administrator credentials. Authentication failed.");
      addAuditLog(`Failed authentication attempt for username: ${email}`, "warn");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Sign Out
  const handleSignOut = () => {
    localStorage.removeItem("shipplix_admin_session");
    setIsAuthenticated(false);
    setAdminUser(null);
    setEmail("");
    setPassword("");
    addAuditLog("Administrator logged out successfully.", "info");
  };

  // Generate unique tracking number
  const generateTrackingNumber = () => {
    setFormTracking(generateTrackingNumberString());
    setFormReference(generateReferenceNumberString());
  };

  // Create Shipment operation
  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Perform validation using shared validation utilities
    if (!validateTrackingNumber(formTracking)) {
      alert("Please provide a valid tracking number in the format SPX-YYYYMMDD-XXXX");
      return;
    }
    if (!validateWeight(formWeight)) {
      alert("Please provide a valid cargo weight greater than zero.");
      return;
    }
    if (!validatePackages(formPackages)) {
      alert("Please provide a valid number of packages as an integer greater than zero.");
      return;
    }

    setFormLoading(true);
    try {
      const initialHistory = [{
        milestoneIndex: 0,
        milestoneName: MILESTONES[0].name,
        description: MILESTONES[0].description,
        timestamp: new Date().toISOString()
      }];

      const initialNotifications = [
        {
          id: `notif-email-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: "email" as const,
          recipient: "shipplixservices@gmail.com",
          milestoneName: MILESTONES[0].name,
          status: "sent" as const
        }
      ];

      await ShipplixApiClient.createShipment({
        trackingNumber: formTracking.trim().toUpperCase(),
        referenceNumber: formReference.trim() || generateReferenceNumberString(),
        senderName: formSender.trim(),
        receiverName: formReceiver.trim(),
        phoneNumber: formPhone.trim(),
        originCountry: formOrigin.trim(),
        destinationCountry: formDestination.trim(),
        weight: parseFloat(formWeight) || 1.0,
        numberOfPackages: parseInt(formPackages) || 1,
        serviceType: formServiceType,
        bookingDate: formBookingDate || new Date().toISOString().split('T')[0],
        expectedDeliveryDate: formExpectedDate || new Date().toISOString().split('T')[0],
        shipmentNotes: formNotes.trim(),
        currentMilestoneIndex: 0,
        milestoneHistory: initialHistory,
        notifications: initialNotifications,
        isPaused: false,
        portGateway: formPortGateway.trim()
      });

      addAuditLog(`Successfully registered new cargo shipment: ${formTracking}`, "success");
      setIsCreateModalOpen(false);
      resetForm();
      fetchShipmentsAndStats();
    } catch (err: any) {
      alert(`Database insertion failed: ${err.message || err}`);
    } finally {
      setFormLoading(false);
    }
  };

  // Prepare fields for Editing
  const openEditModal = (shipment: Shipment) => {
    setSelectedShipment(shipment);
    setFormTracking(shipment.trackingNumber);
    setFormReference(shipment.referenceNumber);
    setFormSender(shipment.senderName);
    setFormReceiver(shipment.receiverName);
    setFormPhone(shipment.phoneNumber);
    setFormOrigin(shipment.originCountry);
    setFormDestination(shipment.destinationCountry);
    setFormWeight(shipment.weight.toString());
    setFormPackages(shipment.numberOfPackages.toString());
    setFormServiceType(shipment.serviceType);
    setFormNotes(shipment.shipmentNotes);
    setFormPortGateway(shipment.portGateway || "");
    setFormBookingDate(shipment.bookingDate);
    setFormExpectedDate(shipment.expectedDeliveryDate);
    setIsEditModalOpen(true);
  };

  // Edit Shipment operation
  const handleEditShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShipment) return;

    // Perform validation using shared validation utilities
    if (!validateWeight(formWeight)) {
      alert("Please provide a valid cargo weight greater than zero.");
      return;
    }
    if (!validatePackages(formPackages)) {
      alert("Please provide a valid number of packages as an integer greater than zero.");
      return;
    }

    setFormLoading(true);

    try {
      await ShipplixApiClient.updateShipment(selectedShipment.trackingNumber, {
        senderName: formSender.trim(),
        receiverName: formReceiver.trim(),
        phoneNumber: formPhone.trim(),
        originCountry: formOrigin.trim(),
        destinationCountry: formDestination.trim(),
        weight: parseFloat(formWeight) || 1.0,
        numberOfPackages: parseInt(formPackages) || 1,
        serviceType: formServiceType,
        bookingDate: formBookingDate,
        expectedDeliveryDate: formExpectedDate,
        shipmentNotes: formNotes.trim(),
        portGateway: formPortGateway.trim()
      });

      addAuditLog(`Modified details for consignment cargo: ${selectedShipment.trackingNumber}`, "info");
      setIsEditModalOpen(false);
      resetForm();
      fetchShipmentsAndStats();
    } catch (err: any) {
      alert(`Database update failed: ${err.message || err}`);
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Shipment
  const handleDeleteShipment = async (trackingNumber: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete shipment ${trackingNumber} from the cloud database?`)) {
      return;
    }

    try {
      await ShipplixApiClient.deleteShipment(trackingNumber);
      addAuditLog(`Permanently deleted shipment file: ${trackingNumber}`, "warn");
      fetchShipmentsAndStats();
    } catch (err: any) {
      alert(`Database deletion failed: ${err.message || err}`);
    }
  };

  // Pause / Resume Shipment
  const togglePauseShipment = async (shipment: Shipment) => {
    try {
      const updated = await ShipplixApiClient.togglePauseShipment(shipment.trackingNumber, shipment.isPaused);
      addAuditLog(`Consignment transit execution ${updated.isPaused ? "PAUSED" : "RESUMED"} for tracking ID ${shipment.trackingNumber}`, updated.isPaused ? "warn" : "success");
      fetchShipmentsAndStats();
    } catch (err: any) {
      alert(`Transit status adjustment failed: ${err.message || err}`);
    }
  };

  // Prepare milestone update
  const startStatusUpdate = (shipment: Shipment) => {
    setSelectedStatusShipment(shipment);
    setNewMilestoneIndex(shipment.currentMilestoneIndex);
    setCustomDescription(MILESTONES[shipment.currentMilestoneIndex]?.description || "");
    setActiveTab("transit");
  };

  // Submit Milestone Update
  const handleMilestoneUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatusShipment) return;
    setStatusUpdateLoading(true);

    try {
      await ShipplixApiClient.updateMilestone(
        selectedStatusShipment,
        newMilestoneIndex,
        customDescription
      );

      const milestoneName = MILESTONES[newMilestoneIndex].name;
      addAuditLog(`Dispatched status update [${milestoneName}] to shipment ${selectedStatusShipment.trackingNumber}`, "success");
      setSelectedStatusShipment(null);
      setCustomDescription("");
      fetchShipmentsAndStats();
    } catch (err: any) {
      alert(`Failed to update shipment status: ${err.message || err}`);
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Trigger JSON Backup
  const triggerDatabaseBackup = async () => {
    setBackupLoading(true);
    setBackupResult(null);
    try {
      const result = await ShipplixApiClient.triggerBackup();
      setBackupResult({
        filename: result.filename,
        message: result.message
      });
      addAuditLog(`Local filesystem backup created successfully: ${result.filename}`, "success");
    } catch (e: any) {
      setBackupResult({
        message: `Database JSON serialization error: ${e.message || e}`
      });
      addAuditLog(`Filesystem backup failed: ${e.message || e}`, "warn");
    } finally {
      setBackupLoading(false);
    }
  };

  // Clear Form Fields
  const resetForm = () => {
    setFormTracking("");
    setFormReference("");
    setFormSender("");
    setFormReceiver("");
    setFormPhone("");
    setFormOrigin("Nigeria");
    setFormDestination("");
    setFormWeight("10.0");
    setFormPackages("1");
    setFormServiceType("Express");
    setFormNotes("");
    setFormPortGateway("");
    setFormBookingDate(new Date().toISOString().split('T')[0]);
    setFormExpectedDate(new Date(Date.now() + 5*24*60*60*1000).toISOString().split('T')[0]);
    setSelectedShipment(null);
  };

  // Filter shipments based on search string
  const filteredShipments = shipments.filter(s => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      s.trackingNumber.toLowerCase().includes(q) ||
      s.referenceNumber.toLowerCase().includes(q) ||
      s.senderName.toLowerCase().includes(q) ||
      s.receiverName.toLowerCase().includes(q) ||
      s.destinationCountry.toLowerCase().includes(q) ||
      (s.portGateway && s.portGateway.toLowerCase().includes(q))
    );
  });

  // Unique customers computation
  const customersList = React.useMemo(() => {
    const senders: Record<string, { role: string; phone: string; count: number; trackingNumbers: string[] }> = {};
    const receivers: Record<string, { role: string; phone: string; count: number; trackingNumbers: string[] }> = {};

    shipments.forEach(s => {
      // Senders scan
      if (s.senderName) {
        const key = s.senderName.trim();
        if (!senders[key]) {
          senders[key] = { role: "Sender (Origin)", phone: s.phoneNumber || "No Phone Info", count: 0, trackingNumbers: [] };
        }
        senders[key].count += 1;
        senders[key].trackingNumbers.push(s.trackingNumber);
      }
      // Receivers scan
      if (s.receiverName) {
        const key = s.receiverName.trim();
        if (!receivers[key]) {
          receivers[key] = { role: "Consignee (Receiver)", phone: s.phoneNumber || "No Phone Info", count: 0, trackingNumbers: [] };
        }
        receivers[key].count += 1;
        receivers[key].trackingNumbers.push(s.trackingNumber);
      }
    });

    return [
      ...Object.entries(senders).map(([name, obj]) => ({ name, ...obj })),
      ...Object.entries(receivers).map(([name, obj]) => ({ name, ...obj }))
    ].sort((a, b) => b.count - a.count);
  }, [shipments]);

  // UN-AUTHENTICATED LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden text-gray-100">
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffd700_1px,transparent_1px)] [background-size:20px_20px]" />
        
        <div className="w-full max-w-md z-10 space-y-6">
          <div className="text-center">
            <div className="inline-flex p-4 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-[#FFD700] mb-3">
              <Shield className="h-10 w-10 animate-pulse" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-white">Shipplix Ops Portal</h1>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono">Operations & Dispatch Controller Access</p>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center space-x-3 bg-blue-500/5 border border-blue-500/15 p-3 rounded-xl text-xs text-blue-300">
              <Key className="h-4 w-4 text-[#FFD700] shrink-0" />
              <span>Authorized personnel only. Secure operator passphrase and administrative credentials required.</span>
            </div>

            {authError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex items-start space-x-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider mb-1">Administrative Email</label>
                <input
                  id="admin-email-input"
                  type="text"
                  required
                  placeholder="shipplixservices@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent placeholder-slate-600"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider mb-1">Security Key (Password)</label>
                <input
                  id="admin-password-input"
                  type="password"
                  required
                  placeholder="••••••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:border-transparent placeholder-slate-600"
                />
              </div>

              <button
                id="admin-login-submit"
                type="submit"
                disabled={authLoading}
                className="w-full bg-[#FFD700] hover:bg-yellow-400 text-[#032B73] transition-all font-black uppercase text-xs py-4 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg tracking-wider disabled:opacity-50"
              >
                {authLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Shield className="h-4 w-4" />
                    <span>Acknowledge & Sign In</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Development Hints */}
          <div className="bg-slate-900/50 border border-slate-900 rounded-xl p-4 text-center">
            <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              Demo Access Credentials:
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Email: <strong className="text-blue-300">shipplixservices@gmail.com</strong>
            </p>
            <p className="text-xs text-slate-400">
              Passcode: <strong className="text-yellow-400">Sh1ppL1x#Op_918273_SecUrE</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // MAIN ADMIN CONSOLE LAYOUT
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-[#FFD700] selection:text-[#032B73]">
      
      {/* Admin Title Info bar */}
      <div className="bg-[#032B73] border-b-2 border-[#FFD700] py-3.5 px-4 sm:px-6 lg:px-8 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center space-x-2">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-mono font-bold text-blue-200">SHIPPX CONTROL NODE // SECURITY LEVEL A-1</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-slate-300 font-medium">
            Signed in: <strong className="text-white font-black">{adminUser?.name || "Operations Admin"}</strong>
          </div>
          <button
            id="admin-logout-btn"
            onClick={handleSignOut}
            className="flex items-center space-x-1 hover:text-[#FFD700] bg-white/5 hover:bg-white/10 transition-all font-bold px-3 py-1.5 rounded-lg border border-white/5"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row max-w-8xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-6">
        
        {/* Operations Sidebar Navigation */}
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-4">Operations Menu</h3>
            <nav className="flex flex-col gap-1">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                  activeTab === "dashboard"
                    ? "bg-[#032B73] text-white border-l-4 border-[#FFD700] shadow-md"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <LayoutDashboard className="h-4.5 w-4.5 text-[#FFD700]" />
                  <span>Dashboard Overview</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </button>

              <button
                onClick={() => setActiveTab("shipments")}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                  activeTab === "shipments"
                    ? "bg-[#032B73] text-white border-l-4 border-[#FFD700] shadow-md"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Package className="h-4.5 w-4.5 text-[#FFD700]" />
                  <span>Shipments Registry</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </button>

              <button
                onClick={() => setActiveTab("transit")}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                  activeTab === "transit"
                    ? "bg-[#032B73] text-white border-l-4 border-[#FFD700] shadow-md"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Sliders className="h-4.5 w-4.5 text-[#FFD700]" />
                  <span>Hub Dispatch & Status</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </button>

              <button
                onClick={() => setActiveTab("customers")}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                  activeTab === "customers"
                    ? "bg-[#032B73] text-white border-l-4 border-[#FFD700] shadow-md"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Users className="h-4.5 w-4.5 text-[#FFD700]" />
                  <span>Customer Directory</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </button>

              <button
                onClick={() => setActiveTab("reports")}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                  activeTab === "reports"
                    ? "bg-[#032B73] text-white border-l-4 border-[#FFD700] shadow-md"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <FileText className="h-4.5 w-4.5 text-[#FFD700]" />
                  <span>Audit Logs & Reports</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all text-sm font-bold ${
                  activeTab === "settings"
                    ? "bg-[#032B73] text-white border-l-4 border-[#FFD700] shadow-md"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Database className="h-4.5 w-4.5 text-[#FFD700]" />
                  <span>Cloud & Local Sync</span>
                </div>
                <ChevronRight className="h-4 w-4 opacity-50" />
              </button>
            </nav>
          </div>

          {/* Quick Hub Statistics Summary Widget */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-md">
            <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3">Gateway Feed</h3>
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">SUPABASE API</span>
                <span className="text-emerald-400 font-bold font-mono">CONNECTED</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">VITE ROUTER</span>
                <span className="text-emerald-400 font-bold font-mono">INDEPENDENT</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-mono">DATABASE ID</span>
                <span className="text-blue-300 font-mono font-bold">bmloeehi...</span>
              </div>
              <div className="border-t border-slate-800/50 my-2 pt-2">
                <button 
                  onClick={fetchShipmentsAndStats}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-xs py-2 rounded-lg font-bold flex items-center justify-center space-x-1 transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Force Database Sync</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Workspace Content Console */}
        <main className="flex-grow bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative min-h-[500px]">
          
          {loading && (
            <div className="absolute inset-0 bg-slate-950/70 z-30 rounded-3xl flex items-center justify-center">
              <div className="text-center space-y-3">
                <RefreshCw className="h-10 w-10 text-[#FFD700] animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono">SYNCHRONIZING WITH CLOUD DATABASE...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start space-x-3 mb-6">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Synchronize Error</h4>
                <p className="text-xs mt-1 text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Operations Dashboard</h2>
                <p className="text-xs text-slate-400 mt-1">Real-time data visualization and dispatcher queue summary.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Total Freight Logs</span>
                  <strong className="text-3xl font-black text-white mt-1.5 block">{stats.totalShipments}</strong>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">In Transit</span>
                  <strong className="text-3xl font-black text-blue-400 mt-1.5 block">{stats.inTransit}</strong>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Delivered</span>
                  <strong className="text-3xl font-black text-emerald-400 mt-1.5 block">{stats.deliveredShipments}</strong>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-md">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Awaiting Verification</span>
                  <strong className="text-3xl font-black text-yellow-400 mt-1.5 block">{stats.pendingVerification}</strong>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between shadow-md col-span-2 lg:col-span-1">
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Today's Bookings</span>
                  <strong className="text-3xl font-black text-fuchsia-400 mt-1.5 block">{stats.todayBookings}</strong>
                </div>
              </div>

              {/* Sub-Layout: Shipment List Preview and Quick Search */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 pt-2">
                <div className="xl:col-span-2 bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider">Outbound Shipments</h3>
                    <button 
                      onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                      className="bg-[#FFD700] hover:bg-yellow-400 text-[#032B73] text-xs font-bold px-3 py-1.5 rounded-lg flex items-center space-x-1.5 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Register Outbound Cargo</span>
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-medium text-slate-300">
                      <thead>
                        <tr className="border-b border-slate-800/80 text-slate-500 font-mono">
                          <th className="py-2.5">Tracking Number</th>
                          <th className="py-2.5">Route</th>
                          <th className="py-2.5">Receiver</th>
                          <th className="py-2.5">Service</th>
                          <th className="py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {shipments.slice(0, 5).map(s => (
                          <tr key={s.trackingNumber} className="hover:bg-slate-800/20">
                            <td className="py-3 font-mono font-bold text-blue-300">{s.trackingNumber}</td>
                            <td className="py-3">{s.originCountry} ➔ {s.destinationCountry}</td>
                            <td className="py-3">{s.receiverName}</td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.serviceType === "Express" ? "bg-red-500/10 text-red-400" :
                                s.serviceType === "Standard" ? "bg-blue-500/10 text-blue-400" : "bg-slate-500/10 text-slate-400"
                              }`}>
                                {s.serviceType}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                s.currentMilestoneIndex === 23 ? "bg-emerald-500/10 text-emerald-400" :
                                s.isPaused ? "bg-yellow-500/10 text-yellow-500 animate-pulse" : "bg-blue-500/10 text-blue-400"
                              }`}>
                                {s.isPaused ? "PAUSED" : MILESTONES[s.currentMilestoneIndex]?.name || "Unknown"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {shipments.length > 5 && (
                    <div className="text-center pt-2">
                      <button 
                        onClick={() => setActiveTab("shipments")}
                        className="text-xs text-blue-400 hover:text-white font-bold inline-flex items-center space-x-1 transition-all"
                      >
                        <span>View all {shipments.length} logged shipments</span>
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Audit & Dispatch Log Monitor */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider">Hub Activity Feed</h3>
                  <div className="space-y-3 max-h-[250px] overflow-y-auto pr-1 font-mono text-[10px]">
                    {auditLogs.map((log, i) => (
                      <div key={i} className="border-b border-slate-900 pb-2">
                        <div className="flex items-center justify-between text-slate-500">
                          <span>{log.time}</span>
                          <span className={`px-1.5 py-0.2 rounded font-bold uppercase text-[8px] ${
                            log.type === "success" ? "bg-emerald-500/10 text-emerald-400" :
                            log.type === "warn" ? "bg-yellow-500/10 text-yellow-500" : "bg-slate-500/10 text-slate-400"
                          }`}>{log.type}</span>
                        </div>
                        <p className="text-slate-300 mt-1 font-semibold break-all leading-relaxed">{log.action}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SHIPMENTS REGISTRY */}
          {activeTab === "shipments" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">Consignment Registry</h2>
                  <p className="text-xs text-slate-400 mt-1">Manage and track all logistics cargo files.</p>
                </div>
                <button 
                  onClick={() => { resetForm(); setIsCreateModalOpen(true); }}
                  className="bg-[#FFD700] hover:bg-yellow-400 text-[#032B73] text-sm font-black uppercase tracking-wider py-3 px-5 rounded-xl flex items-center justify-center space-x-2 shadow-md shrink-0"
                >
                  <Plus className="h-4 w-4 font-black" />
                  <span>Register Cargo File</span>
                </button>
              </div>

              {/* Search filter row */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  type="text"
                  placeholder="Filter by Tracking ID, Reference Code, Sender, Consignee, or Gateway Airport..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                />
              </div>

              {/* Shipments Table */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-md overflow-x-auto">
                <table className="w-full text-left text-xs font-medium text-slate-300 min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-mono uppercase tracking-wider">
                      <th className="py-4.5 px-5">Tracking Details</th>
                      <th className="py-4.5 px-5">Consignor / Consignee</th>
                      <th className="py-4.5 px-5">Route & Weight</th>
                      <th className="py-4.5 px-5">Logistics Milestone</th>
                      <th className="py-4.5 px-5 text-center">Execution Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredShipments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500 font-mono font-bold">
                          NO ACTIVE FREIGHT RECORDS MATCH THE QUERY
                        </td>
                      </tr>
                    ) : (
                      filteredShipments.map(s => (
                        <tr key={s.trackingNumber} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-4.5 px-5 space-y-1">
                            <span className="block font-mono font-bold text-blue-300 text-sm">{s.trackingNumber}</span>
                            <span className="block text-[10px] text-slate-500 font-mono">REF: {s.referenceNumber}</span>
                            <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-white/5 border border-white/5 uppercase">{s.serviceType} Service</span>
                          </td>
                          <td className="py-4.5 px-5 space-y-1">
                            <div className="text-white font-bold">{s.senderName}</div>
                            <div className="text-slate-400 text-[10px]">➔ {s.receiverName}</div>
                            {s.phoneNumber && <div className="text-slate-500 font-mono text-[9px]">{s.phoneNumber}</div>}
                          </td>
                          <td className="py-4.5 px-5 space-y-1">
                            <div className="text-white">{s.originCountry} ➔ {s.destinationCountry}</div>
                            <div className="text-slate-400 font-mono text-[10px]">Weight: {s.weight} KG</div>
                            <div className="text-slate-500 font-mono text-[10px]">Packages: {s.numberOfPackages} ctn</div>
                          </td>
                          <td className="py-4.5 px-5 space-y-1.5">
                            <div className="flex items-center space-x-1.5">
                              <span className={`inline-block h-1.5 w-1.5 rounded-full ${
                                s.currentMilestoneIndex === 23 ? "bg-emerald-500" :
                                s.isPaused ? "bg-yellow-500 animate-pulse" : "bg-blue-400"
                              }`} />
                              <span className="text-white font-bold text-[11px]">
                                {s.isPaused ? "PAUSED" : MILESTONES[s.currentMilestoneIndex]?.name || "Unknown"}
                              </span>
                            </div>
                            {s.portGateway && (
                              <div className="text-[10px] font-mono text-slate-400">Hub: {s.portGateway}</div>
                            )}
                          </td>
                          <td className="py-4.5 px-5">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => startStatusUpdate(s)}
                                title="Update Dispatch Stage"
                                className="bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white transition-all p-2 rounded-lg"
                              >
                                <Sliders className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openEditModal(s)}
                                title="Modify Cargo File"
                                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all p-2 rounded-lg"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => togglePauseShipment(s)}
                                title={s.isPaused ? "Resume Transit" : "Hold Transit"}
                                className={`p-2 rounded-lg transition-all ${
                                  s.isPaused 
                                    ? "bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white" 
                                    : "bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-slate-950"
                                }`}
                              >
                                {s.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteShipment(s.trackingNumber)}
                                title="Purge Record"
                                className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white transition-all p-2 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TRANSIT STATUS UPDATES */}
          {activeTab === "transit" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Hub Dispatch Controller</h2>
                <p className="text-xs text-slate-400 mt-1">Submit logistics milestone events and release status updates.</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Status Selection / Details */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-md">
                  <h3 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-800 pb-3">Status Dispatch Panel</h3>

                  {!selectedStatusShipment ? (
                    <div className="py-12 text-center text-slate-500 font-mono font-semibold">
                      <Sliders className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                      <p>CHOOSE A CARGO FILE FROM THE LIST OR SIDEBAR TO DEPLOY NEW HUB STATUS UPDATES</p>
                    </div>
                  ) : (
                    <form onSubmit={handleMilestoneUpdate} className="space-y-5">
                      <div className="bg-slate-900/50 p-4 rounded-xl space-y-2 border border-slate-800/40">
                        <span className="text-[10px] font-mono text-slate-500 uppercase">ACTIVE CONSIGNMENT DETAILS</span>
                        <div className="text-base font-mono font-black text-blue-300">{selectedStatusShipment.trackingNumber}</div>
                        <div className="text-xs text-slate-400">{selectedStatusShipment.senderName} ➔ {selectedStatusShipment.receiverName}</div>
                        <div className="text-xs text-slate-400">Current Milestone: <strong className="text-yellow-400 font-extrabold">{MILESTONES[selectedStatusShipment.currentMilestoneIndex]?.name}</strong></div>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider mb-2">Select Milestone Event</label>
                        <select
                          value={newMilestoneIndex}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setNewMilestoneIndex(val);
                            setCustomDescription(MILESTONES[val]?.description || "");
                          }}
                          className="w-full bg-slate-900 border border-slate-800 text-xs font-bold text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                        >
                          {MILESTONES.map((m, i) => (
                            <option key={i} value={i} className="bg-slate-950 py-1 font-sans">{i}. {m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase tracking-wider mb-2">Custom Hub Dispatch Description / Notes</label>
                        <textarea
                          rows={4}
                          value={customDescription}
                          onChange={(e) => setCustomDescription(e.target.value)}
                          placeholder="Provide dynamic, location-specific logs for this shipment status event..."
                          className="w-full bg-slate-900 border border-slate-800 text-xs font-semibold text-white rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-[#FFD700] placeholder-slate-600"
                        />
                      </div>

                      <div className="flex space-x-3 pt-2">
                        <button
                          type="submit"
                          disabled={statusUpdateLoading}
                          className="flex-grow bg-[#FFD700] hover:bg-yellow-400 text-[#032B73] transition-all font-black text-xs uppercase py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg tracking-wider"
                        >
                          {statusUpdateLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              <span>Deploy Milestone Event</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setSelectedStatusShipment(null); setCustomDescription(""); }}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3.5 px-5 rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Left side quick selection list */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
                  <h3 className="text-sm font-mono font-bold text-[#FFD700] uppercase tracking-wider mb-2">Select Cargo</h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Quick filter registry..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="block w-full pl-3 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs font-semibold text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                    />
                  </div>

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                    {filteredShipments.map(s => (
                      <button
                        key={s.trackingNumber}
                        onClick={() => {
                          setSelectedStatusShipment(s);
                          setNewMilestoneIndex(s.currentMilestoneIndex);
                          setCustomDescription(MILESTONES[s.currentMilestoneIndex]?.description || "");
                        }}
                        className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                          selectedStatusShipment?.trackingNumber === s.trackingNumber
                            ? "bg-[#032B73]/20 border-blue-500/50"
                            : "bg-slate-900/50 hover:bg-slate-900 border-slate-800/60"
                        }`}
                      >
                        <div>
                          <div className="font-mono font-bold text-blue-300 text-xs">{s.trackingNumber}</div>
                          <div className="text-[10px] text-slate-400 mt-1">{s.senderName} ➔ {s.receiverName}</div>
                          <div className="text-[9px] font-mono text-slate-500 uppercase mt-0.5">{MILESTONES[s.currentMilestoneIndex]?.name}</div>
                        </div>
                        <ChevronRight className="h-4 w-4 opacity-50 text-[#FFD700]" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CUSTOMER DIRECTORY */}
          {activeTab === "customers" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">Customer Directory</h2>
                <p className="text-xs text-slate-400 mt-1">Directory of consignors and consignees registered in the logistics platform.</p>
              </div>

              <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-md overflow-x-auto">
                <table className="w-full text-left text-xs font-medium text-slate-300 min-w-[600px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-500 font-mono uppercase tracking-wider">
                      <th className="py-4 px-5">Customer Name</th>
                      <th className="py-4 px-5">Association Role</th>
                      <th className="py-4 px-5">Phone Contact</th>
                      <th className="py-4 px-5">Associated Freights Count</th>
                      <th className="py-4 px-5">Freight Reference Lists</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {customersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500 font-mono font-bold">
                          NO REGISTERED CUSTOMER RECORDS LOCATED IN CLOUD DATABASE
                        </td>
                      </tr>
                    ) : (
                      customersList.map((c, i) => (
                        <tr key={i} className="hover:bg-slate-900/40">
                          <td className="py-4 px-5">
                            <div className="flex items-center space-x-2">
                              <div className="p-1.5 rounded-lg bg-blue-500/10 text-[#FFD700]">
                                <User className="h-4 w-4" />
                              </div>
                              <span className="text-white font-black text-sm">{c.name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              c.role.includes("Sender") ? "bg-fuchsia-500/10 text-fuchsia-400" : "bg-emerald-500/10 text-emerald-400"
                            }`}>
                              {c.role}
                            </span>
                          </td>
                          <td className="py-4 px-5 font-mono text-slate-400">{c.phone}</td>
                          <td className="py-4 px-5">
                            <strong className="text-white font-black text-base">{c.count}</strong>
                          </td>
                          <td className="py-4 px-5">
                            <div className="flex flex-wrap gap-1">
                              {c.trackingNumbers.map(t => (
                                <span key={t} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-blue-300 font-mono text-[9px] rounded font-bold">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: REPORTS & AUDIT LOGS */}
          {activeTab === "reports" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">Logistics & Audit Reports</h2>
                  <p className="text-xs text-slate-400 mt-1">Download freight logs, audit operations events, and inspect metrics breakdown.</p>
                </div>
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(shipments, null, 2));
                    const downloadAnchor = document.createElement('a');
                    downloadAnchor.setAttribute("href", dataStr);
                    downloadAnchor.setAttribute("download", `shipplix-logistics-report-${new Date().toISOString().split('T')[0]}.json`);
                    document.body.appendChild(downloadAnchor);
                    downloadAnchor.click();
                    downloadAnchor.remove();
                    addAuditLog("Exported full logistics data registry as JSON report download.", "success");
                  }}
                  className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-3 px-5 rounded-xl flex items-center justify-center space-x-2 transition-all border border-slate-700"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Shipment Registry Log (JSON)</span>
                </button>
              </div>

              {/* Service type metrics summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Express Dispatch Weight</span>
                  <div className="text-2xl font-black text-red-400 font-mono">
                    {shipments.filter(s => s.serviceType === "Express").reduce((sum, s) => sum + s.weight, 0).toFixed(1)} KG
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">Count: {shipments.filter(s => s.serviceType === "Express").length} shipments</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Standard Freight Weight</span>
                  <div className="text-2xl font-black text-blue-400 font-mono">
                    {shipments.filter(s => s.serviceType === "Standard").reduce((sum, s) => sum + s.weight, 0).toFixed(1)} KG
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">Count: {shipments.filter(s => s.serviceType === "Standard").length} shipments</span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
                  <span className="text-[10px] font-mono text-slate-500 uppercase block">Economy Cargo Weight</span>
                  <div className="text-2xl font-black text-slate-400 font-mono">
                    {shipments.filter(s => s.serviceType === "Economy").reduce((sum, s) => sum + s.weight, 0).toFixed(1)} KG
                  </div>
                  <span className="text-[10px] text-slate-400 block font-mono">Count: {shipments.filter(s => s.serviceType === "Economy").length} shipments</span>
                </div>
              </div>

              {/* Operations logs terminal */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-mono font-bold text-slate-400 uppercase tracking-wider">Terminal Dispatch Log Monitor</h3>
                  <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase animate-pulse">Live Feed</span>
                </div>

                <div className="font-mono text-xs text-slate-400 space-y-2.5 max-h-[400px] overflow-y-auto bg-slate-950 p-4 rounded-xl shadow-inner border border-slate-900/50">
                  {auditLogs.map((log, i) => (
                    <div key={i} className="flex items-start space-x-2 leading-relaxed">
                      <span className="text-slate-600 shrink-0 select-none">[{log.time}]</span>
                      <span className={`font-bold shrink-0 uppercase text-[10px] ${
                        log.type === "success" ? "text-emerald-400" :
                        log.type === "warn" ? "text-yellow-500" : "text-blue-400"
                      }`}>[{log.type}]</span>
                      <span className="text-slate-300 break-all">{log.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS & BACKUP */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white">System Settings & Data Sync</h2>
                <p className="text-xs text-slate-400 mt-1">Manage database syncs, configure settings parameters, and serialize backups.</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                
                {/* Database Backup Tool */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
                  <div className="flex items-center space-x-2 text-[#FFD700] mb-1">
                    <Database className="h-5 w-5" />
                    <h3 className="text-sm font-mono font-bold uppercase tracking-wider">Filesystem DB Backup Engine</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Serialize current cloud-synchronized datasets into a local JSON backup snapshot on the host filesystem. This provides disaster recovery compliance.
                  </p>

                  <div className="pt-2">
                    <button
                      onClick={triggerDatabaseBackup}
                      disabled={backupLoading}
                      className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all border border-slate-700 disabled:opacity-50"
                    >
                      {backupLoading ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          <span>Trigger Manual DB Backup</span>
                        </>
                      )}
                    </button>
                  </div>

                  {backupResult && (
                    <div className={`p-4 rounded-xl text-xs border ${
                      backupResult.filename ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-400" : "bg-slate-900 border-slate-800 text-slate-300"
                    }`}>
                      <div className="font-bold flex items-center space-x-1">
                        <CheckCircle2 className="h-4 w-4 text-[#FFD700]" />
                        <span>Backup Operation Finished</span>
                      </div>
                      {backupResult.filename && (
                        <div className="mt-1.5 space-y-0.5 font-mono text-[10px]">
                          <div>File: {backupResult.filename}</div>
                          <div>Path: /backups/{backupResult.filename}</div>
                        </div>
                      )}
                      <p className="mt-1.5 leading-relaxed">{backupResult.message}</p>
                    </div>
                  )}
                </div>

                {/* Simulated notifications / operation controls */}
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-md">
                  <div className="flex items-center space-x-2 text-[#FFD700] mb-1">
                    <Sliders className="h-5 w-5" />
                    <h3 className="text-sm font-mono font-bold uppercase tracking-wider">Dispatch System Controls</h3>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div>
                        <div className="text-xs font-bold text-white">Automated Email Notifications</div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Send transaction triggers via Shipplix Gateway.</p>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold text-[9px]">ACTIVE</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-900 pb-3">
                      <div>
                        <div className="text-xs font-bold text-white">SMS / WhatsApp API Ping</div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Send milestone triggers to client cellphones.</p>
                      </div>
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold text-[9px]">ACTIVE</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-white">Operations Sandbox Mode</div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Bypass payment locks and fuel surcharges.</p>
                      </div>
                      <span className="bg-[#FFD700]/10 text-[#FFD700] px-2 py-0.5 rounded font-mono font-bold text-[9px]">BYPASS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CREATE SHIPMENT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 relative">
            <h3 className="text-base font-black uppercase text-white tracking-wider border-b border-slate-800 pb-3">Register Outbound Cargo File</h3>

            <form onSubmit={handleCreateShipment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Tracking ID (SPX-YYYYMMDD-XXXX)</label>
                  <div className="flex space-x-1.5">
                    <input
                      type="text"
                      required
                      placeholder="SPX-20260715-9128"
                      value={formTracking}
                      onChange={(e) => setFormTracking(e.target.value)}
                      className="flex-grow bg-slate-950 border border-slate-800 text-xs font-bold text-white rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-[#FFD700]"
                    />
                    <button
                      type="button"
                      onClick={generateTrackingNumber}
                      className="bg-[#FFD700] hover:bg-yellow-400 text-[#032B73] px-3 rounded-lg text-[10px] font-mono font-black uppercase"
                    >
                      Gen ID
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Reference Code (REF-XXXXXXXX)</label>
                  <input
                    type="text"
                    placeholder="REF-74829312"
                    value={formReference}
                    onChange={(e) => setFormReference(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-bold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Consignor (Sender Name)</label>
                  <input
                    type="text"
                    required
                    placeholder="Mrs. Adebayo (Fashion Vendor)"
                    value={formSender}
                    onChange={(e) => setFormSender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Consignee (Receiver Name)</label>
                  <input
                    type="text"
                    required
                    placeholder="Sarah Jenkins"
                    value={formReceiver}
                    onChange={(e) => setFormReceiver(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    placeholder="+1 (415) 555-2671"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Origin Country</label>
                  <input
                    type="text"
                    required
                    placeholder="Nigeria"
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Destination Country</label>
                  <input
                    type="text"
                    required
                    placeholder="United States"
                    value={formDestination}
                    onChange={(e) => setFormDestination(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Weight (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    placeholder="12.5"
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Number of Packages</label>
                  <input
                    type="number"
                    required
                    placeholder="2"
                    value={formPackages}
                    onChange={(e) => setFormPackages(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Service Level Priority</label>
                  <select
                    value={formServiceType}
                    onChange={(e) => setFormServiceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-bold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  >
                    <option value="Express">Express Airfreight</option>
                    <option value="Standard">Standard Outbound</option>
                    <option value="Economy">Economy Saver</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Transit Port Hub Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="LOS Hub / LHR Terminal"
                    value={formPortGateway}
                    onChange={(e) => setFormPortGateway(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Booking Date</label>
                  <input
                    type="date"
                    required
                    value={formBookingDate}
                    onChange={(e) => setFormBookingDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={formExpectedDate}
                    onChange={(e) => setFormExpectedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Consignment Handling Notes / Manifest Details</label>
                  <textarea
                    rows={3}
                    placeholder="Ankara fabric, high-priority customs clearance instructions..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-grow bg-[#FFD700] hover:bg-yellow-400 text-[#032B73] transition-all font-black text-xs uppercase py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg"
                >
                  {formLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Register New Cargo File</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 px-5 rounded-xl"
                >
                  Close Window
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SHIPMENT MODAL */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 relative">
            <h3 className="text-base font-black uppercase text-white tracking-wider border-b border-slate-800 pb-3">Edit Cargo File // {formTracking}</h3>

            <form onSubmit={handleEditShipment} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Consignor (Sender Name)</label>
                  <input
                    type="text"
                    required
                    value={formSender}
                    onChange={(e) => setFormSender(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Consignee (Receiver Name)</label>
                  <input
                    type="text"
                    required
                    value={formReceiver}
                    onChange={(e) => setFormReceiver(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Origin Country</label>
                  <input
                    type="text"
                    required
                    value={formOrigin}
                    onChange={(e) => setFormOrigin(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Destination Country</label>
                  <input
                    type="text"
                    required
                    value={formDestination}
                    onChange={(e) => setFormDestination(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Weight (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={formWeight}
                    onChange={(e) => setFormWeight(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Number of Packages</label>
                  <input
                    type="number"
                    required
                    value={formPackages}
                    onChange={(e) => setFormPackages(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Service Level Priority</label>
                  <select
                    value={formServiceType}
                    onChange={(e) => setFormServiceType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-bold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  >
                    <option value="Express">Express Airfreight</option>
                    <option value="Standard">Standard Outbound</option>
                    <option value="Economy">Economy Saver</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Transit Port Hub Code</label>
                  <input
                    type="text"
                    value={formPortGateway}
                    onChange={(e) => setFormPortGateway(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Booking Date</label>
                  <input
                    type="date"
                    required
                    value={formBookingDate}
                    onChange={(e) => setFormBookingDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={formExpectedDate}
                    onChange={(e) => setFormExpectedDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] font-mono font-bold text-slate-400 block uppercase mb-1">Consignment Handling Notes / Manifest Details</label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-xs font-semibold text-white rounded-lg py-2.5 px-3 focus:outline-none placeholder-slate-600"
                  />
                </div>
              </div>

              <div className="flex space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-grow bg-[#FFD700] hover:bg-yellow-400 text-[#032B73] transition-all font-black text-xs uppercase py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-lg"
                >
                  {formLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <span>Save Cargo Details</span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3 px-5 rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
