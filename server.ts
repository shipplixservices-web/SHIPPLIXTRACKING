import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
import { createServer as createViteServer } from "vite";
import { Shipment, MILESTONES, MilestoneHistoryEntry, NotificationEntry } from "./src/types.js";
import { supabase, mapDbShipmentToShipment } from "./src/supabaseClient.js";

const app = express();
const PORT = 3000;

app.use(express.json());

// Path for the JSON-based database
const DATA_FILE = path.join(process.cwd(), "shipments.json");
const BACKUP_DIR = path.join(process.cwd(), "backups");

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Generate premium mock shipments to populate the portal on first load
function getSeedShipments(): Shipment[] {
  const now = new Date("2026-06-27T01:27:36-07:00");
  
  const formatDate = (daysAgo: number, timeStr: string) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    return `${d.toISOString().split('T')[0]}T${timeStr}`;
  };

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
      currentMilestoneIndex: 6, // Customs Review (new list index 6)
      isPaused: false,
      milestoneHistory: [
        {
          milestoneIndex: 0,
          milestoneName: MILESTONES[0].name,
          description: MILESTONES[0].description,
          timestamp: formatDate(3, "10:42:00")
        },
        {
          milestoneIndex: 2,
          milestoneName: MILESTONES[2].name,
          description: MILESTONES[2].description,
          timestamp: formatDate(3, "14:15:00")
        },
        {
          milestoneIndex: 3,
          milestoneName: MILESTONES[3].name,
          description: MILESTONES[3].description,
          timestamp: formatDate(2, "09:30:00")
        },
        {
          milestoneIndex: 5,
          milestoneName: MILESTONES[5].name,
          description: MILESTONES[5].description,
          timestamp: formatDate(2, "16:45:00")
        },
        {
          milestoneIndex: 6,
          milestoneName: MILESTONES[6].name,
          description: MILESTONES[6].description,
          timestamp: formatDate(1, "11:20:00")
        }
      ],
      notifications: [
        {
          id: "notif-1",
          timestamp: formatDate(3, "10:42:00"),
          type: "email",
          recipient: "shipplixservices@gmail.com",
          milestoneName: "Shipment Received",
          status: "sent"
        },
        {
          id: "notif-2",
          timestamp: formatDate(2, "16:45:00"),
          type: "email",
          recipient: "shipplixservices@gmail.com",
          milestoneName: "Regulatory Inspection",
          status: "sent"
        },
        {
          id: "notif-3",
          timestamp: formatDate(1, "11:20:00"),
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
      currentMilestoneIndex: 23, // Delivered (new list index 23)
      isPaused: false,
      milestoneHistory: Array.from({ length: 24 }, (_, i) => {
        // Calculate dynamic timestamps going back from the delivery date
        const daysAgo = 6 - Math.floor(i * 0.25);
        const hour = 9 + (i % 8);
        return {
          milestoneIndex: i,
          milestoneName: MILESTONES[i].name,
          description: MILESTONES[i].description,
          timestamp: formatDate(daysAgo, `${hour.toString().padStart(2, '0')}:15:00`)
        };
      }),
      notifications: [
        {
          id: "notif-delivered-email",
          timestamp: formatDate(1, "15:30:00"),
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
      currentMilestoneIndex: 2, // Shipment Verified (new list index 2)
      isPaused: false,
      milestoneHistory: [
        {
          milestoneIndex: 0,
          milestoneName: MILESTONES[0].name,
          description: MILESTONES[0].description,
          timestamp: formatDate(1, "08:15:00")
        },
        {
          milestoneIndex: 2,
          milestoneName: MILESTONES[2].name,
          description: MILESTONES[2].description,
          timestamp: formatDate(0, "15:30:00")
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
      currentMilestoneIndex: 22, // Out for Delivery (new list index 22)
      isPaused: false,
      milestoneHistory: Array.from({ length: 23 }, (_, i) => {
        const daysAgo = 4 - Math.floor(i * 0.18);
        const hour = 8 + (i % 9);
        return {
          milestoneIndex: i,
          milestoneName: MILESTONES[i].name,
          description: MILESTONES[i].description,
          timestamp: formatDate(daysAgo, `${hour.toString().padStart(2, '0')}:45:00`)
        };
      }),
      notifications: []
    }
  ];
}

// Read database with automatic backward-compatibility sanitizer migration
function readDatabase(): Shipment[] {
  if (!fs.existsSync(DATA_FILE)) {
    const seeds = getSeedShipments();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeds, null, 2));
    return seeds;
  }
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    const shipments: Shipment[] = JSON.parse(data);
    
    let modified = false;
    const sanitized = shipments.map(s => {
      let isChanged = false;
      if (!s.shipmentHealth) {
        s.shipmentHealth = s.currentMilestoneIndex === 23 ? "optimal" : "optimal";
        isChanged = true;
      }
      if (!s.delayStatus) {
        s.delayStatus = "None";
        isChanged = true;
      }
      if (!s.internalNotes) {
        s.internalNotes = [
          {
            id: `note-init-${s.trackingNumber}`,
            text: `Initial cargo reception verified. Service speed: ${s.serviceType}.`,
            timestamp: s.bookingDate + "T10:00:00Z",
            author: "System Admin"
          }
        ];
        isChanged = true;
      }
      if (!s.documents) {
        s.documents = [
          {
            id: `doc-${s.trackingNumber}-inv`,
            name: `Invoice_${s.trackingNumber}.pdf`,
            type: "invoice",
            url: "#",
            uploadedAt: s.bookingDate + "T10:15:00Z",
            size: "142 KB"
          }
        ];
        if (s.currentMilestoneIndex === 23) {
          s.documents.push({
            id: `doc-${s.trackingNumber}-rec`,
            name: `Delivery_Receipt_${s.trackingNumber}.pdf`,
            type: "receipt",
            url: "#",
            uploadedAt: s.expectedDeliveryDate + "T15:30:00Z",
            size: "88 KB"
          });
        }
        isChanged = true;
      }
      if (!s.paymentHistory) {
        const rate = s.serviceType === "Express" ? 15 : s.serviceType === "Standard" ? 12 : 9;
        const amountDue = Math.round((s.weight * rate + 50) * 100) / 100;
        const status = s.currentMilestoneIndex === 23 ? "paid" : "partially_paid";
        const amountPaid = status === "paid" ? amountDue : Math.round((amountDue * 0.6) * 100) / 100;
        
        const transactions = [];
        if (amountPaid > 0) {
          transactions.push({
            id: `tx-${s.trackingNumber}-1`,
            amount: amountPaid,
            date: s.bookingDate,
            method: "Credit Card",
            reference: `REF-TX-${Math.floor(100000 + Math.random() * 900000)}`
          });
        }
        
        s.paymentHistory = {
          status,
          amountDue,
          amountPaid,
          transactions
        };
        isChanged = true;
      }
      if (!s.auditLogs || s.auditLogs.length === 0) {
        s.auditLogs = [
          {
            id: `audit-${s.trackingNumber}-init`,
            action: "Shipment Registered",
            timestamp: s.bookingDate + "T09:00:00Z",
            details: "Shipment initialized in administrative system.",
            author: "System Admin"
          }
        ];
        // Create secondary logs for milestones
        if (s.milestoneHistory) {
          s.milestoneHistory.forEach(h => {
            s.auditLogs?.push({
              id: `audit-${s.trackingNumber}-${h.milestoneIndex}`,
              action: `Transit Milestone: ${h.milestoneName}`,
              timestamp: h.timestamp,
              details: h.description,
              author: "Operations Specialist"
            });
          });
        }
        isChanged = true;
      }
      if (isChanged) {
        modified = true;
      }
      return s;
    });

    if (modified) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(sanitized, null, 2));
    }
    return sanitized;
  } catch (error) {
    console.error("Error reading database, reverting to seed data", error);
    return getSeedShipments();
  }
}

