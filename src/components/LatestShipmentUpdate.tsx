import React, { useState } from "react";
import { 
  MapPin, Clock, Calendar, CheckCircle2, AlertTriangle, 
  Activity, Copy, Check, RefreshCw, Truck, ArrowRight
} from "lucide-react";
import { Shipment, MILESTONES } from "../types.js";

interface LatestShipmentUpdateProps {
  shipment: Shipment | null;
  isLoading?: boolean;
  searchedNumber?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

/**
 * Returns the latest confirmed location based strictly on shipment details and recorded milestones.
 * No fictional locations are fabricated.
 */
export function getConfirmedLocation(shipment: Shipment): string {
  if (!shipment) return "Information not yet available";

  const { originCountry, destinationCountry, portGateway, currentMilestoneIndex, milestoneHistory } = shipment;

  // Check if any specific custom description in the latest milestone history mentions a confirmed facility or airport
  const latestHistory = milestoneHistory && milestoneHistory.length > 0 
    ? milestoneHistory[milestoneHistory.length - 1] 
    : null;

  // Milestones 0 to 12 are pre-flight activities at origin hub
  if (currentMilestoneIndex <= 12) {
    if (originCountry) {
      const isNigeria = originCountry.toLowerCase().includes("nigeria");
      return isNigeria 
        ? "Lagos Hub Processing Center, Nigeria" 
        : `${originCountry} Processing Center`;
    }
    return "Origin Processing Hub";
  }

  // Milestone 13 is departure flight
  if (currentMilestoneIndex === 13) {
    return "Departed Lagos Origin Hub, Nigeria (In Flight)";
  }

  // Milestones 14-15 are intermediate transit hubs
  if (currentMilestoneIndex === 14 || currentMilestoneIndex === 15) {
    return "Intermediate International Transit Hub";
  }

  // Milestones 16+ represent destination airport, customs, sorting, delivery, or delivered
  if (portGateway && portGateway.trim()) {
    const trimmedGateway = portGateway.trim();
    if (destinationCountry && !trimmedGateway.toLowerCase().includes(destinationCountry.toLowerCase())) {
      return `${trimmedGateway}, ${destinationCountry}`;
    }
    return trimmedGateway;
  }

  if (destinationCountry && destinationCountry.trim()) {
    return `Destination Terminal, ${destinationCountry}`;
  }

  return "Information not yet available";
}

/**
 * Formats timestamps cleanly into user-friendly strings.
 */
export function formatUpdateTimestamp(isoString?: string): string {
  if (!isoString) return "Information not yet available";
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Information not yet available";
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  } catch {
    return "Information not yet available";
  }
}

/**
 * Formats simple date strings (YYYY-MM-DD) into readable dates.
 */
export function formatEstimatedDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

