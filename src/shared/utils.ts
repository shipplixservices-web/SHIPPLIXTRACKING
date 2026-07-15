/**
 * Utility functions for the Shipplix Tracking and Admin portals.
 */

/**
 * Format a simple date string (e.g., YYYY-MM-DD) into a human-readable format.
 * E.g., "2026-06-25" -> "Jun 25, 2026"
 */
export const formatSimpleDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr || "";
  }
};

/**
 * Format an ISO string or timestamp into a structured date and time object.
 * E.g., "2026-06-25T10:42:00Z" -> { dateStr: "25 June 2026", timeStr: "10:42 AM" }
 */
export const formatTimestamp = (isoString?: string): { dateStr: string; timeStr: string } => {
  if (!isoString) return { dateStr: "", timeStr: "" };
  try {
    const date = new Date(isoString);
    const day = date.getDate();
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    
    return {
      dateStr: `${day} ${month} ${year}`,
      timeStr: `${hours}:${minutes} ${ampm}`
    };
  } catch {
    return { dateStr: isoString, timeStr: "" };
  }
};

/**
 * Generate a unique tracking number in the format SPX-YYYYMMDD-XXXX
 */
export const generateTrackingNumberString = (): string => {
  const today = new Date();
  const dateStr = today.getFullYear().toString() + (today.getMonth() + 1).toString().padStart(2, "0") + today.getDate().toString().padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SPX-${dateStr}-${rand}`;
};

/**
 * Generate a unique reference number in the format REF-XXXXXXXX
 */
export const generateReferenceNumberString = (): string => {
  return `REF-${Math.floor(10000000 + Math.random() * 90000000)}`;
};

/**
 * Validation utilities
 */
export const validateTrackingNumber = (trackingNumber: string): boolean => {
  return /^SPX-\d{8}-\d{4}$/.test(trackingNumber.trim().toUpperCase());
};

export const validatePhoneNumber = (phone: string): boolean => {
  return /^\+?[0-9\s\-]{7,20}$/.test(phone.trim());
};

export const validateWeight = (weight: string | number): boolean => {
  const num = typeof weight === 'string' ? parseFloat(weight) : weight;
  return !isNaN(num) && num > 0;
};

export const validatePackages = (packages: string | number): boolean => {
  const num = typeof packages === 'string' ? parseInt(packages, 10) : packages;
  return !isNaN(num) && Number.isInteger(num) && num > 0;
};
