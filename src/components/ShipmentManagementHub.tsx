import React, { useState } from "react";
import { 
  Shipment, 
  MILESTONES, 
  InternalNote, 
  ShipmentDocument, 
  PaymentTransaction 
} from "../types.js";
import { formatCurrency, getCurrencySymbol } from "../utils/currencyUtils.ts";
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  FileText, 
  Upload, 
  Plus, 
  History, 
  DollarSign, 
  Calendar, 
  Sliders, 
  MapPin, 
  Send, 
  ArrowRight, 
  RefreshCw, 
  File, 
  Image as ImageIcon, 
  CreditCard, 
  AlertCircle,
  Activity,
  ChevronRight,
  Shield,
  FileMinus
} from "lucide-react";

interface ShipmentManagementHubProps {
  shipment: Shipment;
  actionLoading: string | null;
  onUpdateMilestone: (shipment: Shipment, index: number, customDescription?: string) => Promise<any>;
  onUpdateStatusAndHealth: (trackingNumber: string, health: string, delayStatus: string, author?: string) => Promise<any>;
  onAddInternalNote: (trackingNumber: string, text: string, author?: string) => Promise<any>;
  onUploadDocument: (trackingNumber: string, doc: { name: string; type: string; url: string; size: string; author?: string; }) => Promise<any>;
  onAddPaymentTransaction: (trackingNumber: string, tx: { amount: number; method: string; reference: string; date?: string; author?: string; }) => Promise<any>;
  onReturnToFleet: () => void;
  adminEmail: string;
}

type SubTab = "overview" | "notes" | "documents" | "payments" | "audit";