// Write database
function writeDatabase(shipments: Shipment[]) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(shipments, null, 2));
}

// Perform automatic backup (simulated backup system)
function performBackup(shipments: Shipment[]): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `shipments-backup-${timestamp}.json`;
  const backupPath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(backupPath, JSON.stringify(shipments, null, 2));
  
  // Clean old backups if there are more than 10
  try {
    const files = fs.readdirSync(BACKUP_DIR).map(f => ({
      name: f,
      path: path.join(BACKUP_DIR, f),
      time: fs.statSync(path.join(BACKUP_DIR, f)).mtime.getTime()
    })).sort((a, b) => b.time - a.time);
    
    if (files.length > 10) {
      for (let i = 10; i < files.length; i++) {
        fs.unlinkSync(files[i].path);
      }
    }
  } catch (err) {
    console.error("Backup rotation failed", err);
  }
  
  return filename;
}

// Simulated notification sender
function triggerNotification(shipment: Shipment, milestoneName: string): NotificationEntry[] {
  const newNotifs: NotificationEntry[] = [];
  
  // Create simulated email entry
  const emailNotif: NotificationEntry = {
    id: `notif-email-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type: "email",
    recipient: "shipplixservices@gmail.com", // Simulated client profile email
    milestoneName,
    status: "sent"
  };
  newNotifs.push(emailNotif);

  // Create simulated WhatsApp entry
  const waNotif: NotificationEntry = {
    id: `notif-wa-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    type: "whatsapp",
    recipient: shipment.phoneNumber || "+234 916 827 3513",
    milestoneName,
    status: "sent"
  };
  newNotifs.push(waNotif);

  return newNotifs;
}

