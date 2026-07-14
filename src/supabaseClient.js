import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bmloeehiafypotiduton.supabase.co/rest/v1/";

const SUPABASE_PUBLIC_KEY = "sb_publishable_rW-id_IsQU1PdjMyEJ7cog_LNhvlW44";

// Sanitize the URL to get the base Supabase domain (removing /rest/v1/)
// This ensures auth requests go to /auth/v1/ instead of /rest/v1/auth/v1/
const BASE_SUPABASE_URL = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

export const supabase = createClient(BASE_SUPABASE_URL, SUPABASE_PUBLIC_KEY);

/**
 * Maps a Supabase DB shipment row (snake_case) to the React application's Shipment interface (camelCase).
 */
export const mapDbShipmentToShipment = (dbShipment) => {
  if (!dbShipment) return null;
  return {
    trackingNumber: dbShipment.tracking_number,
    referenceNumber: dbShipment.reference_number,
    senderName: dbShipment.sender_name,
    receiverName: dbShipment.receiver_name,
    phoneNumber: dbShipment.phone_number,
    originCountry: dbShipment.origin_country,
    destinationCountry: dbShipment.destination_country,
    weight: Number(dbShipment.weight),
    numberOfPackages: Number(dbShipment.number_of_packages),
    serviceType: dbShipment.service_type,
    bookingDate: dbShipment.booking_date,
    expectedDeliveryDate: dbShipment.expected_delivery_date,
    shipmentNotes: dbShipment.shipment_notes,
    currentMilestoneIndex: Number(dbShipment.current_milestone_index),
    milestoneHistory: dbShipment.milestone_history || [],
    notifications: dbShipment.notifications || [],
    isPaused: dbShipment.is_paused,
    portGateway: dbShipment.port_gateway || ""
  };
};

