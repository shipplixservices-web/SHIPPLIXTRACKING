export interface CompanyInfo {
  name: string;
  slogan: string;
  website: string;
  taxId: string;
  logoText: string;
}

export interface BusinessAddress {
  street: string;
  suite: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface EmailsConfig {
  support: string;
  billing: string;
  operations: string;
}

export interface PhoneNumbersConfig {
  tollFree: string;
  support: string;
  operations: string;
}

export interface CurrencyConfig {
  baseCurrency: string;
  allowedCurrencies: string[];
}

export interface CountryConfig {
  supportedOrigins: string[];
  supportedDestinations: string[];
}

export interface ShippingRatesConfig {
  expressBase: number;
  expressPerKg: number;
  standardBase: number;
  standardPerKg: number;
  economyBase: number;
  economyPerKg: number;
}

export interface DefaultChargesConfig {
  packagingPerPackage: number;
  pickupFee: number;
  insuranceRatePercent: number;
  customsCharge: number;
  handlingSurcharges: number;
}

export interface AdminAccount {
  id: string;
  username: string;
  name: string;
  role: string;
  status: "Active" | "Inactive";
}

export interface RolePermissions {
  role: string;
  canManageShipments: boolean;
  canManageFinances: boolean;
  canManageReports: boolean;
  canManageBackups: boolean;
}

export interface NotificationSettings {
  emailOnMilestoneUpdate: boolean;
  emailOnDelayWarning: boolean;
  emailOnPaymentReceipt: boolean;
  emailOnBackupSuccess: boolean;
}

export interface BackupSettings {
  autoDailyBackup: boolean;
  retentionLimitDays: number;
  targetGateway: string;
}

export interface ThemeSettings {
  themeName: string; // 'Light Slate' | 'Cosmic Indigo' | 'Teal Forest'
}

export interface AppSettings {
  company: CompanyInfo;
  address: BusinessAddress;
  emails: EmailsConfig;
  phones: PhoneNumbersConfig;
  currencies: CurrencyConfig;
  countries: CountryConfig;
  rates: ShippingRatesConfig;
  charges: DefaultChargesConfig;
  admins: AdminAccount[];
  permissions: RolePermissions[];
  notifications: NotificationSettings;
  backups: BackupSettings;
  theme: ThemeSettings;
}

export const DEFAULT_SETTINGS: AppSettings = {
  company: {
    name: "Shipplix Premium Logistics",
    slogan: "Precision Global Cargo Delivery & Administrative Excellence",
    website: "https://www.shipplix.com",
    taxId: "TX-9988-2231-A",
    logoText: "SHIPPLIX"
  },
  address: {
    street: "100 Logistics Boulevard",
    suite: "Suite 400 - Operations Hub",
    city: "Houston",
    state: "Texas",
    zip: "77002",
    country: "United States"
  },
  emails: {
    support: "support@shipplix.com",
    billing: "billing@shipplix.com",
    operations: "ops@shipplix.com"
  },
  phones: {
    tollFree: "+1 (800) 555-SHIP",
    support: "+1 (713) 555-0199",
    operations: "+1 (713) 555-0188"
  },
  currencies: {
    baseCurrency: "USD ($)",
    allowedCurrencies: ["USD ($)", "EUR (€)", "GBP (£)", "NGN (₦)", "CNY (¥)"]
  },
  countries: {
    supportedOrigins: ["Nigeria", "Ghana", "Kenya", "South Africa", "United Kingdom", "United States", "Germany"],
    supportedDestinations: ["United States", "United Kingdom", "Canada", "Germany", "Nigeria", "Ghana", "United Arab Emirates"]
  },
  rates: {
    expressBase: 100,
    expressPerKg: 10,
    standardBase: 50,
    standardPerKg: 6,
    economyBase: 30,
    economyPerKg: 4
  },
  charges: {
    packagingPerPackage: 10,
    pickupFee: 15,
    insuranceRatePercent: 5, // 5%
    customsCharge: 35,
    handlingSurcharges: 10
  },
  admins: [
    { id: "1", username: "superadmin", name: "Chief Operations Director", role: "Super Admin", status: "Active" },
    { id: "2", username: "billing_ops", name: "Senior Finance Officer", role: "Finance Admin", status: "Active" },
    { id: "3", username: "dispatch_desk", name: "Fleet Supervisor", role: "Operations Desk", status: "Active" }
  ],
  permissions: [
    { role: "Super Admin", canManageShipments: true, canManageFinances: true, canManageReports: true, canManageBackups: true },
    { role: "Finance Admin", canManageShipments: false, canManageFinances: true, canManageReports: true, canManageBackups: false },
    { role: "Operations Desk", canManageShipments: true, canManageFinances: false, canManageReports: false, canManageBackups: true }
  ],
  notifications: {
    emailOnMilestoneUpdate: true,
    emailOnDelayWarning: true,
    emailOnPaymentReceipt: true,
    emailOnBackupSuccess: false
  },
  backups: {
    autoDailyBackup: true,
    retentionLimitDays: 30,
    targetGateway: "https://backup-us-west.shipplix.com/api/v1/store"
  },
  theme: {
    themeName: "Light Slate"
  }
};

const LOCAL_STORAGE_KEY = "shipplix_settings_data";

export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    const parsed = JSON.parse(data);
    // Deep merge to ensure newly added properties don't cause crashes
    return {
      company: { ...DEFAULT_SETTINGS.company, ...parsed.company },
      address: { ...DEFAULT_SETTINGS.address, ...parsed.address },
      emails: { ...DEFAULT_SETTINGS.emails, ...parsed.emails },
      phones: { ...DEFAULT_SETTINGS.phones, ...parsed.phones },
      currencies: { ...DEFAULT_SETTINGS.currencies, ...parsed.currencies },
      countries: { ...DEFAULT_SETTINGS.countries, ...parsed.countries },
      rates: { ...DEFAULT_SETTINGS.rates, ...parsed.rates },
      charges: { ...DEFAULT_SETTINGS.charges, ...parsed.charges },
      admins: parsed.admins || DEFAULT_SETTINGS.admins,
      permissions: parsed.permissions || DEFAULT_SETTINGS.permissions,
      notifications: { ...DEFAULT_SETTINGS.notifications, ...parsed.notifications },
      backups: { ...DEFAULT_SETTINGS.backups, ...parsed.backups },
      theme: { ...DEFAULT_SETTINGS.theme, ...parsed.theme }
    };
  } catch (error) {
    console.error("Failed to read settings from local storage, returning defaults", error);
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
    // Dispatch an event so custom themes can be applied dynamically
    window.dispatchEvent(new Event("shipplixSettingsChanged"));
  } catch (error) {
    console.error("Failed to save settings to local storage", error);
  }
}