// API: Authentication endpoint (Simple secure admin password checking)
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  
  // Accepting shipplixservices@gmail.com or high-security custom admin username
  const isValidUser = (email === "shipplixservices@gmail.com" || email === "shipplix_director_ops");
  const isValidPassword = (password === "Sh1ppL1x#Op_918273_SecUrE");
  
  if (isValidUser && isValidPassword) {
    return res.json({
      success: true,
      token: `shipplix-jwt-token-hash-2026-admin-access`,
      user: {
        email: email === "shipplix_director_ops" ? "shipplixservices@gmail.com" : email,
        role: "administrator",
        name: "Shipplix Operations Admin"
      }
    });
  }
  
  return res.status(401).json({
    success: false,
    message: "Invalid administrator credentials. Please check your email and security code."
  });
});

// API: Get all shipments
app.get("/api/shipments", (req, res) => {
  try {
    const shipments = readDatabase();
    res.json({ success: true, shipments });
  } catch (err: any) {
    console.error("Exception fetching shipments:", err);
    res.status(500).json({ success: false, message: err.message || err });
  }
});

// API: Get a single shipment by tracking number
app.get("/api/shipments/:trackingNumber", (req, res) => {
  const { trackingNumber } = req.params;
  try {
    const shipments = readDatabase();
    const shipment = shipments.find(s => s.trackingNumber.toUpperCase() === trackingNumber.trim().toUpperCase());

    if (!shipment) {
      return res.status(404).json({
        success: false,
        message: `Shipment with tracking number ${trackingNumber} could not be located.`
      });
    }

    res.json({ success: true, shipment });
  } catch (err: any) {
    console.error("Exception fetching single shipment:", err);
    res.status(500).json({ success: false, message: err.message || err });
  }
});

// API: Create new shipment
app.post("/api/shipments", (req, res) => {
  const shipments = readDatabase();
  const newShipmentData = req.body;
  
  if (!newShipmentData.trackingNumber) {
    return res.status(400).json({ success: false, message: "Tracking number is required." });
  }

  // Check uniqueness
  const exists = shipments.some(s => s.trackingNumber.toUpperCase() === newShipmentData.trackingNumber.toUpperCase());
  if (exists) {
    return res.status(400).json({ success: false, message: "A shipment with this tracking number already exists." });
  }

  // Create initial history entry
  const initialMilestoneIndex = 0; // Shipment Received
  const milestoneName = MILESTONES[initialMilestoneIndex].name;
  const description = MILESTONES[initialMilestoneIndex].description;
  const nowStr = new Date().toISOString();

  const milestoneHistory: MilestoneHistoryEntry[] = [
    {
      milestoneIndex: initialMilestoneIndex,
      milestoneName,
      description,
      timestamp: nowStr
    }
  ];

  const rate = (newShipmentData.serviceType === "Express" ? 15 : newShipmentData.serviceType === "Standard" ? 12 : 9);
  const weightNum = parseFloat(newShipmentData.weight) || 10;
  const amountDue = Math.round((weightNum * rate + 50) * 100) / 100;

  const newShipment: Shipment = {
    trackingNumber: newShipmentData.trackingNumber,
    referenceNumber: newShipmentData.referenceNumber || `REF-${Math.floor(10000000 + Math.random() * 90000000)}`,
    senderName: newShipmentData.senderName,
    receiverName: newShipmentData.receiverName,
    phoneNumber: newShipmentData.phoneNumber,
    originCountry: newShipmentData.originCountry || "Nigeria",
    destinationCountry: newShipmentData.destinationCountry,
    weight: weightNum,
    numberOfPackages: parseInt(newShipmentData.numberOfPackages) || 1,
    serviceType: newShipmentData.serviceType || "Express",
    bookingDate: newShipmentData.bookingDate || nowStr.split('T')[0],
    expectedDeliveryDate: newShipmentData.expectedDeliveryDate || nowStr.split('T')[0],
    shipmentNotes: newShipmentData.shipmentNotes || "",
    currentMilestoneIndex: initialMilestoneIndex,
    milestoneHistory,
    notifications: [],
    isPaused: false,
    portGateway: newShipmentData.portGateway || "",
    shipmentHealth: "optimal",
    delayStatus: "None",
    internalNotes: [
      {
        id: `note-init-${Date.now()}`,
        text: `Shipment registered successfully. Expected delivery date: ${newShipmentData.expectedDeliveryDate || nowStr.split('T')[0]}.`,
        timestamp: nowStr,
        author: "System Admin"
      }
    ],
    documents: [
      {
        id: `doc-inv-${Date.now()}`,
        name: `Invoice_${newShipmentData.trackingNumber}.pdf`,
        type: "invoice",
        url: "#",
        uploadedAt: nowStr,
        size: "120 KB"
      }
    ],
    paymentHistory: {
      status: "pending",
      amountDue,
      amountPaid: 0,
      transactions: []
    },
    auditLogs: [
      {
        id: `audit-init-${Date.now()}`,
        action: "Shipment Registered",
        timestamp: nowStr,
        details: `Initial entry created with weight of ${weightNum} KG across ${newShipmentData.numberOfPackages || 1} package(s).`,
        author: "System Admin"
      }
    ]
  };

  // Trigger default initial notification
  const initialNotifs = triggerNotification(newShipment, milestoneName);
  newShipment.notifications = initialNotifs;

  shipments.unshift(newShipment);
  writeDatabase(shipments);
  performBackup(shipments);

  res.status(201).json({ success: true, shipment: newShipment });
});

