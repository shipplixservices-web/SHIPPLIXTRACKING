import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
import { createServer as createViteServer } from "vite";
import { Shipment, MILESTONES, MilestoneHistoryEntry, NotificationEntry } from "./shared/types.ts";
import { supabase, mapDbShipmentToShipment } from "./shared/supabaseClient.ts";

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

// Read database
function readDatabase(): Shipment[] {
  if (!fs.existsSync(DATA_FILE)) {
    const seeds = getSeedShipments();
    fs.writeFileSync(DATA_FILE, JSON.stringify(seeds, null, 2));
    return seeds;
  }
  try {
    const data = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(data);
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
app.get("/api/shipments", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching shipments from Supabase:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    const shipments = (data || []).map(mapDbShipmentToShipment);
    res.json({ success: true, shipments });
  } catch (err: any) {
    console.error("Exception fetching shipments:", err);
    res.status(500).json({ success: false, message: err.message || err });
  }
});

// API: Get a single shipment by tracking number
app.get("/api/shipments/:trackingNumber", async (req, res) => {
  const { trackingNumber } = req.params;
  try {
    const { data, error } = await supabase
      .from("shipments")
      .select("*")
      .eq("tracking_number", trackingNumber.trim().toUpperCase())
      .maybeSingle();

    if (error) {
      console.error("Error fetching single shipment from Supabase:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: `Shipment with tracking number ${trackingNumber} could not be located.`
      });
    }

    res.json({ success: true, shipment: mapDbShipmentToShipment(data) });
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

  const newShipment: Shipment = {
    trackingNumber: newShipmentData.trackingNumber,
    referenceNumber: newShipmentData.referenceNumber || `REF-${Math.floor(10000000 + Math.random() * 90000000)}`,
    senderName: newShipmentData.senderName,
    receiverName: newShipmentData.receiverName,
    phoneNumber: newShipmentData.phoneNumber,
    originCountry: newShipmentData.originCountry || "Nigeria",
    destinationCountry: newShipmentData.destinationCountry,
    weight: parseFloat(newShipmentData.weight) || 0.1,
    numberOfPackages: parseInt(newShipmentData.numberOfPackages) || 1,
    serviceType: newShipmentData.serviceType || "Express",
    bookingDate: newShipmentData.bookingDate || nowStr.split('T')[0],
    expectedDeliveryDate: newShipmentData.expectedDeliveryDate || nowStr.split('T')[0],
    shipmentNotes: newShipmentData.shipmentNotes || "",
    currentMilestoneIndex: initialMilestoneIndex,
    milestoneHistory,
    notifications: [],
    isPaused: false,
    portGateway: newShipmentData.portGateway || ""
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

// API: Backups manual trigger
app.post("/api/backup", (req, res) => {
  const shipments = readDatabase();
  const backupFile = performBackup(shipments);
  res.json({ success: true, backupFile, message: "Database backup completed successfully." });
});

// API: Stats endpoint
app.get("/api/stats", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("shipments")
      .select("*");

    if (error) {
      console.error("Error fetching stats from Supabase:", error);
      return res.status(500).json({ success: false, message: error.message });
    }

    const shipments = (data || []).map(mapDbShipmentToShipment);
    
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
