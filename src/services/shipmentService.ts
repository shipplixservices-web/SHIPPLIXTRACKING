import { Shipment } from "../types.js";

export interface CreateShipmentInput {
  trackingNumber: string;
  referenceNumber?: string;
  senderName: string;
  receiverName: string;
  phoneNumber: string;
  originCountry: string;
  destinationCountry: string;
  weight: string;
  numberOfPackages: string;
  serviceType: 'Express' | 'Standard' | 'Economy';
  bookingDate: string;
  expectedDeliveryDate: string;
  shipmentNotes: string;
  portGateway?: string;
}

export interface MilestoneUpdateInput {
  milestoneIndex: number;
  customDescription?: string;
}

function getAdminHeaders(isFinanceEdit?: boolean): Record<string, string> {
  const session = localStorage.getItem("shipplix_admin_session");
  let adminEmail = "admin@shipplix.com";
  if (session) {
    try {
      const parsed = JSON.parse(session);
      if (parsed?.success && parsed?.user?.email) {
        adminEmail = parsed.user.email;
      }
    } catch (e) {}
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Admin-Email": adminEmail
  };
  if (isFinanceEdit) {
    headers["X-Action-Type"] = "Edit Finance";
  }
  return headers;
}

export const shipmentService = {
  /**
   * Fetches all shipments from backend server API.
   */
  async fetchShipments(): Promise<Shipment[]> {
    const response = await fetch("/api/shipments");
    if (!response.ok) {
      throw new Error(`Failed to fetch shipments: ${response.statusText}`);
    }
    const data = await response.json();
    return data.shipments || [];
  },

  /**
   * Returns current database state. Seeding is managed server-side.
   */
  async seedInitialDatabase(): Promise<Shipment[]> {
    return this.fetchShipments();
  },

  /**
   * Checks if a tracking number is unique.
   */
  async isTrackingNumberUnique(trackingNumber: string): Promise<boolean> {
    const shipments = await this.fetchShipments();
    return !shipments.some(s => s.trackingNumber.toUpperCase() === trackingNumber.toUpperCase());
  },

  /**
   * Creates a new shipment via backend API.
   */
  async createShipment(input: CreateShipmentInput): Promise<Shipment> {
    const headers = getAdminHeaders();
    const response = await fetch("/api/shipments", {
      method: "POST",
      headers,
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to create shipment: ${response.statusText}`);
    }
    const data = await response.json();
    return data.shipment;
  },

  /**
   * Updates core details of an existing shipment via backend API.
   */
  async updateShipmentDetails(shipment: Shipment, isFinanceEdit?: boolean): Promise<Shipment> {
    const headers = getAdminHeaders(isFinanceEdit);
    const response = await fetch(`/api/shipments/${shipment.trackingNumber}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(shipment)
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to update shipment details: ${response.statusText}`);
    }
    const data = await response.json();
    return data.shipment;
  },

  /**
   * Advances/updates the milestone index of a shipment via backend API.
   */
  async updateMilestone(shipment: Shipment, milestoneIndex: number, customDescription?: string): Promise<Shipment> {
    const headers = getAdminHeaders();
    const response = await fetch(`/api/shipments/${shipment.trackingNumber}/milestone`, {
      method: "POST",
      headers,
      body: JSON.stringify({ milestoneIndex, customDescription })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to update shipment milestone: ${response.statusText}`);
    }
    const data = await response.json();
    return data.shipment;
  },

  /**
   * Deletes a shipment from the database via backend API.
   */
  async deleteShipment(trackingNumber: string): Promise<void> {
    const headers = getAdminHeaders();
    const response = await fetch(`/api/shipments/${trackingNumber}`, {
      method: "DELETE",
      headers
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to delete shipment: ${response.statusText}`);
    }
  },

  /**
   * Toggles the hold (is_paused) status of a shipment via backend API.
   */
  async togglePauseStatus(trackingNumber: string, isHold: boolean): Promise<Shipment> {
    const endpoint = isHold ? `/api/shipments/${trackingNumber}/pause` : `/api/shipments/${trackingNumber}/resume`;
    const headers = getAdminHeaders();
    const response = await fetch(endpoint, {
      method: "POST",
      headers
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to toggle pause status: ${response.statusText}`);
    }
    const data = await response.json();
    return data.shipment;
  },

  /**
   * Updates shipment health status and delay status override.
   */
  async updateStatusAndHealth(trackingNumber: string, shipmentHealth: string, delayStatus: string, author?: string): Promise<Shipment> {
    const headers = getAdminHeaders();
    const response = await fetch(`/api/shipments/${trackingNumber}/status`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ shipmentHealth, delayStatus, author })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to update shipment health/delay status: ${response.statusText}`);
    }
    const data = await response.json();
    return data.shipment;
  },

  /**
   * Adds an administrative internal note.
   */
  async addInternalNote(trackingNumber: string, text: string, author?: string): Promise<Shipment> {
    const headers = getAdminHeaders();
    const response = await fetch(`/api/shipments/${trackingNumber}/notes`, {
      method: "POST",
      headers,
      body: JSON.stringify({ text, author })
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to add internal note: ${response.statusText}`);
    }
    const data = await response.json();
    return data.shipment;
  },

  /**
   * Links a new document (invoice, receipt, image, etc.) to the shipment.
   */
  async uploadDocument(trackingNumber: string, doc: { name: string; type: string; url: string; size: string; author?: string; }): Promise<Shipment> {
    const headers = getAdminHeaders();
    const response = await fetch(`/api/shipments/${trackingNumber}/documents`, {
      method: "POST",
      headers,
      body: JSON.stringify(doc)
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to upload document: ${response.statusText}`);
    }
    const data = await response.json();
    return data.shipment;
  },

  /**
   * Logs a payment transaction to the shipment's ledger.
   */
  async addPaymentTransaction(trackingNumber: string, tx: { amount: number; method: string; reference: string; date?: string; author?: string; }): Promise<Shipment> {
    const headers = getAdminHeaders();
    const response = await fetch(`/api/shipments/${trackingNumber}/transactions`, {
      method: "POST",
      headers,
      body: JSON.stringify(tx)
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to log transaction payment: ${response.statusText}`);
    }
    const data = await response.json();
    return data.shipment;
  },

  /**
   * Fetches admin notifications from the server.
   */
  async fetchNotifications(): Promise<any[]> {
    const response = await fetch("/api/notifications");
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.statusText}`);
    }
    const data = await response.json();
    return data.notifications || [];
  },

  /**
   * Marks all notifications as read.
   */
  async markAllNotificationsAsRead(): Promise<any[]> {
    const response = await fetch("/api/notifications/read-all", {
      method: "POST"
    });
    if (!response.ok) {
      throw new Error(`Failed to mark all notifications as read: ${response.statusText}`);
    }
    const data = await response.json();
    return data.notifications || [];
  },

  /**
   * Marks a single notification as read.
   */
  async markNotificationAsRead(id: string): Promise<any> {
    const response = await fetch(`/api/notifications/${id}/read`, {
      method: "POST"
    });
    if (!response.ok) {
      throw new Error(`Failed to mark notification as read: ${response.statusText}`);
    }
    const data = await response.json();
    return data.notification;
  },

  /**
   * Deletes a single notification.
   */
  async deleteNotification(id: string): Promise<void> {
    const response = await fetch(`/api/notifications/${id}`, {
      method: "DELETE"
    });
    if (!response.ok) {
      throw new Error(`Failed to delete notification: ${response.statusText}`);
    }
  },

  /**
   * Clears all notifications.
   */
  async clearAllNotifications(): Promise<void> {
    const response = await fetch("/api/notifications", {
      method: "DELETE"
    });
    if (!response.ok) {
      throw new Error(`Failed to clear notifications: ${response.statusText}`);
    }
  },

  /**
   * Simulates a system error to test notifications.
   */
  async simulateSystemError(title?: string, message?: string): Promise<any> {
    const response = await fetch("/api/errors/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message })
    });
    if (!response.ok) {
      throw new Error(`Failed to simulate error: ${response.statusText}`);
    }
    const data = await response.json();
    return data.notification;
  },

  /**
   * Fetches the administration action audit log ledger.
   */
  async fetchAuditLogs(): Promise<any[]> {
    const response = await fetch("/api/audit-logs");
    if (!response.ok) {
      throw new Error(`Failed to fetch audit logs: ${response.statusText}`);
    }
    const data = await response.json();
    return data.logs || [];
  },

  /**
   * Logs a generic client-initiated administrative operation.
   */
  async logAdminAction(action: string, oldValue: string, newValue: string): Promise<void> {
    try {
      const headers = getAdminHeaders();
      await fetch("/api/audit-logs", {
        method: "POST",
        headers,
        body: JSON.stringify({ action, oldValue, newValue })
      });
    } catch (e) {
      console.error("Failed to post audit log:", e);
    }
  }
};
