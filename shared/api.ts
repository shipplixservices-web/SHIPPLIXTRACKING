import { supabase, mapDbShipmentToShipment } from "./supabaseClient.ts";
import { Shipment, DashboardStats, MILESTONES } from "./types.ts";

export class ShipplixApiClient {
  /**
   * Fetch a single shipment by its tracking number (case-insensitive)
   */
  static async trackShipment(trackingNumber: string): Promise<Shipment | null> {
    const trimmed = trackingNumber.trim().toUpperCase();
    if (!trimmed) throw new Error("Tracking number is empty");

    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("tracking_number", trimmed)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || "Database connection error");
    }

    if (!data) return null;

    return mapDbShipmentToShipment(data);
  }

  /**
   * Fetch all shipments sorted by creation date descending
   */
  static async fetchAllShipments(): Promise<Shipment[]> {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message || "Failed to load database. Check network connection.");
    }

    return (data || []).map(mapDbShipmentToShipment).filter(Boolean) as Shipment[];
  }

  /**
   * Calculate dashboard statistics based on the provided list of shipments
   */
  static calculateStats(shipments: Shipment[]): DashboardStats {
    const total = shipments.length;
    const delivered = shipments.filter(s => s.currentMilestoneIndex === 23).length;
    const pending = shipments.filter(s => s.currentMilestoneIndex === 0).length;
    const inTransit = shipments.filter(s => s.currentMilestoneIndex > 0 && s.currentMilestoneIndex < 23).length;
    
    const today = new Date().toISOString().split('T')[0];
    const todayCount = shipments.filter(s => s.bookingDate === today).length;

    return {
      totalShipments: total,
      deliveredShipments: delivered,
      inTransit: inTransit,
      pendingVerification: pending,
      todayBookings: todayCount
    };
  }

  /**
   * Authenticate admin users with the backend API
   */
  static async adminLogin(email: string, securityKey: string): Promise<{ success: boolean; token: string; user: { email: string; name: string; role: string } }> {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: securityKey })
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Administrative authentication failed.");
    }

    return result;
  }

  /**
   * Trigger the system backup via the backend API
   */
  static async triggerBackup(): Promise<{ filename: string; message: string; payload: any }> {
    const response = await fetch("/api/backup", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "System backup routine failed.");
    }

    return response.json();
  }

  /**
   * Create a new shipment in the database
   */
  static async createShipment(shipment: Partial<Shipment>): Promise<Shipment> {
    const dbPayload = {
      tracking_number: shipment.trackingNumber,
      reference_number: shipment.referenceNumber,
      sender_name: shipment.senderName,
      receiver_name: shipment.receiverName,
      phone_number: shipment.phoneNumber,
      origin_country: shipment.originCountry,
      destination_country: shipment.destinationCountry,
      weight: Number(shipment.weight),
      number_of_packages: Number(shipment.numberOfPackages),
      service_type: shipment.serviceType,
      booking_date: shipment.bookingDate,
      expected_delivery_date: shipment.expectedDeliveryDate,
      shipment_notes: shipment.shipmentNotes || "",
      current_milestone_index: Number(shipment.currentMilestoneIndex || 0),
      milestone_history: shipment.milestoneHistory || [],
      notifications: shipment.notifications || [],
      is_paused: !!shipment.isPaused,
      port_gateway: shipment.portGateway || ""
    };

    const { data, error } = await supabase
      .from("shipments")
      .insert([dbPayload])
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to register shipment in database.");
    }

    const mapped = mapDbShipmentToShipment(data);
    if (!mapped) throw new Error("Error mapping newly created shipment.");
    return mapped;
  }

  /**
   * Update an existing shipment in the database
   */
  static async updateShipment(trackingNumber: string, updates: Partial<Shipment>): Promise<Shipment> {
    const dbPayload: any = {};
    if (updates.referenceNumber !== undefined) dbPayload.reference_number = updates.referenceNumber;
    if (updates.senderName !== undefined) dbPayload.sender_name = updates.senderName;
    if (updates.receiverName !== undefined) dbPayload.receiver_name = updates.receiverName;
    if (updates.phoneNumber !== undefined) dbPayload.phone_number = updates.phoneNumber;
    if (updates.originCountry !== undefined) dbPayload.origin_country = updates.originCountry;
    if (updates.destinationCountry !== undefined) dbPayload.destination_country = updates.destinationCountry;
    if (updates.weight !== undefined) dbPayload.weight = Number(updates.weight);
    if (updates.numberOfPackages !== undefined) dbPayload.number_of_packages = Number(updates.numberOfPackages);
    if (updates.serviceType !== undefined) dbPayload.service_type = updates.serviceType;
    if (updates.bookingDate !== undefined) dbPayload.booking_date = updates.bookingDate;
    if (updates.expectedDeliveryDate !== undefined) dbPayload.expected_delivery_date = updates.expectedDeliveryDate;
    if (updates.shipmentNotes !== undefined) dbPayload.shipment_notes = updates.shipmentNotes;
    if (updates.currentMilestoneIndex !== undefined) dbPayload.current_milestone_index = Number(updates.currentMilestoneIndex);
    if (updates.milestoneHistory !== undefined) dbPayload.milestone_history = updates.milestoneHistory;
    if (updates.notifications !== undefined) dbPayload.notifications = updates.notifications;
    if (updates.isPaused !== undefined) dbPayload.is_paused = !!updates.isPaused;
    if (updates.portGateway !== undefined) dbPayload.port_gateway = updates.portGateway;

    const { data, error } = await supabase
      .from("shipments")
      .update(dbPayload)
      .eq("tracking_number", trackingNumber)
      .select()
      .single();

    if (error) {
      throw new Error(error.message || "Failed to update shipment records.");
    }

    const mapped = mapDbShipmentToShipment(data);
    if (!mapped) throw new Error("Error mapping updated shipment.");
    return mapped;
  }

  /**
   * Toggle the paused state of a shipment
   */
  static async togglePauseShipment(trackingNumber: string, currentIsPaused: boolean): Promise<Shipment> {
    return this.updateShipment(trackingNumber, { isPaused: !currentIsPaused });
  }

  /**
   * Update the active milestone and notify corresponding systems
   */
  static async updateMilestone(
    shipment: Shipment,
    milestoneIndex: number,
    customDescription?: string
  ): Promise<Shipment> {
    const milestoneName = MILESTONES[milestoneIndex].name;
    const description = customDescription || MILESTONES[milestoneIndex].description;
    const timestamp = new Date().toISOString();

    // Copy and search/replace or push to history list
    const existingHistory = [...shipment.milestoneHistory];
    const historyIndex = existingHistory.findIndex(h => h.milestoneIndex === milestoneIndex);

    const historyEntry = {
      milestoneIndex,
      milestoneName,
      description,
      timestamp
    };

    if (historyIndex !== -1) {
      existingHistory[historyIndex] = historyEntry;
    } else {
      existingHistory.push(historyEntry);
    }

    // Sort ascending
    existingHistory.sort((a, b) => a.milestoneIndex - b.milestoneIndex);

    // Create a notification log entry
    const newNotif = {
      id: `notif-${Date.now()}`,
      timestamp,
      type: "email" as const,
      recipient: "shipplixservices@gmail.com",
      milestoneName,
      status: "sent" as const
    };

    const updatedNotifications = [...(shipment.notifications || []), newNotif];

    return this.updateShipment(shipment.trackingNumber, {
      currentMilestoneIndex: milestoneIndex,
      milestoneHistory: existingHistory,
      notifications: updatedNotifications
    });
  }

  /**
   * Delete a shipment from the database
   */
  static async deleteShipment(trackingNumber: string): Promise<void> {
    const { error } = await supabase
      .from("shipments")
      .delete()
      .eq("tracking_number", trackingNumber);

    if (error) {
      throw new Error(error.message || "Failed to delete shipment record.");
    }
  }
}