export const ShipmentManagementHub: React.FC<ShipmentManagementHubProps> = ({
  shipment,
  actionLoading,
  onUpdateMilestone,
  onUpdateStatusAndHealth,
  onAddInternalNote,
  onUploadDocument,
  onAddPaymentTransaction,
  onReturnToFleet,
  adminEmail
}) => {
  const [subTab, setSubTab] = useState<SubTab>("overview");

  // Health and Delay States
  const [healthSelect, setHealthSelect] = useState(shipment.shipmentHealth || "optimal");
  const [delayText, setDelayText] = useState(shipment.delayStatus || "None");

  // Milestone State
  const [milestoneIndex, setMilestoneIndex] = useState(shipment.currentMilestoneIndex);
  const [customDescription, setCustomDescription] = useState(
    MILESTONES[shipment.currentMilestoneIndex]?.description || ""
  );

  // Internal Note State
  const [noteText, setNoteText] = useState("");

  // Document upload state
  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState<"invoice" | "receipt" | "image" | "attachment">("attachment");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Payment states
  const [txAmount, setTxAmount] = useState("");
  const [txMethod, setTxMethod] = useState("Credit Card");
  const [txRef, setTxRef] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().split("T")[0]);

  // Handle milestone change selector
  const selectMilestoneIndex = (idx: number) => {
    setMilestoneIndex(idx);
    setCustomDescription(MILESTONES[idx].description);
  };

  // Dispatch milestone submit
  const handleMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateMilestone(shipment, milestoneIndex, customDescription);
  };

  // Save Health and Delay
  const handleHealthSave = async () => {
    await onUpdateStatusAndHealth(shipment.trackingNumber, healthSelect, delayText, adminEmail);
  };

  // Add internal note submit
  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    const success = await onAddInternalNote(shipment.trackingNumber, noteText.trim(), adminEmail);
    if (success) {
      setNoteText("");
    }
  };

  // Add Payment Transaction submit
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    const reference = txRef.trim() || `TX-${Math.floor(100000 + Math.random() * 900000)}`;
    const success = await onAddPaymentTransaction(shipment.trackingNumber, {
      amount,
      method: txMethod,
      reference,
      date: txDate,
      author: adminEmail
    });

    if (success) {
      setTxAmount("");
      setTxRef("");
    }
  };

  // Drag and drop events for file uploading
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setDocFile(file);
      setDocName(file.name);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setDocFile(file);
      setDocName(file.name);
    }
  };

  // Link file document submit
  const handleDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) return;
    
    const mockSize = docFile ? `${Math.round(docFile.size / 1024)} KB` : `${Math.floor(50 + Math.random() * 200)} KB`;
    
    // Convert to a simulated local asset reference
    const success = await onUploadDocument(shipment.trackingNumber, {
      name: docName.trim(),
      type: docType,
      url: "#", // mockup url
      size: mockSize,
      author: adminEmail
    });

    if (success) {
      setDocName("");
      setDocFile(null);
    }
  };

  // Health Styling maps
  const getHealthStyles = (health: string) => {
    switch (health) {
      case "optimal":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          dot: "bg-emerald-500",
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
          label: "On Track / Optimal"
        };
      case "delayed":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          dot: "bg-amber-500",
          icon: <Clock className="h-4 w-4 text-amber-600 animate-pulse" />,
          label: "Delayed"
        };
      case "action_required":
        return {
          bg: "bg-orange-50 text-orange-800 border-orange-200",
          dot: "bg-orange-500",
          icon: <AlertTriangle className="h-4 w-4 text-orange-600 animate-bounce" />,
          label: "Action Required"
        };
      case "critical":
        return {
          bg: "bg-red-50 text-red-800 border-red-200",
          dot: "bg-red-500",
          icon: <ShieldAlert className="h-4 w-4 text-red-600 animate-ping" />,
          label: "Critical Exception"
        };
      default:
        return {
          bg: "bg-gray-50 text-gray-800 border-gray-200",
          dot: "bg-gray-500",
          icon: <CheckCircle2 className="h-4 w-4 text-gray-600" />,
          label: "Unknown"
        };
    }
  };

  const healthStyle = getHealthStyles(shipment.shipmentHealth || "optimal");

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-[fadeIn_0.2s_ease-out]">
      {/* Hub Header Block */}
      <div className="bg-gradient-to-r from-[#032B73] to-blue-900 text-white p-5 sm:p-6 border-b-4 border-[#FFD700] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono font-bold bg-[#FFD700] text-blue-950 px-2 py-0.5 rounded uppercase tracking-wider">
              Selected Registry File
            </span>
            <div className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center space-x-1 ${healthStyle.bg}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${healthStyle.dot}`} />
              <span>{healthStyle.label}</span>
            </div>
          </div>
          
          <h2 className="text-lg sm:text-xl font-black mt-1.5 flex items-center space-x-2">
            <Sliders className="h-5.5 w-5.5 text-[#FFD700]" />
            <span>Management Hub:</span>
            <span className="font-mono tracking-wide bg-blue-950/40 px-2.5 py-0.5 rounded text-[#FFD700]">{shipment.trackingNumber}</span>
          </h2>

          <p className="text-xs text-blue-100 mt-1 flex items-center flex-wrap gap-x-3 gap-y-1">
            <span>Consignor: <strong>{shipment.senderName}</strong></span>
            <ChevronRight className="h-3 w-3 text-blue-300" />
            <span>Consignee: <strong>{shipment.receiverName}</strong></span>
            <ChevronRight className="h-3 w-3 text-blue-300" />
            <span className="flex items-center">
              <MapPin className="h-3 w-3 text-amber-300 mr-1" />
              {shipment.destinationCountry} {shipment.portGateway ? `(${shipment.portGateway})` : ""}
            </span>
          </p>
        </div>

        <button
          onClick={onReturnToFleet}
          className="bg-white/10 hover:bg-white/20 text-white border border-white/25 hover:border-white/40 px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 self-stretch sm:self-auto text-center"
        >
          ← Return to Fleet
        </button>
      </div>

      {/* Hub Tabs Menu */}
      <div className="flex border-b border-gray-200 overflow-x-auto bg-slate-50 px-4">
        {(["overview", "notes", "documents", "payments", "audit"] as SubTab[]).map((tab) => {
          const isActive = subTab === tab;
          let label = "";
          let icon = null;

          if (tab === "overview") {
            label = "Timeline & Health";
            icon = <Activity className="h-4 w-4" />;
          } else if (tab === "notes") {
            label = `Staff Notes (${shipment.internalNotes?.length || 0})`;
            icon = <FileText className="h-4 w-4" />;
          } else if (tab === "documents") {
            label = `Documents (${shipment.documents?.length || 0})`;
            icon = <Upload className="h-4 w-4" />;
          } else if (tab === "payments") {
            const statusLabel = shipment.paymentHistory?.status || "pending";
            label = `Ledger (${statusLabel.replace("_", " ").toUpperCase()})`;
            icon = <DollarSign className="h-4 w-4" />;
          } else if (tab === "audit") {
            label = "Audit Trails";
            icon = <History className="h-4 w-4" />;
          }

          return (
            <button
              key={tab}
              id={`hub-tab-${tab}`}
              onClick={() => setSubTab(tab)}
              className={`flex items-center space-x-2 py-3.5 px-4 font-bold text-xs sm:text-sm tracking-wide shrink-0 transition-all border-b-2 -mb-px ${
                isActive
                  ? "border-blue-700 text-blue-700 font-black bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
              }`}
            >
              {icon}
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panel Body Content */}
      <div className="p-6">
        
        {/* TAB 1: OVERVIEW & DISPATCH MILESTONE CONTROLLER */}
        {subTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Col: Health Status & Delays settings */}
            <div className="lg:col-span-1 space-y-6">
              <div className="border border-gray-200 rounded-xl p-5 bg-slate-50/50 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center space-x-1.5 border-b border-gray-200 pb-2">
                  <Sliders className="h-4 w-4 text-blue-600" />
                  <span>Logistics Health Control</span>
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                    Calculated Health Status
                  </label>
                  <select
                    id="hub-health-select"
                    value={healthSelect}
                    onChange={(e) => setHealthSelect(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-700 focus:outline-none"
                  >
                    <option value="optimal">On Track (Optimal)</option>
                    <option value="delayed">Delayed</option>
                    <option value="action_required">Action Required</option>
                    <option value="critical">Critical Exception (On Hold)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                    Active Delay / Exception Factor
                  </label>
                  <input
                    id="hub-delay-input"
                    type="text"
                    value={delayText}
                    onChange={(e) => setDelayText(e.target.value)}
                    placeholder="e.g. Weather, Customs Hold, None"
                    className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white"
                  />
                  <p className="text-[9px] text-gray-400">Specify why the shipment is delayed, or enter 'None'.</p>
                </div>

                <button
                  id="hub-save-health-btn"
                  type="button"
                  onClick={handleHealthSave}
                  disabled={actionLoading === "status-update"}
                  className="w-full bg-[#032B73] hover:bg-blue-900 text-[#FFD700] text-xs font-black py-2 rounded-lg transition-all flex items-center justify-center space-x-1"
                >
                  {actionLoading === "status-update" ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <span>Apply Health Override</span>
                  )}
                </button>
              </div>

              {/* Package Details Info Box */}
              <div className="border border-gray-100 rounded-xl p-5 space-y-3 bg-blue-50/10">
                <h4 className="text-[11px] font-mono font-bold text-gray-600 uppercase tracking-wide">
                  Transit Details
                </h4>
                
                <div className="space-y-2 text-xs font-semibold text-gray-700 font-mono">
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-1.5">
                    <span className="text-gray-400">Booking Speed:</span>
                    <span className="text-[#032B73] font-bold">{shipment.serviceType} Speed</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-1.5">
                    <span className="text-gray-400">Total Weight:</span>
                    <span>{shipment.weight} KG</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-1.5">
                    <span className="text-gray-400">Cargo Count:</span>
                    <span>{shipment.numberOfPackages} Package(s)</span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-100 pb-1.5">
                    <span className="text-gray-400">Registration Date:</span>
                    <span>{shipment.bookingDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Est. Arrival:</span>
                    <span className="text-emerald-700 font-bold">{shipment.expectedDeliveryDate}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Cols: Timeline Progression controller */}
            <div className="lg:col-span-2 space-y-6">
              
              <div className="bg-slate-50 rounded-xl p-5 border border-gray-200">
                <div className="border-b border-gray-200 pb-3 mb-4">
                  <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center space-x-1.5">
                    <Sliders className="h-4 w-4 text-[#032B73]" />
                    <span>Progression Milestone Stage Selector</span>
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Select a predefined transit milestone to advance the cargo state on the customer's timeline tracker.
                  </p>
                </div>

                <form onSubmit={handleMilestoneSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Select menu */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                        Active Transit Milestone (Total {MILESTONES.length})
                      </label>
                      <select
                        id="hub-milestone-select"
                        value={milestoneIndex}
                        onChange={(e) => selectMilestoneIndex(parseInt(e.target.value))}
                        className="w-full border border-gray-200 rounded-lg p-2.5 text-xs font-bold bg-white focus:ring-2 focus:ring-blue-700 focus:outline-none"
                      >
                        {MILESTONES.map((m, mIdx) => (
                          <option key={mIdx} value={mIdx}>
                            Stage {(mIdx + 1).toString().padStart(2, "0")}: {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Previews current index info */}
                    <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 flex items-center space-x-3 text-xs text-blue-900">
                      <div className="h-8 w-8 rounded-full bg-[#032B73] text-white flex items-center justify-center font-bold text-xs font-mono">
                        {milestoneIndex + 1}
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-mono block">STAGE CODE</span>
                        <strong className="block">{MILESTONES[milestoneIndex].name}</strong>
                      </div>
                    </div>

                  </div>

                  {/* Text area for custom description details */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                        Milestone Detailed Description
                      </label>
                      <button
                        type="button"
                        onClick={() => setCustomDescription(MILESTONES[milestoneIndex].description)}
                        className="text-blue-700 hover:underline text-[9px] font-bold"
                      >
                        Reset to default template
                      </button>
                    </div>
                    
                    <textarea
                      id="hub-milestone-description"
                      rows={3}
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-3 text-xs bg-white"
                      placeholder="Enter detailed notes about this specific cargo event status..."
                    />
                  </div>

                  <div className="flex justify-end pt-2 border-t border-gray-200">
                    <button
                      id="hub-milestone-submit-btn"
                      type="submit"
                      disabled={actionLoading === "milestone"}
                      className="bg-blue-700 hover:bg-blue-800 text-white font-black text-xs px-5 py-2.5 rounded-lg transition-all flex items-center space-x-1.5 shadow-sm"
                    >
                      {actionLoading === "milestone" ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Dispatch Status & Notify Customers</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Milestones History Progress Checklist */}
              <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4">
                <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center space-x-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Milestone Verification Checklist</span>
                </h3>

                <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 divide-y divide-gray-100">
                  {shipment.milestoneHistory?.map((h, hIdx) => (
                    <div key={hIdx} className="pt-2.5 first:pt-0 flex justify-between items-start text-xs">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-blue-900 bg-blue-50 px-1.5 py-0.2 rounded text-[10px]">
                            Stage {h.milestoneIndex + 1}
                          </span>
                          <strong className="text-gray-800">{h.milestoneName}</strong>
                        </div>
                        <p className="text-gray-500 mt-0.5 text-[11px] leading-relaxed">{h.description}</p>
                      </div>

                      <div className="text-right shrink-0 ml-4 font-mono text-[10px] text-gray-400">
                        <span>{new Date(h.timestamp).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: STAFF INTERNAL NOTES */}
        {subTab === "notes" && (
          <div className="space-y-6">
            
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Administrative Staff Notes</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                These are private, restricted-access operational notes visible ONLY to authenticated logistics administrators. They will never display on customer track pages.
              </p>
            </div>

            {/* Note Entry form */}
            <form onSubmit={handleNoteSubmit} className="space-y-3 bg-slate-50 p-4 border border-gray-200 rounded-xl">
              <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                Write Administrative Staff Note
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <textarea
                  id="hub-note-input"
                  rows={2}
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="e.g. Customs papers verified; cargo verified for heavy loader allocation. Cargo waiting in Terminal 4..."
                  className="w-full border border-gray-200 rounded-lg p-2.5 text-xs bg-white"
                  required
                />
                
                <button
                  id="hub-note-submit-btn"
                  type="submit"
                  disabled={actionLoading === "add-note"}
                  className="bg-brand-blue hover:bg-brand-blue-dark text-brand-yellow px-6 py-2 rounded-lg text-xs font-black shrink-0 transition-all self-end sm:self-auto flex items-center justify-center space-x-1"
                >
                  {actionLoading === "add-note" ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Log Note</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Notes List Threads */}
            <div className="space-y-4">
              {shipment.internalNotes && shipment.internalNotes.length > 0 ? (
                [...shipment.internalNotes].reverse().map((note) => (
                  <div key={note.id} className="border border-gray-150 p-4 rounded-xl flex items-start space-x-3.5 hover:bg-slate-50/30 transition-colors">
                    <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-900 shrink-0 flex items-center justify-center font-bold text-xs uppercase">
                      {note.author ? note.author.charAt(0) : "S"}
                    </div>
                    
                    <div className="space-y-1 flex-grow">
                      <div className="flex justify-between items-baseline">
                        <strong className="text-xs text-gray-800">{note.author || "System Specialist"}</strong>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(note.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400 font-mono text-xs">
                  No internal staff notes logged for this shipment.
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: DOCUMENTS & ATTACHMENTS */}
        {subTab === "documents" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Link/Upload Form */}
            <div className="lg:col-span-1 space-y-4">
              <div className="border border-gray-200 rounded-xl p-5 bg-slate-50 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center space-x-1.5 border-b border-gray-200 pb-2">
                  <Upload className="h-4 w-4 text-blue-600" />
                  <span>Attach Document Link</span>
                </h3>

                <form onSubmit={handleDocumentSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                      Document / File Label Name
                    </label>
                    <input
                      id="hub-doc-name-input"
                      type="text"
                      required
                      placeholder="e.g. Export_Clearance_NIF.pdf"
                      value={docName}
                      onChange={(e) => setDocName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                      Document File Class
                    </label>
                    <select
                      id="hub-doc-type-select"
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:ring-2 focus:ring-blue-700 focus:outline-none"
                    >
                      <option value="invoice">Cargo Invoice</option>
                      <option value="receipt">Delivery Receipt</option>
                      <option value="image">Inspection Photo / Image</option>
                      <option value="attachment">Other Secure Attachment</option>
                    </select>
                  </div>

                  {/* Drag and Drop Zone Area */}
                  <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById("hub-doc-file-picker")?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                      isDragging 
                        ? "border-blue-600 bg-blue-50/50" 
                        : docFile 
                          ? "border-emerald-500 bg-emerald-50/25" 
                          : "border-gray-200 hover:border-gray-350 hover:bg-slate-100/50"
                    }`}
                  >
                    <input
                      id="hub-doc-file-picker"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Upload className={`h-6 w-6 mx-auto mb-1.5 ${docFile ? "text-emerald-500" : "text-gray-400"}`} />
                    {docFile ? (
                      <div className="text-xs">
                        <p className="font-bold text-emerald-800 truncate">{docFile.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{(docFile.size / 1024).toFixed(1)} KB (Selected)</p>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p className="font-bold">Drag and drop file here</p>
                        <p className="text-[10px] text-gray-400">or click to browse local files</p>
                      </div>
                    )}
                  </div>

                  <button
                    id="hub-doc-submit-btn"
                    type="submit"
                    disabled={actionLoading === "upload-doc"}
                    className="w-full bg-brand-blue hover:bg-brand-blue-dark text-brand-yellow text-xs font-black py-2.5 rounded-lg transition-all flex items-center justify-center space-x-1"
                  >
                    {actionLoading === "upload-doc" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>Link Document to Registry</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Documents List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="border border-gray-100 rounded-xl p-5 bg-white space-y-3">
                <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center space-x-1.5">
                  <FileText className="h-4 w-4 text-brand-blue" />
                  <span>Verified Document Registry</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {shipment.documents && shipment.documents.length > 0 ? (
                    shipment.documents.map((doc) => {
                      const isImg = doc.type === "image";
                      const isInv = doc.type === "invoice";
                      const isRec = doc.type === "receipt";

                      return (
                        <div key={doc.id} className="border border-gray-150 p-3.5 rounded-xl flex items-center justify-between hover:bg-slate-50/50 transition-all group">
                          <div className="flex items-center space-x-3 overflow-hidden">
                            <div className={`h-9 w-9 rounded-lg shrink-0 flex items-center justify-center ${
                              isImg 
                                ? "bg-purple-50 text-purple-600" 
                                : isInv 
                                  ? "bg-amber-50 text-amber-600" 
                                  : isRec 
                                    ? "bg-emerald-50 text-emerald-600" 
                                    : "bg-blue-50 text-blue-600"
                            }`}>
                              {isImg ? (
                                <ImageIcon className="h-5.5 w-5.5" />
                              ) : isInv ? (
                                <FileText className="h-5.5 w-5.5" />
                              ) : (
                                <File className="h-5.5 w-5.5" />
                              )}
                            </div>

                            <div className="overflow-hidden">
                              <span className="text-[9px] uppercase tracking-wider font-mono font-bold text-gray-400 block">
                                {doc.type}
                              </span>
                              <strong className="text-xs text-gray-700 truncate block group-hover:text-blue-700">
                                {doc.name}
                              </strong>
                              <span className="text-[10px] text-gray-400 font-mono block">
                                {doc.size || "Unknown"} • {new Date(doc.uploadedAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>

                          <a
                            href={doc.url}
                            download={doc.name}
                            onClick={(e) => {
                              if (doc.url === "#") {
                                e.preventDefault();
                                alert(`Simulated Download of: ${doc.name}. Documents registered correctly!`);
                              }
                            }}
                            className="bg-gray-100 hover:bg-brand-blue text-gray-600 hover:text-white p-1.5 rounded transition-all text-xs"
                            title="Download Link"
                          >
                            Download
                          </a>
                        </div>
                      );
                    })
                  ) : (
                    <div className="col-span-2 py-12 text-center text-gray-400 font-mono text-xs">
                      No documents associated with this shipment registry yet.
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 4: FINANCIAL LEDGER & PAYMENTS */}
        {subTab === "payments" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-[fadeIn_0.2s_ease-out]">
            
            {/* Left: Summary cards and new payment transaction recorder */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Payment Summary Metrics */}
              <div className="border border-gray-200 rounded-xl p-5 bg-slate-50 space-y-4">
                <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center space-x-1.5 border-b border-gray-200 pb-2">
                  <CreditCard className="h-4 w-4 text-brand-blue" />
                  <span>Ledger Status Summary</span>
                </h3>

                <div className="space-y-3 font-mono text-xs">
                  <div className="flex justify-between border-b border-gray-150 pb-2">
                    <span className="text-gray-500">PAYMENT STATUS:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      shipment.paymentHistory?.status === "paid"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : shipment.paymentHistory?.status === "partially_paid"
                          ? "bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"
                          : "bg-red-100 text-red-800 border border-red-200"
                    }`}>
                      {(shipment.paymentHistory?.status || "pending").toUpperCase().replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex justify-between border-b border-gray-150 pb-2 font-bold text-sm text-gray-900">
                    <span className="text-gray-500 text-xs font-semibold">TOTAL AMOUNT DUE:</span>
                    <span>{formatCurrency(shipment.paymentHistory?.amountDue || 0)}</span>
                  </div>

                  <div className="flex justify-between border-b border-gray-150 pb-2 font-bold text-emerald-700">
                    <span className="text-gray-500 font-semibold text-xs">TOTAL AMOUNT PAID:</span>
                    <span>{formatCurrency(shipment.paymentHistory?.amountPaid || 0)}</span>
                  </div>

                  <div className="flex justify-between font-bold text-red-700">
                    <span className="text-gray-500 font-semibold text-xs">OUTSTANDING BALANCE:</span>
                    <span>
                      {formatCurrency(Math.max(0, (shipment.paymentHistory?.amountDue || 0) - (shipment.paymentHistory?.amountPaid || 0)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Record payment transaction */}
              <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
                <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center space-x-1.5 border-b border-gray-100 pb-2">
                  <Plus className="h-4 w-4 text-emerald-600" />
                  <span>Record Cash/Payment transaction</span>
                </h3>

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                      Payment Amount ({getCurrencySymbol()})
                    </label>
                    <input
                      id="hub-payment-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="e.g. 150.00"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white font-mono font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                      Payment Method
                    </label>
                    <select
                      id="hub-payment-method"
                      value={txMethod}
                      onChange={(e) => setTxMethod(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white focus:outline-none"
                    >
                      <option value="Credit Card">Credit Card</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="PayPal">PayPal</option>
                      <option value="Cash / Cheque">Cash / Cheque</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                      Tx Transaction Reference (Optional)
                    </label>
                    <input
                      id="hub-payment-reference"
                      type="text"
                      placeholder="e.g. Bank Confirmation Code"
                      value={txRef}
                      onChange={(e) => setTxRef(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-gray-500 block uppercase">
                      Payment Date
                    </label>
                    <input
                      id="hub-payment-date"
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg p-2 text-xs bg-white font-mono"
                    />
                  </div>

                  <button
                    id="hub-payment-submit-btn"
                    type="submit"
                    disabled={actionLoading === "add-transaction"}
                    className="w-full bg-brand-blue hover:bg-brand-blue-dark text-brand-yellow text-xs font-black py-2.5 rounded-lg transition-all flex items-center justify-center space-x-1"
                  >
                    {actionLoading === "add-transaction" ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4" />
                        <span>Register Transaction Ledger</span>
                      </>
                    )}
                  </button>
                </form>
              </div>

            </div>

            {/* Right: Transactions Ledger table list */}
            <div className="lg:col-span-2 space-y-4">
              <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-3">
                <h3 className="text-xs font-bold text-gray-900 font-mono uppercase tracking-wider flex items-center space-x-1.5">
                  <History className="h-4 w-4 text-brand-blue" />
                  <span>Payment Transactions Ledger</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider font-mono text-[10px] font-bold">
                        <th className="py-2.5 px-3">Transaction Date</th>
                        <th className="py-2.5 px-3">Reference</th>
                        <th className="py-2.5 px-3">Payment Method</th>
                        <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-mono">
                      {shipment.paymentHistory?.transactions && shipment.paymentHistory.transactions.length > 0 ? (
                        shipment.paymentHistory.transactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-slate-50/50 transition-all font-semibold">
                            <td className="py-2.5 px-3 text-gray-600">{tx.date}</td>
                            <td className="py-2.5 px-3 text-brand-blue font-bold">{tx.reference}</td>
                            <td className="py-2.5 px-3 text-gray-700">
                              <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[10px] uppercase">
                                {tx.method}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">
                              {formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400 font-mono text-xs">
                            No ledger transactions recorded for this shipment file yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 5: AUDIT LOGS TRAIL */}
        {subTab === "audit" && (
          <div className="space-y-6">
            
            <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Shipment Audit Log History</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Complete historic record of logistics events, milestone progressions, documents added, staff notes, and cash payments logged to this file.
                </p>
              </div>
              
              <div className="flex items-center space-x-1.5 text-xs text-emerald-800 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span>Audited Registry File</span>
              </div>
            </div>

            {/* Logs Trail Timeline */}
            <div className="relative border-l-2 border-gray-100 pl-6 ml-4 space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {shipment.auditLogs && shipment.auditLogs.length > 0 ? (
                [...shipment.auditLogs].reverse().map((log) => (
                  <div key={log.id} className="relative group">
                    {/* Ring dot */}
                    <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-sm group-hover:bg-blue-800 transition-colors" />

                    <div className="space-y-1 bg-slate-50/20 hover:bg-slate-50/80 p-3 rounded-xl border border-gray-100/50 transition-all">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs gap-1">
                        <div className="flex items-center space-x-2">
                          <strong className="text-gray-800 uppercase tracking-wide font-mono text-[10px] bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded font-black">
                            {log.action}
                          </strong>
                          <span className="text-gray-400 font-mono text-[10px]">by: {log.author || "System"}</span>
                        </div>

                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(log.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit"
                          })}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 font-medium leading-relaxed mt-1">
                        {log.details || "No additional comments recorded."}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-gray-400 font-mono text-xs">
                  No administrative audit logs available for this shipment.
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
