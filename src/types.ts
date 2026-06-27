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
    name: "Shipment Verified",
    description: "The shipment paperwork and parcel contents have been verified by Shipplix export experts."
  },
  {
    name: "Packaging & Consolidation",
    description: "Your package has been securely repacked and consolidated for international transit."
  },
  {
    name: "Regulatory Inspection",
    description: "The shipment has passed local export regulatory inspections and is approved for export customs."
  },
  {
    name: "Customs Review",
    description: "Customs authorities have reviewed the shipment details and granted the export permit."
  },
  {
    name: "Airline Security Screening",
    description: "Cargo security screening has been completed successfully at the airport warehouse."
  },
  {
    name: "Airline Cargo Processing",
    description: "The airline cargo handlers have processed the consignment at the terminal."
  },
  {
    name: "Export Warehouse Processing",
    description: "The shipment is currently staged in the export terminal warehouse awaiting flight loading."
  },
  {
    name: "Flight Allocation",
    description: "Flight routing has been secured and confirmed with the partner international air carrier."
  },
  {
    name: "Cargo Loading",
    description: "Your package is securely loaded into the air cargo container for flight departure."
  },
  {
    name: "International Departure",
    description: "The flight carrying your shipment has departed from the origin airport."
  },
  {
    name: "Transit Processing",
    description: "The shipment is processing through an international transit hub."
  },
  {
    name: "Destination Arrival",
    description: "The flight has arrived safely at the destination airport terminal."
  },
  {
    name: "Destination Customs Clearance",
    description: "The shipment has cleared inbound customs at the destination country and is handed over to local logistics."
  },
  {
    name: "Local Distribution Processing",
    description: "The shipment is being processed and sorted at the regional Shipplix delivery hub."
  },
  {
    name: "Out for Delivery",
    description: "The shipment is in the vehicle with a courier and will be delivered today."
  },
  {
    name: "Delivered",
    description: "Your shipment has been successfully delivered and signed for."
  }
];