// API: Edit existing shipment
app.put("/api/shipments/:trackingNumber", (req, res) => {
  const { trackingNumber } = req.params;
  const updatedData = req.body;
  const shipments = readDatabase();
  
  const index = shipments.findIndex(s => s.trackingNumber.toUpperCase() === trackingNumber.toUpperCase());
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Shipment not found." });
  }

  const existingShipment = shipments[index];
  
  // Merge core fields
  shipments[index] = {
    ...existingShipment,
    senderName: updatedData.senderName ?? existingShipment.senderName,
    receiverName: updatedData.receiverName ?? existingShipment.receiverName,
    phoneNumber: updatedData.phoneNumber ?? existingShipment.phoneNumber,
    originCountry: updatedData.originCountry ?? existingShipment.originCountry,
    destinationCountry: updatedData.destinationCountry ?? existingShipment.destinationCountry,
    weight: parseFloat(updatedData.weight) ?? existingShipment.weight,
    numberOfPackages: parseInt(updatedData.numberOfPackages) ?? existingShipment.numberOfPackages,
    serviceType: updatedData.serviceType ?? existingShipment.serviceType,
    bookingDate: updatedData.bookingDate ?? existingShipment.bookingDate,
    expectedDeliveryDate: updatedData.expectedDeliveryDate ?? existingShipment.expectedDeliveryDate,
    shipmentNotes: updatedData.shipmentNotes ?? existingShipment.shipmentNotes,
    portGateway: updatedData.portGateway ?? existingShipment.portGateway
  };

  writeDatabase(shipments);
  res.json({ success: true, shipment: shipments[index] });
});

// API: Update shipment milestone status
app.post("/api/shipments/:trackingNumber/milestone", (req, res) => {
  const { trackingNumber } = req.params;
  const { milestoneIndex, customDescription } = req.body;
  
  const shipments = readDatabase();
  const index = shipments.findIndex(s => s.trackingNumber.toUpperCase() === trackingNumber.toUpperCase());
  
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Shipment not found." });
  }

  const shipment = shipments[index];
  const parsedIndex = parseInt(milestoneIndex);
  
  if (parsedIndex < 0 || parsedIndex >= MILESTONES.length) {
    return res.status(400).json({ success: false, message: "Invalid milestone index." });
  }

  const milestoneName = MILESTONES[parsedIndex].name;
  const description = customDescription || MILESTONES[parsedIndex].description;
  const timestamp = new Date().toISOString();

  // Add to history if not already present, or override it
  const historyIndex = shipment.milestoneHistory.findIndex(h => h.milestoneIndex === parsedIndex);
  
  if (historyIndex !== -1) {
    shipment.milestoneHistory[historyIndex] = {
      milestoneIndex: parsedIndex,
      milestoneName,
      description,
      timestamp
    };
  } else {
    shipment.milestoneHistory.push({
      milestoneIndex: parsedIndex,
      milestoneName,
      description,
      timestamp
    });
  }

  // Sort history by index
  shipment.milestoneHistory.sort((a, b) => a.milestoneIndex - b.milestoneIndex);

  // Update current active milestone index
  shipment.currentMilestoneIndex = parsedIndex;

  // Trigger email and whatsapp notifications simulation
  const newNotifs = triggerNotification(shipment, milestoneName);
  shipment.notifications = [...(shipment.notifications || []), ...newNotifs];

  writeDatabase(shipments);
  res.json({ success: true, shipment });
});

