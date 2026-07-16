import { useState, useEffect, useCallback, useMemo } from "react";
import { Shipment, DashboardStats, MILESTONES } from "../types.js";
import { shipmentService, CreateShipmentInput } from "../services/shipmentService.ts";
import { getTodayStr } from "../utils/dateUtils.ts";

export function useShipments(isAuthenticated: boolean) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [systemMessage, setSystemMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDestination, setFilterDestination] = useState("");
  const [filterService, setFilterService] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const showSystemMessage = useCallback((type: 'success' | 'error', text: string) => {
    setSystemMessage({ type, text });
    setTimeout(() => {
      setSystemMessage(null);
    }, 5000);
  }, []);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      let mappedShipments = await shipmentService.fetchShipments();

      // If database is empty, auto-seed it!
      if (mappedShipments.length === 0) {
        mappedShipments = await shipmentService.seedInitialDatabase();
      }

      setShipments(mappedShipments);
    } catch (err: any) {
      console.error("Error fetching dashboard data", err);
      showSystemMessage("error", `Unable to load dashboard fleet: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  }, [showSystemMessage]);

  // Load shipments on mount/auth change
  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, fetchDashboardData]);

  // Derived dashboard stats
  const stats = useMemo<DashboardStats>(() => {
    const totalShipments = shipments.length;
    const deliveredShipments = shipments.filter(s => s.currentMilestoneIndex === 23).length; // Delivered index is 23
    const pendingVerification = shipments.filter(s => s.currentMilestoneIndex === 0).length;
    const inTransit = shipments.filter(s => s.currentMilestoneIndex > 0 && s.currentMilestoneIndex < 23).length;
    
    const todayStr = getTodayStr();
    const todayBookings = shipments.filter(s => s.bookingDate === todayStr).length;

    return {
      totalShipments,
      deliveredShipments,
      inTransit,
      pendingVerification,
      todayBookings
    };
  }, [shipments]);

  // Optimized pre-computed search index for instant lookup
  const indexedShipments = useMemo(() => {
    return shipments.map(s => {
      const emailRecipients = s.notifications
        ? s.notifications.filter(n => n.type === "email").map(n => n.recipient).join(" ")
        : "";

      // Combine all requested searchable fields into a single optimized lowercase token string
      const searchString = [
        s.trackingNumber || "",
        s.referenceNumber || "",
        s.senderName || "", // Customer Name
        s.receiverName || "", // Receiver Name
        s.phoneNumber || "", // Phone
        s.destinationCountry || "", // Destination / Country
        s.originCountry || "", // Country
        s.portGateway || "", // Destination Gateway / Port
        (s as any).email || "",
        (s as any).senderEmail || "",
        (s as any).receiverEmail || "",
        emailRecipients
      ]
        .map(v => v.trim().toLowerCase())
        .filter(Boolean)
        .join(" | ");

      return {
        shipment: s,
        searchString
      };
    });
  }, [shipments]);

  // Filtered shipments utilizing the optimized pre-computed search index
  const filteredShipments = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    return indexedShipments
      .filter(item => {
        const matchesSearch = query ? item.searchString.includes(query) : true;
        const s = item.shipment;
        
        const matchesDest = filterDestination ? s.destinationCountry.toLowerCase() === filterDestination.toLowerCase() : true;
        const matchesService = filterService ? s.serviceType.toLowerCase() === filterService.toLowerCase() : true;
        
        let matchesStatus = true;
        if (filterStatus) {
          if (filterStatus === "paused") matchesStatus = s.isPaused;
          else if (filterStatus === "delivered") matchesStatus = s.currentMilestoneIndex === 23;
          else if (filterStatus === "transit") matchesStatus = s.currentMilestoneIndex > 0 && s.currentMilestoneIndex < 23 && !s.isPaused;
          else if (filterStatus === "pending") matchesStatus = s.currentMilestoneIndex === 0;
        }

        return matchesSearch && matchesDest && matchesService && matchesStatus;
      })
      .map(item => item.shipment);
  }, [indexedShipments, searchQuery, filterDestination, filterService, filterStatus]);

  // Unique destinations for filters
  const uniqueDestinations = useMemo(() => {
    return Array.from(new Set(shipments.map(s => s.destinationCountry)));
  }, [shipments]);

  // Mutation Handlers
  const registerShipment = async (input: CreateShipmentInput): Promise<boolean> => {
    setActionLoading("create");
    try {
      const isUnique = await shipmentService.isTrackingNumberUnique(input.trackingNumber);
      if (!isUnique) {
        showSystemMessage("error", "A shipment with this tracking number already exists.");
        return false;
      }

      const registered = await shipmentService.createShipment(input);
      showSystemMessage("success", `Shipment ${registered.trackingNumber} registered successfully!`);
      await fetchDashboardData();
      return true;
    } catch (err: any) {
      console.error("Exception registering shipment", err);
      showSystemMessage("error", `Network failure registering shipment: ${err.message || err}`);
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const updateShipmentDetails = async (shipment: Shipment): Promise<boolean> => {
    setActionLoading("edit");
    try {
      await shipmentService.updateShipmentDetails(shipment);
      showSystemMessage("success", `Shipment details updated successfully!`);
      await fetchDashboardData();
      return true;
    } catch (err: any) {
      console.error("Exception updating shipment details", err);
      showSystemMessage("error", `Network error updating details: ${err.message || err}`);
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const updateMilestone = async (shipment: Shipment, milestoneIndex: number, customDescription?: string): Promise<Shipment | null> => {
    setActionLoading("milestone");
    try {
      const updated = await shipmentService.updateMilestone(shipment, milestoneIndex, customDescription);
      showSystemMessage("success", `Transit stage advanced for ${shipment.trackingNumber}! Notifications simulated successfully.`);
      await fetchDashboardData();
      return updated;
    } catch (err: any) {
      console.error("Exception updating milestone", err);
      showSystemMessage("error", `Network error during stage advancement: ${err.message || err}`);
      return null;
    } finally {
      setActionLoading(null);
    }
  };

  const deleteShipment = async (trackingNumber: string): Promise<boolean> => {
    if (!confirm(`Are you absolutely sure you want to delete shipment ${trackingNumber}? This action is permanent.`)) {
      return false;
    }
    setActionLoading(`delete-${trackingNumber}`);
    try {
      await shipmentService.deleteShipment(trackingNumber);
      showSystemMessage("success", `Shipment ${trackingNumber} has been deleted.`);
      await fetchDashboardData();
      return true;
    } catch (err: any) {
      console.error("Exception deleting shipment", err);
      showSystemMessage("error", `Network error deleting shipment: ${err.message || err}`);
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const togglePauseStatus = async (shipment: Shipment): Promise<Shipment | null> => {
    const isHold = !shipment.isPaused;
    setActionLoading(`pause-${shipment.trackingNumber}`);
    try {
      const updated = await shipmentService.togglePauseStatus(shipment.trackingNumber, isHold);
      showSystemMessage("success", `Shipment status updated to ${isHold ? "ON HOLD" : "ACTIVE TRANSIT"}.`);
      await fetchDashboardData();
      return updated;
    } catch (err: any) {
      console.error("Exception toggling pause status", err);
      showSystemMessage("error", `Connection failed toggling pause: ${err.message || err}`);
      return null;
    } finally {
      setActionLoading(null);
    }
  };

  const triggerBackup = async (): Promise<boolean> => {
    setActionLoading("backup");
    try {
      const response = await fetch("/api/backup", { method: "POST" });
      const data = await response.json();

      if (data.success) {
        showSystemMessage("success", `Encrypted data backup completed. Logged to system server as: ${data.backupFile}`);
        return true;
      } else {
        showSystemMessage("error", "Backup routine failed.");
        return false;
      }
    } catch (err) {
      showSystemMessage("error", "Network timeout executing backup.");
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const updateStatusAndHealth = async (trackingNumber: string, shipmentHealth: string, delayStatus: string, author?: string): Promise<Shipment | null> => {
    setActionLoading("status-update");
    try {
      const updated = await shipmentService.updateStatusAndHealth(trackingNumber, shipmentHealth, delayStatus, author);
      showSystemMessage("success", `Shipment health set to ${shipmentHealth.toUpperCase()} and delay state saved.`);
      await fetchDashboardData();
      return updated;
    } catch (err: any) {
      console.error("Error updating status/health:", err);
      showSystemMessage("error", `Failed to update shipment status: ${err.message || err}`);
      return null;
    } finally {
      setActionLoading(null);
    }
  };

  const addInternalNote = async (trackingNumber: string, text: string, author?: string): Promise<Shipment | null> => {
    setActionLoading("add-note");
    try {
      const updated = await shipmentService.addInternalNote(trackingNumber, text, author);
      showSystemMessage("success", `Administrative internal note registered.`);
      await fetchDashboardData();
      return updated;
    } catch (err: any) {
      console.error("Error adding internal note:", err);
      showSystemMessage("error", `Failed to register internal note: ${err.message || err}`);
      return null;
    } finally {
      setActionLoading(null);
    }
  };

  const uploadDocument = async (trackingNumber: string, doc: { name: string; type: string; url: string; size: string; author?: string; }): Promise<Shipment | null> => {
    setActionLoading("upload-doc");
    try {
      const updated = await shipmentService.uploadDocument(trackingNumber, doc);
      showSystemMessage("success", `${doc.type.toUpperCase()} document registered successfully.`);
      await fetchDashboardData();
      return updated;
    } catch (err: any) {
      console.error("Error linking document:", err);
      showSystemMessage("error", `Failed to link document: ${err.message || err}`);
      return null;
    } finally {
      setActionLoading(null);
    }
  };

  const addPaymentTransaction = async (trackingNumber: string, tx: { amount: number; method: string; reference: string; date?: string; author?: string; }): Promise<Shipment | null> => {
    setActionLoading("add-transaction");
    try {
      const updated = await shipmentService.addPaymentTransaction(trackingNumber, tx);
      showSystemMessage("success", `Payment transaction of $${tx.amount} registered.`);
      await fetchDashboardData();
      return updated;
    } catch (err: any) {
      console.error("Error logging payment:", err);
      showSystemMessage("error", `Failed to register payment transaction: ${err.message || err}`);
      return null;
    } finally {
      setActionLoading(null);
    }
  };

  return {
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
    fetchDashboardData,
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
  };
}
