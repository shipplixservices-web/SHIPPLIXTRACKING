export interface MilestoneHistoryEntry {
  milestoneIndex: number; // 0 to 16
  milestoneName: string;
  description: string;
  timestamp: string; // ISO string
}

export interface NotificationEntry {
  id: string;
  timestamp: string; // ISO string
  type: 'email' | 'whatsapp';
  recipient: string;
  milestoneName: string;
  status: 'sent' | 'pending' | 'failed';
}

export interface InternalNote {
  id: string;
  text: string;
  timestamp: string; // ISO string
  author: string;
}

export interface ShipmentDocument {
  id: string;
  name: string;
  type: 'invoice' | 'receipt' | 'image' | 'attachment';
  url: string; // Base64 content or relative mock path
  uploadedAt: string; // ISO string
  size?: string;
}

export interface PaymentTransaction {
  id: string;
  amount: number;
  date: string; // YYYY-MM-DD
  method: string;
  reference: string;
}

export interface PaymentHistory {
  status: 'paid' | 'pending' | 'partially_paid';
  amountDue: number;
  amountPaid: number;
  transactions: PaymentTransaction[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  timestamp: string; // ISO string
  details?: string;
  author?: string;
}

export interface Shipment {
  trackingNumber: string; // SPX-YYYYMMDD-XXXX
  referenceNumber: string;
  senderName: string;
  receiverName: string;
  phoneNumber: string;
  originCountry: string;
  destinationCountry: string;
  weight: number; // in kg
  numberOfPackages: number;
  serviceType: 'Express' | 'Standard' | 'Economy';
  bookingDate: string; // YYYY-MM-DD
  expectedDeliveryDate: string; // YYYY-MM-DD
  shipmentNotes: string;
  currentMilestoneIndex: number; // index from 0 to 16
  milestoneHistory: MilestoneHistoryEntry[];
  notifications: NotificationEntry[];
  isPaused: boolean;
  portGateway?: string;
  // Enriched feature additions
  shipmentHealth?: 'optimal' | 'delayed' | 'action_required' | 'critical';
  delayStatus?: string;
  internalNotes?: InternalNote[];
  documents?: ShipmentDocument[];
  paymentHistory?: PaymentHistory;
  auditLogs?: AuditLogEntry[];
}

export interface DashboardStats {
  totalShipments: number;
  deliveredShipments: number;
  inTransit: number;
  pendingVerification: number;
  todayBookings: number;
}

export const MILESTONES = [
  {
    name: "Shipment Received",
    description: "Your package has been received at the Shipplix processing center and is awaiting verification."
  },
  {
    name: "Shipment Verification Queue",
    description: "Your shipment is currently in the verification queue and will be processed in the order received."
  },
  {
    name: "Shipment Verified",
    description: "Your shipment details and destination information have been verified successfully."
  },
  {
    name: "Packaging & Consolidation",
    description: "Your package is being prepared and consolidated with other outbound shipments for secure transportation."
  },
  {
    name: "Cargo Manifest Preparation",
    description: "Your shipment information is being added to the export cargo manifest before regulatory processing."
  },
  {
    name: "Regulatory Inspection",
    description: "Your shipment is undergoing mandatory inspection and clearance procedures by relevant regulatory agencies."
  },
  {
    name: "Customs Review",
    description: "Your shipment has been submitted for customs review and export clearance."
  },
  {
    name: "Airline Security Screening",
    description: "The shipment has successfully completed security screening at the airline cargo terminal."
  },
  {
    name: "Airline Cargo Processing",
    description: "The airline cargo handlers are processing the shipment for flight staging."
  },
  {
    name: "Export Warehouse Processing",
    description: "The shipment has been staged in the export terminal warehouse and is awaiting loading."
  },
  {
    name: "Flight Allocation",
    description: "Your shipment has been allocated to a specific outbound flight route."
  },
  {
    name: "Flight Confirmation",
    description: "The flight route and cargo space for your shipment have been fully confirmed by the airline."
  },
  {
    name: "Cargo Loading",
    description: "Your cargo has been securely loaded into the aircraft container and prepared for departure."
  },
  {
    name: "International Departure",
    description: "The flight carrying your shipment has departed from the origin hub."
  },
  {
    name: "Transit Processing",
    description: "The shipment is being processed through an intermediate international transit hub."
  },
  {
    name: "Transit Hub Processing",
    description: "The cargo is undergoing sorting and transfer at the international transit facility."
  },
  {
    name: "Destination Arrival",
    description: "The flight carrying your shipment has landed safely at the destination airport terminal."
  },
  {
    name: "Destination Customs Clearance",
    description: "Your shipment is undergoing customs clearance and inspection at the destination port."
  },
  {
    name: "Import Release",
    description: "Inbound customs has released the shipment and it has been handed over to our local delivery network."
  },
  {
    name: "Final Sorting",
    description: "The shipment is undergoing final sorting at the regional distribution facility."
  },
  {
    name: "Local Distribution Processing",
    description: "The package has been processed and is staged at the local distribution center."
  },
  {
    name: "Delivery Scheduling",
    description: "Your delivery has been scheduled and assigned to a local delivery courier."
  },
  {
    name: "Out for Delivery",
    description: "The shipment has been loaded into the delivery vehicle and is out for final delivery today."
  },
  {
    name: "Delivered",
    description: "Your shipment has been successfully delivered and signed for."
  },
  {
    name: "Shipment On Hold",
    description: "The shipment is currently held at our facility or terminal for verification or administrative requirements."
  },
  {
    name: "Customs Hold",
    description: "The shipment has been put on temporary hold by customs authorities for further documentation or inspection."
  },
  {
    name: "Regulatory Delay",
    description: "Inbound or outbound regulatory checks have flagged this shipment, causing a temporary delay."
  },
  {
    name: "Address Verification Required",
    description: "The consignee address is incomplete or incorrect. Delivery is paused pending address confirmation."
  },
  {
    name: "Contact Pending",
    description: "We are currently attempting to contact the sender or receiver to resolve a delivery or clearance issue."
  },
  {
    name: "Payment Pending",
    description: "Outstanding duties, taxes, or shipping fees must be settled before this shipment can proceed to delivery."
  },
  {
    name: "Dangerous Goods Clearance",
    description: "The shipment is undergoing specialized inspection for safety and regulatory compliance regarding potential hazardous materials."
  },
  {
    name: "Inspection Queue",
    description: "The cargo is currently queued for visual, physical, or x-ray inspection by customs agents."
  },
  {
    name: "Weather Delay",
    description: "Adverse weather conditions at the flight transit hub or destination area have temporarily delayed transport."
  },
  {
    name: "Carrier Delay",
    description: "The airline carrier is experiencing technical or operational scheduling issues, delaying departure or arrival."
  },
  {
    name: "Damage Reported",
    description: "An inspection of the exterior packing has flagged minor damage. Contents are being inspected for safety."
  },
  {
    name: "Misrouted Cargo Recovery",
    description: "The parcel was temporarily misrouted but has been successfully intercepted and is being rerouted to its correct destination."
  },
  {
    name: "Terminal Congestion",
    description: "The destination or transit airport terminal is experiencing high cargo volumes, causing processing delays."
  },
  {
    name: "Delivery Rescheduled",
    description: "The delivery attempt was rescheduled due to recipient absence, business closure, or request."
  },
  {
    name: "Inbound Customs Handover",
    description: "The cargo has been handed over to destination customs authorities for final clearance."
  },
  {
    name: "Agricultural Inspection",
    description: "The cargo is undergoing mandatory bio-security or agricultural clearance checks."
  },
  {
    name: "Clearance Delay",
    description: "Inbound clearance processing is taking longer than expected due to customs backlog or additional reviews."
  },
  {
    name: "Refused by Recipient",
    description: "The receiver refused to accept the package. It is being held at the local depot for sender instructions."
  },
  {
    name: "Rerouting in Progress",
    description: "The shipment is being rerouted to an alternative destination or address per sender instructions."
  },
  {
    name: "Return to Sender",
    description: "The shipment cannot be cleared or delivered and has been initiated for return to the origin sender hub."
  },
  {
    name: "Abandoned Cargo",
    description: "No contact or clearance resolution was reached within the legal period, and the cargo is declared abandoned."
  },
  {
    name: "Shipment Closed",
    description: "The tracking record is closed and archived after final resolution or delivery completion."
  }
];
