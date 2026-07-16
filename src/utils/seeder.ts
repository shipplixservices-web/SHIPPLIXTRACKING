import { Shipment, MILESTONES } from "../types.js";
import { formatDate } from "./dateUtils.ts";

export function getSeedShipments(): Shipment[] {
  const now = new Date("2026-06-27T01:27:36-07:00");

  return [
    {
      trackingNumber: "SPX-20260625-5522",
      referenceNumber: "REF-90823485",
      senderName: "Mrs. Adebayo (Fashion Vendor)",
      receiverName: "Sarah Jenkins",
      phoneNumber: "+1 (415) 555-2671",
      originCountry: "Nigeria",
      destinationCountry: "United States",
      weight: 45.2,
      numberOfPackages: 3,
      serviceType: "Express",
      bookingDate: "2026-06-24",
      expectedDeliveryDate: "2026-06-29",
      shipmentNotes: "High-value African fabrics, hand-crafted designer Ankara gowns. Keep dry.",
      currentMilestoneIndex: 6, // Customs Review
      isPaused: false,
      milestoneHistory: [
        {
          milestoneIndex: 0,
          milestoneName: MILESTONES[0].name,
          description: MILESTONES[0].description,
          timestamp: formatDate(3, "10:42:00", now)
        },
        {
          milestoneIndex: 2,
          milestoneName: MILESTONES[2].name,
          description: MILESTONES[2].description,
          timestamp: formatDate(3, "14:15:00", now)
        },
        {
          milestoneIndex: 3,
          milestoneName: MILESTONES[3].name,
          description: MILESTONES[3].description,
          timestamp: formatDate(2, "09:30:00", now)
        },
        {
          milestoneIndex: 5,
          milestoneName: MILESTONES[5].name,
          description: MILESTONES[5].description,
          timestamp: formatDate(2, "16:45:00", now)
        },
        {
          milestoneIndex: 6,
          milestoneName: MILESTONES[6].name,
          description: MILESTONES[6].description,
          timestamp: formatDate(1, "11:20:00", now)
        }
      ],
      notifications: [
        {
          id: "notif-1",
          timestamp: formatDate(3, "10:42:00", now),
          type: "email",
          recipient: "shipplixservices@gmail.com",
          milestoneName: "Shipment Received",
          status: "sent"
        },
        {
          id: "notif-2",
          timestamp: formatDate(2, "16:45:00", now),
          type: "email",
          recipient: "shipplixservices@gmail.com",
          milestoneName: "Regulatory Inspection",
          status: "sent"
        },
        {
          id: "notif-3",
          timestamp: formatDate(1, "11:20:00", now),
          type: "whatsapp",
          recipient: "+1 (415) 555-2671",
          milestoneName: "Customs Review",
          status: "sent"
        }
      ]
    },
    {
      trackingNumber: "SPX-20260620-1080",
      referenceNumber: "REF-29103847",
      senderName: "Emeka O. (Wholesaler)",
      receiverName: "Richard Sterling",
      phoneNumber: "+44 7911 123456",
      originCountry: "Nigeria",
      destinationCountry: "United Kingdom",
      weight: 120.5,
      numberOfPackages: 8,
      serviceType: "Standard",
      bookingDate: "2026-06-20",
      expectedDeliveryDate: "2026-06-26",
      shipmentNotes: "Bulk food items (Garri, Yam flour, Egusi, Spices) for distribution.",
      currentMilestoneIndex: 23, // Delivered
      isPaused: false,
      milestoneHistory: Array.from({ length: 24 }, (_, i) => {
        const daysAgo = 6 - Math.floor(i * 0.25);
        const hour = 9 + (i % 8);
        return {
          milestoneIndex: i,
          milestoneName: MILESTONES[i].name,
          description: MILESTONES[i].description,
          timestamp: formatDate(daysAgo, `${hour.toString().padStart(2, '0')}:15:00`, now)
        };
      }),
      notifications: [
        {
          id: "notif-delivered-email",
          timestamp: formatDate(1, "15:30:00", now),
          type: "email",
          recipient: "shipplixservices@gmail.com",
          milestoneName: "Delivered",
          status: "sent"
        }
      ]
    },
    {
      trackingNumber: "SPX-20260626-3120",
      referenceNumber: "REF-74839210",
      senderName: "Ngozi A. (Retailer)",
      receiverName: "Amina Yusuf",
      phoneNumber: "+1 (647) 555-8392",
      originCountry: "Nigeria",
      destinationCountry: "Canada",
      weight: 12.8,
      numberOfPackages: 1,
      serviceType: "Economy",
      bookingDate: "2026-06-26",
      expectedDeliveryDate: "2026-07-06",
      shipmentNotes: "Organic cosmetics and hair care oils.",
      currentMilestoneIndex: 2, // Shipment Verified
      isPaused: false,
      milestoneHistory: [
        {
          milestoneIndex: 0,
          milestoneName: MILESTONES[0].name,
          description: MILESTONES[0].description,
          timestamp: formatDate(1, "08:15:00", now)
        },
        {
          milestoneIndex: 2,
          milestoneName: MILESTONES[2].name,
          description: MILESTONES[2].description,
          timestamp: formatDate(0, "15:30:00", now)
        }
      ],
      notifications: []
    },
    {
      trackingNumber: "SPX-20260623-2990",
      referenceNumber: "REF-43928104",
      senderName: "Chinonso Uzor",
      receiverName: "Michael Chang",
      phoneNumber: "+1 (212) 555-0199",
      originCountry: "Nigeria",
      destinationCountry: "United States",
      weight: 18.0,
      numberOfPackages: 2,
      serviceType: "Express",
      bookingDate: "2026-06-23",
      expectedDeliveryDate: "2026-06-27",
      shipmentNotes: "Hand-carved wooden sculptures and art exhibits.",
      currentMilestoneIndex: 22, // Out for Delivery
      isPaused: false,
      milestoneHistory: Array.from({ length: 23 }, (_, i) => {
        const daysAgo = 4 - Math.floor(i * 0.18);
        const hour = 8 + (i % 9);
        return {
          milestoneIndex: i,
          milestoneName: MILESTONES[i].name,
          description: MILESTONES[i].description,
          timestamp: formatDate(daysAgo, `${hour.toString().padStart(2, '0')}:45:00`, now)
        };
      }),
      notifications: []
    }
  ];
}