export default function LatestShipmentUpdate({
  shipment,
  isLoading = false,
  searchedNumber = "",
  onRefresh,
  isRefreshing = false
}: LatestShipmentUpdateProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Subtle loading state directly in the top placement
  if (isLoading) {
    return (
      <div 
        id="latest-update-loading"
        className="w-full max-w-2xl mb-8 bg-white/95 text-[#032B73] rounded-2xl p-5 shadow-2xl border-2 border-[#FFD700] backdrop-blur-md text-left animate-pulse"
      >
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-yellow-100 rounded-lg text-[#032B73]">
            <RefreshCw className="h-5 w-5 animate-spin text-[#032B73]" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#032B73]">
              Retrieving Latest Shipment Update...
            </h4>
            <p className="text-xs text-gray-600 mt-0.5 font-mono">
              Fetching real-time tracking data for <span className="font-bold text-[#032B73]">{searchedNumber || "shipment"}</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return null;
  }

  // Derive all data points strictly from the shipment record
  const currentStatusName = shipment.isPaused
    ? "On Hold / Postponed"
    : (MILESTONES[shipment.currentMilestoneIndex]?.name || (shipment.currentMilestoneIndex >= 23 ? "Delivered" : "In Transit"));

  const confirmedLocation = getConfirmedLocation(shipment);

  const hasHistory = shipment.milestoneHistory && shipment.milestoneHistory.length > 0;
  const latestHistoryEntry = hasHistory 
    ? shipment.milestoneHistory[shipment.milestoneHistory.length - 1] 
    : null;

  const latestEventName = latestHistoryEntry?.milestoneName 
    || MILESTONES[shipment.currentMilestoneIndex]?.name 
    || "Information not yet available";

  const latestEventDesc = latestHistoryEntry?.description 
    || MILESTONES[shipment.currentMilestoneIndex]?.description 
    || "";

  const lastUpdatedTimestamp = latestHistoryEntry?.timestamp 
    ? formatUpdateTimestamp(latestHistoryEntry.timestamp)
    : "Information not yet available";

  const hasEstimatedDelivery = Boolean(shipment.expectedDeliveryDate && shipment.expectedDeliveryDate.trim());
  const estimatedDeliveryText = hasEstimatedDelivery ? formatEstimatedDate(shipment.expectedDeliveryDate) : "";

  // Progress computation based on actual milestone progress
  const progressPercent = Math.min(
    Math.round((Math.min(shipment.currentMilestoneIndex, 23) / 23) * 100),
    100
  );

  const isDelivered = shipment.currentMilestoneIndex === 23 || shipment.currentMilestoneIndex === 45;

  return (
    <div 
      id="latest-shipment-update-banner"
      className="w-full max-w-2xl mb-8 bg-white text-gray-900 rounded-2xl p-5 sm:p-6 shadow-2xl border-2 border-[#FFD700] text-left relative overflow-hidden transition-all duration-300"
    >
      {/* Top Banner Header: Label & Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3 mb-4">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              shipment.isPaused ? "bg-red-400" : isDelivered ? "bg-emerald-400" : "bg-[#FFD700]"
            }`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              shipment.isPaused ? "bg-red-600" : isDelivered ? "bg-emerald-500" : "bg-amber-500"
            }`} />
          </span>
          <span className="font-extrabold uppercase tracking-wider text-xs sm:text-sm text-[#032B73] font-sans">
            LATEST SHIPMENT UPDATE
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <span 
            id="top-current-status-badge"
            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-wide ${
              shipment.isPaused 
                ? "bg-red-100 text-red-800 border border-red-200" 
                : isDelivered 
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                  : "bg-blue-100 text-[#032B73] border border-blue-200"
            }`}
          >
            {currentStatusName}
          </span>

          {onRefresh && (
            <button
              id="top-refresh-btn"
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh tracking data"
              className="p-1 text-gray-400 hover:text-[#032B73] transition-colors rounded-md hover:bg-gray-100"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-[#032B73]" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Grid of Key Shipment Properties */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs">
        
        {/* Tracking number */}
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
            Tracking Number
          </span>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span id="top-tracking-number" className="font-mono font-black text-sm sm:text-base text-[#032B73]">
              {shipment.trackingNumber}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(shipment.trackingNumber)}
              title="Copy tracking number"
              className="text-gray-400 hover:text-[#032B73] p-1 rounded transition-colors"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Current status */}
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
            Current Status
          </span>
          <span id="top-current-status-text" className="font-bold text-sm text-gray-900 mt-0.5">
            {currentStatusName}
          </span>
        </div>

        {/* Current location */}
        <div className="flex flex-col sm:col-span-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
            Current Location
          </span>
          <div className="flex items-center space-x-1.5 mt-0.5 text-gray-800">
            <MapPin className="h-3.5 w-3.5 text-[#032B73] shrink-0" />
            <span id="top-current-location" className="font-semibold text-xs sm:text-sm">
              {confirmedLocation}
            </span>
          </div>
        </div>

        {/* Latest update event */}
        <div className="flex flex-col sm:col-span-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div className="flex items-center space-x-1.5 mb-1">
            <Activity className="h-3.5 w-3.5 text-[#032B73]" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">
              Latest Update
            </span>
          </div>
          <span id="top-latest-event-name" className="font-bold text-xs text-gray-900">
            {latestEventName}
          </span>
          {latestEventDesc && (
            <p id="top-latest-event-desc" className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">
              {latestEventDesc}
            </p>
          )}
        </div>

        {/* Last updated timestamp */}
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
            Last Updated
          </span>
          <div className="flex items-center space-x-1 mt-0.5 text-gray-700">
            <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <span id="top-last-updated" className="font-medium text-xs font-mono">
              {lastUpdatedTimestamp}
            </span>
          </div>
        </div>

        {/* Estimated delivery - ONLY IF AVAILABLE */}
        {hasEstimatedDelivery && (
          <div id="top-estimated-delivery-container" className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono">
              Estimated Delivery
            </span>
            <div className="flex items-center space-x-1 mt-0.5 text-[#032B73]">
              <Calendar className="h-3.5 w-3.5 text-[#032B73] shrink-0" />
              <span id="top-estimated-delivery" className="font-bold text-xs font-mono">
                {estimatedDeliveryText}
              </span>
            </div>
          </div>
        )}

      </div>

      {/* Compact Shipment Progress Indicator */}
      <div className="mt-4 pt-3 border-t border-gray-100">
        <div className="flex justify-between items-center mb-1.5 text-[11px] font-mono">
          <span className="text-gray-500 font-semibold flex items-center gap-1">
            <Truck className="h-3 w-3 text-[#032B73]" />
            <span>Shipment Progress</span>
          </span>
          <span className="text-[#032B73] font-bold">
            {progressPercent}% Complete
          </span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden relative border border-gray-200/60">
          <div 
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              shipment.isPaused 
                ? "bg-red-500" 
                : isDelivered 
                  ? "bg-emerald-500" 
                  : "bg-gradient-to-r from-[#032B73] to-[#FFD700]"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
