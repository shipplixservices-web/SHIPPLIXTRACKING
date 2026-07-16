import { Shipment } from "../types.js";
import { getAppSettings } from "./settingsUtils.ts";

export interface ShipmentFinance {
  shippingFee: number;
  packagingFee: number;
  pickupFee: number;
  insurance: number;
  customCharge: number;
  discount: number;
  otherCharges: number;
  totalCharged: number; // calculated automatically
  actualCost: number;
  profit: number; // calculated automatically
  paymentStatus: "Unpaid" | "Partially Paid" | "Paid" | "Refunded";
  amountPaid: number;
  balance: number; // calculated automatically
}

const FINANCE_SEPARATOR = "\n\n__FINANCE_METADATA_JSON__\n";

/**
 * Calculates the total charged, profit, and balance automatically from the raw input financial numbers.
 */
export function calculateFinanceCalculatedFields(
  raw: Omit<ShipmentFinance, "totalCharged" | "profit" | "balance">
): ShipmentFinance {
  const totalCharged = Math.round(
    (raw.shippingFee +
      raw.packagingFee +
      raw.pickupFee +
      raw.insurance +
      raw.customCharge +
      raw.otherCharges -
      raw.discount) * 100
  ) / 100;

  const profit = Math.round((totalCharged - raw.actualCost) * 100) / 100;
  const balance = Math.round((totalCharged - raw.amountPaid) * 100) / 100;

  return {
    ...raw,
    totalCharged,
    profit,
    balance
  };
}

/**
 * Generates sensible default financial numbers for a shipment based on its physical properties.
 */
export function getDefaultShipmentFinance(shipment: Shipment): ShipmentFinance {
  const settings = getAppSettings();
  let shippingRate = settings.rates.standardPerKg;
  let basePrice = settings.rates.standardBase;

  if (shipment.serviceType === "Express") {
    shippingRate = settings.rates.expressPerKg;
    basePrice = settings.rates.expressBase;
  } else if (shipment.serviceType === "Economy") {
    shippingRate = settings.rates.economyPerKg;
    basePrice = settings.rates.economyBase;
  }

  const weight = shipment.weight || 5;
  const packages = shipment.numberOfPackages || 1;

  const shippingFee = Math.round((basePrice + (shippingRate * weight)) * 100) / 100;
  const packagingFee = packages * settings.charges.packagingPerPackage;
  const pickupFee = settings.charges.pickupFee;
  const insurance = Math.round((shippingFee * (settings.charges.insuranceRatePercent / 100)) * 100) / 100;
  const customCharge = settings.charges.customsCharge;
  const discount = 0;
  const otherCharges = settings.charges.handlingSurcharges;

  const totalCharged = Math.round(
    (shippingFee + packagingFee + pickupFee + insurance + customCharge + otherCharges - discount) * 100
  ) / 100;

  // Actual cost is roughly 40% cargo operations + fixed package handler fees
  const actualCost = Math.round(((totalCharged * 0.40) + (packages * 12) + 25) * 100) / 100;
  const profit = Math.round((totalCharged - actualCost) * 100) / 100;

  // Set default payment status based on milestone index
  // 29 is payment pending, 23 is delivered
  let paymentStatus: ShipmentFinance["paymentStatus"] = "Paid";
  let amountPaid = totalCharged;

  if (shipment.currentMilestoneIndex === 29) {
    paymentStatus = "Unpaid";
    amountPaid = 0;
  } else if (shipment.currentMilestoneIndex === 43 || shipment.currentMilestoneIndex === 44) {
    paymentStatus = "Refunded";
    amountPaid = 0;
  } else if (shipment.currentMilestoneIndex < 5) {
    // Early stage
    paymentStatus = "Partially Paid";
    amountPaid = Math.round((totalCharged * 0.5) * 100) / 100;
  }

  const balance = Math.round((totalCharged - amountPaid) * 100) / 100;

  return {
    shippingFee,
    packagingFee,
    pickupFee,
    insurance,
    customCharge,
    discount,
    otherCharges,
    totalCharged,
    actualCost,
    profit,
    paymentStatus,
    amountPaid,
    balance
  };
}

/**
 * Parses shipment notes to extract structural finance metadata and user-visible notes.
 */
export function parseShipmentNotesAndFinance(shipment: Shipment): {
  notes: string;
  finance: ShipmentFinance;
} {
  const fullNotes = shipment.shipmentNotes || "";
  const parts = fullNotes.split(FINANCE_SEPARATOR);

  const cleanNotes = parts[0].trim();
  let finance: ShipmentFinance;

  if (parts.length > 1) {
    try {
      const parsed = JSON.parse(parts[1].trim());
      // Re-run calculated fields automatically to ensure complete safety and accuracy
      finance = calculateFinanceCalculatedFields({
        shippingFee: Number(parsed.shippingFee) || 0,
        packagingFee: Number(parsed.packagingFee) || 0,
        pickupFee: Number(parsed.pickupFee) || 0,
        insurance: Number(parsed.insurance) || 0,
        customCharge: Number(parsed.customCharge) || 0,
        discount: Number(parsed.discount) || 0,
        otherCharges: Number(parsed.otherCharges) || 0,
        actualCost: Number(parsed.actualCost) || 0,
        paymentStatus: parsed.paymentStatus || "Paid",
        amountPaid: Number(parsed.amountPaid) || 0
      });
    } catch (e) {
      finance = getDefaultShipmentFinance(shipment);
    }
  } else {
    finance = getDefaultShipmentFinance(shipment);
  }

  return {
    notes: cleanNotes,
    finance
  };
}

/**
 * Serializes custom notes and finance metadata into a single string for storage in Supabase.
 */
export function serializeNotesWithFinance(notes: string, finance: ShipmentFinance): string {
  const cleanNotes = notes.trim();
  const calculated = calculateFinanceCalculatedFields(finance);
  return `${cleanNotes}${FINANCE_SEPARATOR}${JSON.stringify(calculated)}`;
}
