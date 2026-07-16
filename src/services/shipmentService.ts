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
    const response = await fetch("/api/shipments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  async updateShipmentDetails(shipment: Shipment): Promise<Shipment> {
    const response = await fetch(`/api/shipments/${shipment.trackingNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(`/api/shipments/${shipment.trackingNumber}/milestone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(`/api/shipments/${trackingNumber}`, {
      method: "DELETE"
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
    const response = await fetch(endpoint, {
      method: "POST"
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
    const response = await fetch(`/api/shipments/${trackingNumber}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(`/api/shipments/${trackingNumber}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(`/api/shipments/${trackingNumber}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const response = await fetch(`/api/shipments/${trackingNumber}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tx)
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.message || `Failed to log transaction payment: ${response.statusText}`);
    }
    const data = await response.json();
    return data.shipment;
  }
};