// API: Pause shipment
app.post("/api/shipments/:trackingNumber/pause", (req, res) => {
  const { trackingNumber } = req.params;
  const shipments = readDatabase();
  
  const index = shipments.findIndex(s => s.trackingNumber.toUpperCase() === trackingNumber.toUpperCase());
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Shipment not found." });
  }

  shipments[index].isPaused = true;
  writeDatabase(shipments);
  res.json({ success: true, shipment: shipments[index] });
});

// API: Resume shipment
app.post("/api/shipments/:trackingNumber/resume", (req, res) => {
  const { trackingNumber } = req.params;
  const shipments = readDatabase();
  
  const index = shipments.findIndex(s => s.trackingNumber.toUpperCase() === trackingNumber.toUpperCase());
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Shipment not found." });
  }

  shipments[index].isPaused = false;
  writeDatabase(shipments);
  res.json({ success: true, shipment: shipments[index] });
});

// API: Delete shipment
app.delete("/api/shipments/:trackingNumber", (req, res) => {
  const { trackingNumber } = req.params;
  let shipments = readDatabase();
  
  const initialLength = shipments.length;
  shipments = shipments.filter(s => s.trackingNumber.toUpperCase() !== trackingNumber.toUpperCase());
  
  if (shipments.length === initialLength) {
    return res.status(404).json({ success: false, message: "Shipment not found." });
  }

  writeDatabase(shipments);
  res.json({ success: true, message: `Shipment ${trackingNumber} has been successfully deleted.` });
});

// API: Update Shipment Health and Delay Status
app.put("/api/shipments/:trackingNumber/status", (req, res) => {
  const { trackingNumber } = req.params;
  const { shipmentHealth, delayStatus, author } = req.body;
  const shipments = readDatabase();
  const index = shipments.findIndex(s => s.trackingNumber.toUpperCase() === trackingNumber.toUpperCase());
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Shipment not found." });
  }

  const shipment = shipments[index];
  shipment.shipmentHealth = shipmentHealth ?? shipment.shipmentHealth;
  shipment.delayStatus = delayStatus ?? shipment.delayStatus;

  // Add audit log
  shipment.auditLogs = shipment.auditLogs || [];
  shipment.auditLogs.push({
    id: `audit-${Date.now()}`,
    action: "Status/Health Updated",
    timestamp: new Date().toISOString(),
    details: `Health set to: ${shipmentHealth}, Delay Status set to: ${delayStatus}`,
    author: author || "System Admin"
  });

  writeDatabase(shipments);
  res.json({ success: true, shipment });
});

// API: Add Internal Note
app.post("/api/shipments/:trackingNumber/notes", (req, res) => {
  const { trackingNumber } = req.params;
  const { text, author } = req.body;
  const shipments = readDatabase();
  const index = shipments.findIndex(s => s.trackingNumber.toUpperCase() === trackingNumber.toUpperCase());
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Shipment not found." });
  }

  const shipment = shipments[index];
  shipment.internalNotes = shipment.internalNotes || [];
  const newNote = {
    id: `note-${Date.now()}`,
    text,
    timestamp: new Date().toISOString(),
    author: author || "System Admin"
  };
  shipment.internalNotes.push(newNote);

  // Add audit log
  shipment.auditLogs = shipment.auditLogs || [];
  shipment.auditLogs.push({
    id: `audit-${Date.now()}`,
    action: "Internal Note Added",
    timestamp: new Date().toISOString(),
    details: `Added note: "${text.substring(0, 40)}${text.length > 40 ? '...' : ''}"`,
    author: author || "System Admin"
  });

  writeDatabase(shipments);
  res.json({ success: true, shipment, note: newNote });
});

