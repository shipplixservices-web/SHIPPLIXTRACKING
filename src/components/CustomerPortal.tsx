import React, { useState, useEffect } from "react";
import { Search, MapPin, Scale, Package, Calendar, RefreshCw, Send, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { Shipment, MILESTONES } from "../types.js";
import WorldMap from "./WorldMap.tsx";
import Timeline from "./Timeline.tsx";
import ShipplixLogo from "./ShipplixLogo.tsx";

interface CustomerPortalProps {
  initialTrackingQuery?: string;
}

export default function CustomerPortal({ initialTrackingQuery = "" }: CustomerPortalProps) {
  const [trackingNumber, setTrackingNumber] = useState(initialTrackingQuery);
  const [searchedNumber, setSearchedNumber] = useState("");
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Quick test tracking numbers
  const testNumbers = [
    { num: "SPX-20260625-5522", desc: "In Transit - Customs Review" },
    { num: "SPX-20260623-2990", desc: "Out for Delivery - New York" },
    { num: "SPX-20260626-3120", desc: "Arrived at Origin Hub" },
    { num: "SPX-20260620-1080", desc: "Delivered - United Kingdom" }
  ];

  const handleTrack = async (numToTrack: string) => {
    const trimmed = numToTrack.trim().toUpperCase();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setSearchedNumber(trimmed);

    try {
      const response = await fetch(`/api/shipments/${trimmed}`);
      const data = await response.json();

      if (data.success && data.shipment) {
        setShipment(data.shipment);
      } else {
        setError(data.message || "Tracking number not recognized. Check spelling and retry.");
        setShipment(null);
      }
    } catch (err) {
      console.error("Error tracking shipment:", err);
      setError("Unable to connect to the tracking gateway. Please try again.");
      setShipment(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialTrackingQuery) {
      setTrackingNumber(initialTrackingQuery);
      handleTrack(initialTrackingQuery);
    }
  }, [initialTrackingQuery]);

  // Calculate percentage progress for the top simple progress bar
  const progressPercent = shipment 
    ? Math.round((shipment.currentMilestoneIndex / 16) * 100) 
    : 0;

  // Format booking/delivery dates beautifully
  const formatSimpleDate = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8">
      {/* Search Header Container */}
      <section className="bg-gradient-to-br from-[#032B73] to-[#043e9e] text-white py-12 px-4 sm:px-6 lg:px-8 rounded-2xl shadow-lg border-b-4 border-[#FFD700] relative overflow-hidden">
        {/* Subtle geometric design pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#ffd700_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-3xl mx-auto text-center relative z-10 flex flex-col items-center">
          <ShipplixLogo variant="banner" textColor="text-white" className="mb-6 bg-white/5 p-6 rounded-2xl border border-white/10 backdrop-blur-xs w-full max-w-md shadow-lg" />
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2">
            Real-Time Cargo Tracking Gateway
          </h1>
          <p className="text-xs sm:text-sm text-blue-200 max-w-lg mx-auto mb-8">
            Enter your Shipplix Reference or Tracking Number to verify current location, customs stage, and estimated delivery schedule.
          </p>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleTrack(trackingNumber);
            }}
            className="flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto"
          >
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="tracking-input"
                type="text"
                placeholder="Enter Tracking Number (Example: SPX-20260625-5522)"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="block w-full pl-11 pr-4 py-4 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-[#FFD700] font-bold text-sm sm:text-base shadow-inner border border-gray-200"
              />
            </div>
            <button
              id="track-submit-btn"
              type="submit"
              disabled={loading}
              className="bg-[#FFD700] text-[#032B73] hover:bg-yellow-400 active:scale-98 transition-all px-8 py-4 rounded-xl font-extrabold text-sm sm:text-base tracking-wide flex items-center justify-center space-x-2 shadow-md shrink-0"
            >
              {loading ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <span>Track Shipment</span>
                </>
              )}
            </button>
          </form>

          {/* Preset Shortcuts */}
          <div className="mt-8">
            <p className="text-xs text-blue-200 font-semibold mb-3">
              ACTIVE SHIPPING REFERENCE EXAMPLES:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {testNumbers.map((t) => (
                <button
                  id={`shortcut-${t.num}`}
                  key={t.num}
                  type="button"
                  onClick={() => {
                    setTrackingNumber(t.num);
                    handleTrack(t.num);
                  }}
                  className="bg-white/10 hover:bg-white/20 hover:text-white text-blue-100 text-xs px-3.5 py-2 rounded-lg border border-white/10 font-mono transition-all flex items-center space-x-1.5"
                >
                  <span className="font-bold text-[#FFD700]">{t.num}</span>
                  <span className="opacity-65 text-[10px] sm:inline hidden">| {t.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-4 flex items-start space-x-3 shadow-sm max-w-2xl mx-auto">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-red-800">Tracking Lookup Unsuccessful</h4>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results Workspace */}
      {shipment && (
        <div className="space-y-8 animate-[fadeIn_0.3s_ease-out]">
          
          {/* Headline Results Overview Banner */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-bold tracking-widest text-[#032B73] bg-blue-50 px-2.5 py-1 rounded border border-blue-100">
                  REF: {shipment.referenceNumber}
                </span>
                {shipment.isPaused && (
                  <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2.5 py-1 rounded border border-red-200 uppercase tracking-widest animate-pulse">
                    On Hold
                  </span>
                )}
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-[#032B73] font-mono flex items-center space-x-3">
                <span>{shipment.trackingNumber}</span>
              </h2>
              <p className="text-xs text-gray-500">
                Booking Date: <strong className="text-gray-700">{formatSimpleDate(shipment.bookingDate)}</strong>
              </p>
            </div>

            {/* Current Large Badge Status */}
            <div className="text-right flex flex-col items-start md:items-end space-y-1 shrink-0">
              <span className="text-xs text-gray-400 font-mono">CURRENT DISPATCH STATUS</span>
              <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-black tracking-wide ${
                shipment.currentMilestoneIndex === 16
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : shipment.isPaused
                    ? "bg-red-100 text-red-800 border border-red-200"
                    : "bg-blue-100 text-blue-800 border border-blue-200"
              }`}>
                {shipment.isPaused ? "On Hold / Postponed" : MILESTONES[shipment.currentMilestoneIndex].name}
              </span>
              <span className="text-[11px] text-gray-500 font-mono mt-1">
                Last Update: {new Date(shipment.milestoneHistory[shipment.milestoneHistory.length - 1]?.timestamp || "").toLocaleString()}
              </span>
            </div>
          </div>

          {/* Simple Premium Progress Bar */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-2 text-xs font-mono">
              <span className="text-gray-500 font-bold">SHIPMENT EN ROUTE</span>
              <span className="text-[#032B73] font-extrabold">{progressPercent}% COMPLETED</span>
            </div>
            
            {/* Real Progress Bar */}
            <div className="h-4 w-full bg-gray-100 rounded-full overflow-hidden relative border border-gray-200/50">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out relative ${
                  shipment.isPaused 
                    ? "bg-gradient-to-r from-red-500 to-red-600" 
                    : "bg-gradient-to-r from-[#032B73] to-[#3b82f6]"
                }`}
                style={{ width: `${progressPercent}%` }}
              >
                {/* Visual gloss effect */}
                <div className="absolute inset-0 bg-white/20 bg-linear-to-b from-transparent to-black/10" />
              </div>
            </div>

            {/* Stage Quick labels */}
            <div className="grid grid-cols-4 mt-3 text-[10px] sm:text-xs font-mono text-center">
              <div className="text-left font-bold text-blue-800">
                Origin Received
              </div>
              <div className={`font-bold ${shipment.currentMilestoneIndex >= 4 ? "text-blue-800" : "text-gray-400"}`}>
                Customs Cleared
              </div>
              <div className={`font-bold ${shipment.currentMilestoneIndex >= 10 ? "text-blue-800" : "text-gray-400"}`}>
                In Transit Flight
              </div>
              <div className={`text-right font-bold ${shipment.currentMilestoneIndex === 16 ? "text-emerald-700" : "text-gray-400"}`}>
                Delivered
              </div>
            </div>
          </div>

          {/* Map & Detail Card Side-by-Side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* World Map Component */}
            <div className="lg:col-span-2 space-y-4">
            <WorldMap 
              origin={shipment.originCountry} 
              destination={shipment.destinationCountry} 
              currentMilestoneIndex={shipment.currentMilestoneIndex}
              isPaused={shipment.isPaused}
              portGateway={shipment.portGateway}
            />
          </div>

          {/* Shipment Details Card */}
          <div className="bg-[#032B73] text-white rounded-xl p-6 shadow-md border-b-4 border-[#FFD700] space-y-6">
            <h3 className="text-lg font-black tracking-tight border-b border-white/10 pb-3 flex items-center space-x-2">
              <FileText className="h-5 w-5 text-[#FFD700]" />
              <span>Shipment Specs</span>
            </h3>

            <div className="space-y-4 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-blue-200">Tracking Reference:</span>
                <span className="font-bold text-white text-right">{shipment.trackingNumber}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-blue-200">Sender Hub:</span>
                <span className="font-bold text-white text-right">{shipment.senderName}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-blue-200">Consignee/Receiver:</span>
                <span className="font-bold text-white text-right">{shipment.receiverName}</span>
              </div>

              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-blue-200">Destination Port:</span>
                <span className="font-bold text-[#FFD700] text-right flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1" />
                  {shipment.destinationCountry} {shipment.portGateway ? `(${shipment.portGateway})` : ""}
                </span>
              </div>

                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-blue-200">Service Logistics Tier:</span>
                  <span className="font-bold text-white text-right bg-white/10 px-2 py-0.5 rounded uppercase tracking-wider">
                    {shipment.serviceType} Speed
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-blue-200">Consolidated Weight:</span>
                  <span className="font-bold text-white text-right flex items-center">
                    <Scale className="h-3.5 w-3.5 mr-1" />
                    {shipment.weight} KG
                  </span>
                </div>

                <div className="flex justify-between py-1 border-b border-white/5">
                  <span className="text-blue-200">Total Parcels:</span>
                  <span className="font-bold text-white text-right flex items-center">
                    <Package className="h-3.5 w-3.5 mr-1" />
                    {shipment.numberOfPackages} Package(s)
                  </span>
                </div>

                <div className="flex justify-between py-1">
                  <span className="text-blue-200">Est. Arrival Gate:</span>
                  <span className="font-bold text-[#FFD700] text-right flex items-center">
                    <Calendar className="h-3.5 w-3.5 mr-1" />
                    {formatSimpleDate(shipment.expectedDeliveryDate)}
                  </span>
                </div>
              </div>

              {shipment.shipmentNotes && (
                <div className="bg-white/5 p-3 rounded-lg border border-white/10 mt-2">
                  <span className="text-[10px] text-blue-200 block mb-1 font-mono uppercase tracking-wider">
                    Export Notes & Stencil info:
                  </span>
                  <p className="text-xs text-white/90 italic leading-normal">
                    "{shipment.shipmentNotes}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline & Customer Notification History row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Milestone Timeline (2/3 col on desktop) */}
            <div className="lg:col-span-2">
              <Timeline 
                currentMilestoneIndex={shipment.currentMilestoneIndex} 
                milestoneHistory={shipment.milestoneHistory}
                isPaused={shipment.isPaused}
              />
            </div>

            {/* Notification History (1/3 col on desktop) */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col h-fit">
              <h3 className="text-lg font-bold text-[#032B73] border-b border-gray-100 pb-3 mb-4 flex items-center space-x-2">
                <Send className="h-5 w-5 text-blue-600" />
                <span>Security Notifications</span>
              </h3>
              
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Security-verified notifications dispatched to customer contact routes (Email and simulated SMS/WhatsApp):
              </p>

              {shipment.notifications && shipment.notifications.length > 0 ? (
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                  {shipment.notifications.slice().reverse().map((notif) => (
                    <div 
                      key={notif.id}
                      className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs"
                    >
                      <div className="flex justify-between items-start mb-1.5">
                        <span className="font-mono font-bold text-gray-400">
                          {new Date(notif.timestamp).toLocaleDateString("en-US", {
                            day: "2-digit",
                            month: "short"
                          })}
                        </span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          notif.type === "email" 
                            ? "bg-blue-100 text-blue-800" 
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {notif.type}
                        </span>
                      </div>
                      
                      <p className="text-gray-900 font-bold mb-1">
                        {notif.milestoneName} Alert
                      </p>
                      
                      <p className="text-[10px] text-gray-500 font-mono break-all mb-1">
                        Sent to: {notif.recipient}
                      </p>
                      
                      <span className="inline-flex items-center text-[10px] text-emerald-600 font-bold font-mono">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Dispatched Successfully
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400 font-mono text-xs">
                  <p className="mb-2">No verification alerts logged yet.</p>
                  <p className="text-[10px] text-gray-400/80">Alerts populate instantly when admins update transit stages.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Hero Explainer Info Cards - Reinforces Shipplix Trust & Brand Layout */}
      {!shipment && (
        <section className="bg-slate-50 border border-gray-100 rounded-2xl p-8 max-w-5xl mx-auto space-y-8">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xl sm:text-2xl font-black text-[#032B73]">
              The Shipplix Logistics Promise
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Safe, reliable, and premium air and maritime cargo logistics connecting Nigeria directly to the United States, Canada, and the United Kingdom.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-100 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                01
              </div>
              <h4 className="font-bold text-gray-900 text-sm sm:text-base">Customs Secured Verification</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Every shipment undergoes rigorous regulatory checks at Lagos Hub to ensure speedy customs clearance at USA/UK borders.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-100 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                02
              </div>
              <h4 className="font-bold text-gray-900 text-sm sm:text-base">Real-Time Transit Timelines</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Stay updated at every single stage of the flight transit path. Our tracking system syncs instantly with international airlines.
              </p>
            </div>

            <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-100 space-y-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-100">
                03
              </div>
              <h4 className="font-bold text-gray-900 text-sm sm:text-base">No Hidden Charges Guarantee</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                What we quote is what you pay. Custom duties, terminal fees, and packaging are handled upfront with zero surprise billing.
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
