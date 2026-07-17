import React, { useState, useEffect, useMemo } from "react";
import { 
  History, Search, Filter, RefreshCw, Plus, Edit2, Trash2, 
  MapPin, DollarSign, Percent, FileText, User, Clock, AlertTriangle, ShieldCheck
} from "lucide-react";
import { AdminAuditLog } from "../types.js";
import { shipmentService } from "../services/shipmentService.ts";

export default function AuditLogModule() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchLogs = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await shipmentService.fetchAuditLogs();
      setLogs(data);
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
      setError("Failed to fetch administrative audit logs.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchLogs(true);
  };

  // Filter logs based on search query and selected action
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Action filter
      if (selectedAction !== "all" && log.action !== selectedAction) {
        return false;
      }
      
      // Search query filter
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesAdmin = log.admin?.toLowerCase().includes(query);
        const matchesAction = log.action?.toLowerCase().includes(query);
        const matchesOld = log.oldValue?.toLowerCase().includes(query);
        const matchesNew = log.newValue?.toLowerCase().includes(query);
        return matchesAdmin || matchesAction || matchesOld || matchesNew;
      }
      
      return true;
    });
  }, [logs, selectedAction, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    
    // Unique Admins active
    const admins = new Set(logs.map(log => log.admin));
    const activeAdminsCount = admins.size;

    // Actions recorded today
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayLogsCount = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= startOfToday;
    }).length;

    return { total, activeAdminsCount, todayLogsCount };
  }, [logs]);

  // Helper to get styling and icon for action badges
  const getActionBadge = (action: string) => {
    switch (action) {
      case "Create Shipment":
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: <Plus className="h-3.5 w-3.5 mr-1" />
        };
      case "Edit Shipment":
        return {
          bg: "bg-blue-50 text-blue-700 border-blue-200",
          icon: <Edit2 className="h-3.5 w-3.5 mr-1" />
        };
      case "Delete Shipment":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: <Trash2 className="h-3.5 w-3.5 mr-1" />
        };
      case "Update Milestone":
        return {
          bg: "bg-purple-50 text-purple-700 border-purple-200",
          icon: <MapPin className="h-3.5 w-3.5 mr-1" />
        };
      case "Add Payment":
        return {
          bg: "bg-teal-50 text-teal-700 border-teal-200",
          icon: <DollarSign className="h-3.5 w-3.5 mr-1" />
        };
      case "Edit Finance":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          icon: <Percent className="h-3.5 w-3.5 mr-1" />
        };
      case "Generate Report":
        return {
          bg: "bg-cyan-50 text-cyan-700 border-cyan-200",
          icon: <FileText className="h-3.5 w-3.5 mr-1" />
        };
      default:
        return {
          bg: "bg-gray-50 text-gray-700 border-gray-200",
          icon: <ShieldCheck className="h-3.5 w-3.5 mr-1" />
        };
    }
  };

  return (
    <div className="space-y-6" id="audit-logs-module-container">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center space-x-2">
            <History className="h-5.5 w-5.5 text-blue-800" />
            <span>Administrative Audit Ledger</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Real-time, immutable security logging tracking all administrative system adjustments.
          </p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={loading || isRefreshing}
          className={`flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all ${
            isRefreshing ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <RefreshCw className={`h-4 w-4 text-gray-500 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          <span>{isRefreshing ? "Reconciling..." : "Sync Logs"}</span>
        </button>
      </div>

      {/* Analytics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-50 text-blue-800">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Action Ledger</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Active Operators</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{stats.activeAdminsCount}</div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-purple-50 text-purple-800">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Actions Today</div>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{stats.todayLogsCount}</div>
          </div>
        </div>
      </div>

      {/* Search & Filters Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search Input */}
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="h-4.5 w-4.5 text-gray-400" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by operator email, action type, or values..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800"
            />
          </div>

          {/* Action Filter */}
          <div className="flex items-center space-x-3 w-full md:w-auto">
            <Filter className="h-4.5 w-4.5 text-gray-400 shrink-0" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full md:w-56 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-800/20 focus:border-blue-800 bg-white"
            >
              <option value="all">All Action Types</option>
              <option value="Create Shipment">Create Shipment</option>
              <option value="Edit Shipment">Edit Shipment</option>
              <option value="Delete Shipment">Delete Shipment</option>
              <option value="Update Milestone">Update Milestone</option>
              <option value="Add Payment">Add Payment</option>
              <option value="Edit Finance">Edit Finance</option>
              <option value="Generate Report">Generate Report</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table & Feed */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <RefreshCw className="h-8 w-8 text-blue-800 animate-spin" />
            <span className="text-sm font-medium text-gray-500">Retrieving system ledger...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
            <AlertTriangle className="h-10 w-10 text-rose-500" />
            <span className="text-sm font-medium text-gray-700">{error}</span>
            <button
              onClick={() => fetchLogs()}
              className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg text-sm font-bold transition-all"
            >
              Try Again
            </button>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 px-4">
            <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-gray-800">No Action Matches Found</h3>
            <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
              No recorded entries match your active query. Try adjusting your search query or switching your action filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-200">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Administrator</th>
                  <th className="py-4 px-6">Action Triggered</th>
                  <th className="py-4 px-6">Old State / Context</th>
                  <th className="py-4 px-6">New Adjusted Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* Timestamp */}
                      <td className="py-4 px-6 whitespace-nowrap text-gray-500 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </td>

                      {/* Administrator */}
                      <td className="py-4 px-6 whitespace-nowrap font-medium text-gray-900 flex items-center space-x-1.5 mt-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{log.admin}</span>
                      </td>

                      {/* Action Triggered */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${badge.bg}`}>
                          {badge.icon}
                          {log.action}
                        </span>
                      </td>

                      {/* Old State */}
                      <td className="py-4 px-6 max-w-xs truncate text-gray-500 font-mono text-xs" title={log.oldValue}>
                        {log.oldValue}
                      </td>

                      {/* New State */}
                      <td className="py-4 px-6 max-w-sm font-semibold text-gray-800 font-mono text-xs" title={log.newValue}>
                        {log.newValue}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