// API: Add Document
app.post("/api/shipments/:trackingNumber/documents", (req, res) => {
  const { trackingNumber } = req.params;
  const { name, type, url, size, author } = req.body;
  const shipments = readDatabase();
  const index = shipments.findIndex(s => s.trackingNumber.toUpperCase() === trackingNumber.toUpperCase());
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Shipment not found." });
  }

  const shipment = shipments[index];
  shipment.documents = shipment.documents || [];
  const newDoc = {
    id: `doc-${Date.now()}`,
    name,
    type,
    url: url || "#",
    uploadedAt: new Date().toISOString(),
    size: size || "Unknown Size"
  };
  shipment.documents.push(newDoc);

  // Add audit log
  shipment.auditLogs = shipment.auditLogs || [];
  shipment.auditLogs.push({
    id: `audit-${Date.now()}`,
    action: "Document Uploaded",
    timestamp: new Date().toISOString(),
    details: `Uploaded ${type}: ${name}`,
    author: author || "System Admin"
  });

  writeDatabase(shipments);
  res.json({ success: true, shipment, document: newDoc });
});

// API: Add Transaction
app.post("/api/shipments/:trackingNumber/transactions", (req, res) => {
  const { trackingNumber } = req.params;
  const { amount, method, reference, date, author } = req.body;
  const shipments = readDatabase();
  const index = shipments.findIndex(s => s.trackingNumber.toUpperCase() === trackingNumber.toUpperCase());
  if (index === -1) {
    return res.status(404).json({ success: false, message: "Shipment not found." });
  }

  const shipment = shipments[index];
  shipment.paymentHistory = shipment.paymentHistory || {
    status: "pending",
    amountDue: shipment.weight * 12 + 50,
    amountPaid: 0,
    transactions: []
  };

  const amountNum = parseFloat(amount);
  const newTx = {
    id: `tx-${Date.now()}`,
    amount: amountNum,
    date: date || new Date().toISOString().split('T')[0],
    method: method || "Cash",
    reference: reference || `REF-${Date.now()}`
  };

  shipment.paymentHistory.transactions.push(newTx);
  shipment.paymentHistory.amountPaid = Math.round((shipment.paymentHistory.amountPaid + amountNum) * 100) / 100;
  
  if (shipment.paymentHistory.amountPaid >= shipment.paymentHistory.amountDue) {
    shipment.paymentHistory.status = "paid";
  } else if (shipment.paymentHistory.amountPaid > 0) {
    shipment.paymentHistory.status = "partially_paid";
  } else {
    shipment.paymentHistory.status = "pending";
  }

  // Add audit log
  shipment.auditLogs = shipment.auditLogs || [];
  shipment.auditLogs.push({
    id: `audit-${Date.now()}`,
    action: "Payment Logged",
    timestamp: new Date().toISOString(),
    details: `Logged ${method} payment of $${amountNum}. Total paid: $${shipment.paymentHistory.amountPaid}`,
    author: author || "System Admin"
  });

  writeDatabase(shipments);
  res.json({ success: true, shipment, transaction: newTx });
});

// API: Backups manual trigger
app.post("/api/backup", (req, res) => {
  const shipments = readDatabase();
  const backupFile = performBackup(shipments);
  res.json({ success: true, backupFile, message: "Database backup completed successfully." });
});

// API: Stats endpoint
app.get("/api/stats", (req, res) => {
  try {
    const shipments = readDatabase();
    
    const totalShipments = shipments.length;
    const deliveredShipments = shipments.filter(s => s.currentMilestoneIndex === 23).length; // "Delivered" is index 23
    const pendingVerification = shipments.filter(s => s.currentMilestoneIndex === 0).length;
    const inTransit = shipments.filter(s => s.currentMilestoneIndex > 0 && s.currentMilestoneIndex < 23).length;
    
    const todayStr = "2026-06-27"; // Context reference date
    const todayBookings = shipments.filter(s => s.bookingDate === todayStr).length;

    res.json({
      success: true,
      stats: {
        totalShipments,
        deliveredShipments,
        inTransit,
        pendingVerification,
        todayBookings
      }
    });
  } catch (err: any) {
    console.error("Exception fetching stats:", err);
    res.status(500).json({ success: false, message: err.message || err });
  }
});

// Implement Vite middleware for SPA and static asset delivery
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Serve index.html for all non-API paths in development to support SPA client routing
    app.get("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.startsWith("/api") || url.includes(".")) {
        return next();
      }
      try {
        let template = fs.readFileSync(
          path.resolve(process.cwd(), "index.html"),
          "utf-8"
        );
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Shipplix server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
