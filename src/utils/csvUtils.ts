import { Shipment, MILESTONES } from "../types.js";

/**
 * Exports a list of shipments as a CSV file and triggers a browser download.
 */
export function exportShipmentsToCSV(shipments: Shipment[]): { success: boolean; message: string } {
  if (shipments.length === 0) {
    return { success: false, message: "No shipments available to export." };
  }

  // Create CSV content headers
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Tracking Number,Reference Number,Sender Name,Receiver Name,Phone Number,Origin,Destination,Weight (KG),Packages,Service Type,Booking Date,Expected Delivery Date,Notes,Paused,Current Milestone\n";

  // Loop through shipments
  shipments.forEach(s => {
    const row = [
      s.trackingNumber,
      s.referenceNumber,
      `"${s.senderName.replace(/"/g, '""')}"`,
      `"${s.receiverName.replace(/"/g, '""')}"`,
      `"${s.phoneNumber || ''}"`,
      s.originCountry,
      s.destinationCountry,
      s.weight,
      s.numberOfPackages,
      s.serviceType,
      s.bookingDate,
      s.expectedDeliveryDate,
      `"${(s.shipmentNotes || '').replace(/"/g, '""')}"`,
      s.isPaused ? "YES" : "NO",
      `"${MILESTONES[s.currentMilestoneIndex].name}"`
    ].join(",");
    csvContent += row + "\n";
  });

  // Download flow
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `SHIPPLIX_CARGO_FLEET_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  return { success: true, message: "Exported database successfully. Ready for Microsoft Excel." };
}
