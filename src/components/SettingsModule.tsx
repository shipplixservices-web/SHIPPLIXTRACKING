import React, { useState, useEffect, useMemo } from "react";
import { 
  Building, MapPin, Mail, Phone, DollarSign, Globe, Scale, Shield, 
  Bell, Database, Palette, Save, CheckCircle2, UserPlus, Trash2, 
  RotateCcw, ShieldCheck, AlertCircle, Eye, Settings, HelpCircle
} from "lucide-react";
import { 
  AppSettings, getAppSettings, saveAppSettings, DEFAULT_SETTINGS, AdminAccount, RolePermissions 
} from "../utils/settingsUtils.ts";
import { getCurrencySymbol } from "../utils/currencyUtils.ts";

interface SettingsModuleProps {
  showSystemMessage?: (msg: string, type: "success" | "error" | "info") => void;
}

type SettingsSection = "company" | "pricing" | "admins" | "system";

export default function SettingsModule({ showSystemMessage }: SettingsModuleProps) {
  // Load initial settings
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState<SettingsSection>("company");
  const [isSavedAlert, setIsSavedAlert] = useState<boolean>(false);

  // Load on mount
  useEffect(() => {
    setSettings(getAppSettings());
  }, []);

  // Sync state helper
  const updateSettingsState = (updater: (prev: AppSettings) => AppSettings) => {
    setSettings(prev => {
      const next = updater(prev);
      return next;
    });
  };

  // 1. SAVE HANDLER
  const handleSave = () => {
    saveAppSettings(settings);
    setIsSavedAlert(true);
    if (showSystemMessage) {
      showSystemMessage("All administrative settings saved successfully to context ledger.", "success");
    }
    setTimeout(() => {
      setIsSavedAlert(false);
    }, 4000);
  };

  // 2. RESET TO DEFAULTS
  const handleResetToDefaults = () => {
    if (window.confirm("Are you sure you want to reset all configurations to the factory default values? This will overwrite your custom rates, countries, and accounts.")) {
      setSettings(DEFAULT_SETTINGS);
      saveAppSettings(DEFAULT_SETTINGS);
      if (showSystemMessage) {
        showSystemMessage("Factory default settings restored.", "info");
      }
    }
  };

  // 3. CURRENCY CONTROLS
  const [newCurrency, setNewCurrency] = useState<string>("");
  const handleAddCurrency = () => {
    if (!newCurrency.trim()) return;
    const clean = newCurrency.trim();
    if (settings.currencies.allowedCurrencies.includes(clean)) {
      alert("This currency is already registered.");
      return;
    }
    updateSettingsState(prev => ({
      ...prev,
      currencies: {
        ...prev.currencies,
        allowedCurrencies: [...prev.currencies.allowedCurrencies, clean]
      }
    }));
    setNewCurrency("");
  };

  const handleRemoveCurrency = (curr: string) => {
    if (settings.currencies.baseCurrency === curr) {
      alert("Cannot remove the active base transaction currency.");
      return;
    }
    updateSettingsState(prev => ({
      ...prev,
      currencies: {
        ...prev.currencies,
        allowedCurrencies: prev.currencies.allowedCurrencies.filter(c => c !== curr)
      }
    }));
  };

  // 4. COUNTRY CONTROLS
  const [newOrigin, setNewOrigin] = useState<string>("");
  const handleAddOrigin = () => {
    if (!newOrigin.trim()) return;
    const clean = newOrigin.trim();
    if (settings.countries.supportedOrigins.includes(clean)) {
      alert("This origin country is already supported.");
      return;
    }
    updateSettingsState(prev => ({
      ...prev,
      countries: {
        ...prev.countries,
        supportedOrigins: [...prev.countries.supportedOrigins, clean]
      }
    }));
    setNewOrigin("");
  };

  const handleRemoveOrigin = (country: string) => {
    if (settings.countries.supportedOrigins.length <= 1) {
      alert("At least one origin country must be supported.");
      return;
    }
    updateSettingsState(prev => ({
      ...prev,
      countries: {
        ...prev.countries,
        supportedOrigins: prev.countries.supportedOrigins.filter(c => c !== country)
      }
    }));
  };

  const [newDest, setNewDest] = useState<string>("");
  const handleAddDest = () => {
    if (!newDest.trim()) return;
    const clean = newDest.trim();
    if (settings.countries.supportedDestinations.includes(clean)) {
      alert("This destination country is already supported.");
      return;
    }
    updateSettingsState(prev => ({
      ...prev,
      countries: {
        ...prev.countries,
        supportedDestinations: [...prev.countries.supportedDestinations, clean]
      }
    }));
    setNewDest("");
  };

  const handleRemoveDest = (country: string) => {
    if (settings.countries.supportedDestinations.length <= 1) {
      alert("At least one destination country must be supported.");
      return;
    }
    updateSettingsState(prev => ({
      ...prev,
      countries: {
        ...prev.countries,
        supportedDestinations: prev.countries.supportedDestinations.filter(c => c !== country)
      }
    }));
  };

  // 5. ADMIN ACCOUNTS CONTROLS
  const [newAdmin, setNewAdmin] = useState({
    username: "",
    name: "",
    role: "Operations Desk"
  });

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdmin.username.trim() || !newAdmin.name.trim()) {
      alert("Please enter a username and display name.");
      return;
    }
    const id = Date.now().toString();
    const account: AdminAccount = {
      id,
      username: newAdmin.username.trim().toLowerCase(),
      name: newAdmin.name.trim(),
      role: newAdmin.role,
      status: "Active"
    };

    updateSettingsState(prev => ({
      ...prev,
      admins: [...prev.admins, account]
    }));

    setNewAdmin({ username: "", name: "", role: "Operations Desk" });
    if (showSystemMessage) {
      showSystemMessage(`Sub-admin user "${account.username}" registered successfully.`, "success");
    }
  };

  const handleToggleAdminStatus = (id: string) => {
    updateSettingsState(prev => ({
      ...prev,
      admins: prev.admins.map(adm => {
        if (adm.id === id) {
          return {
            ...adm,
            status: adm.status === "Active" ? "Inactive" : "Active"
          };
        }
        return adm;
      })
    }));
  };

  const handleRemoveAdmin = (id: string) => {
    const adminToRemove = settings.admins.find(adm => adm.id === id);
    if (adminToRemove?.username === "superadmin") {
      alert("The primary Super Admin account cannot be removed.");
      return;
    }
    updateSettingsState(prev => ({
      ...prev,
      admins: prev.admins.filter(adm => adm.id !== id)
    }));
  };

  // 6. PERMISSIONS UPDATE CONTROLS
  const handleTogglePermission = (role: string, field: keyof Omit<RolePermissions, "role">) => {
    updateSettingsState(prev => ({
      ...prev,
      permissions: prev.permissions.map(perm => {
        if (perm.role === role) {
          return {
            ...perm,
            [field]: !perm[field]
          };
        }
        return perm;
      })
    }));
  };

  // Available Roles
  const rolesList = ["Super Admin", "Finance Admin", "Operations Desk"];

  return (
    <div className="space-y-6">
      
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="bg-brand-blue/10 p-2.5 rounded-xl text-brand-blue">
            <Settings className="h-5 w-5 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-mono text-gray-900 uppercase tracking-wide">
              Shipplix Administrative Console
            </h3>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">
              Configure parameters, corporate rules, pricing rates, and access keys.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetToDefaults}
            className="flex items-center space-x-1.5 py-2 px-3 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-mono font-bold text-slate-500 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Restore Defaults</span>
          </button>
          
          <button
            onClick={handleSave}
            className="flex items-center space-x-1.5 py-2 px-4 bg-brand-blue hover:bg-brand-blue-dark text-white rounded-xl text-xs font-mono font-bold shadow-sm transition-all"
          >
            <Save className="h-3.5 w-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </div>

      {/* SAVE CONFIRMATION BANNER */}
      {isSavedAlert && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center space-x-2 animate-[fadeIn_0.2s_ease-out] text-xs font-mono">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Success Ledger Saved!</strong> All modified rules, tariffs, and permissions have been written to browser storage and applied to shipment generation tools.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* SIDE BAR NAVIGATION */}
        <div className="lg:col-span-1 space-y-2 bg-slate-50/50 p-2 border border-slate-100 rounded-2xl h-fit">
          <button
            onClick={() => setActiveSection("company")}
            className={`w-full flex items-center space-x-2.5 py-3 px-4 rounded-xl text-xs font-mono font-bold transition-all text-left ${
              activeSection === "company" 
                ? "bg-brand-blue text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Building className="h-4 w-4" />
            <span>Corporate Identity</span>
          </button>

          <button
            onClick={() => setActiveSection("pricing")}
            className={`w-full flex items-center space-x-2.5 py-3 px-4 rounded-xl text-xs font-mono font-bold transition-all text-left ${
              activeSection === "pricing" 
                ? "bg-brand-blue text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            <span>Tariffs & Countries</span>
          </button>

          <button
            onClick={() => setActiveSection("admins")}
            className={`w-full flex items-center space-x-2.5 py-3 px-4 rounded-xl text-xs font-mono font-bold transition-all text-left ${
              activeSection === "admins" 
                ? "bg-brand-blue text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Shield className="h-4 w-4" />
            <span>Access Control</span>
          </button>

          <button
            onClick={() => setActiveSection("system")}
            className={`w-full flex items-center space-x-2.5 py-3 px-4 rounded-xl text-xs font-mono font-bold transition-all text-left ${
              activeSection === "system" 
                ? "bg-brand-blue text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Database className="h-4 w-4" />
            <span>System Settings</span>
          </button>

          <div className="p-4 mt-8 bg-slate-100/50 rounded-xl border border-slate-200/50 text-[10px] text-slate-500 font-mono space-y-2">
            <span className="font-bold text-slate-700 block uppercase">Scope Rules:</span>
            <p>Every field on this panel is fully reactive. Changes alter the math used in new shipment creation.</p>
            <p className="text-brand-blue font-bold">● Active Theme: {settings.theme.themeName}</p>
          </div>
        </div>

        {/* DETAILS SECTION */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* 1. CORPORATE IDENTITY */}
          {activeSection === "company" && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-6 animate-[fadeIn_0.15s_ease-out]">
              <div className="border-b border-gray-100 pb-3 flex items-center space-x-2">
                <Building className="h-4 w-4 text-[#032B73]" />
                <h4 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wide">
                  Company Identity & Communication Hub
                </h4>
              </div>

              {/* Company & Address Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                <div className="space-y-1">
                  <label className="font-bold text-gray-500 block uppercase text-[9px]">Company Legal Name</label>
                  <input
                    type="text"
                    value={settings.company.name}
                    onChange={(e) => updateSettingsState(prev => ({
                      ...prev,
                      company: { ...prev.company, name: e.target.value }
                    }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-500 block uppercase text-[9px]">Corporate Slogan</label>
                  <input
                    type="text"
                    value={settings.company.slogan}
                    onChange={(e) => updateSettingsState(prev => ({
                      ...prev,
                      company: { ...prev.company, slogan: e.target.value }
                    }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-500 block uppercase text-[9px]">Corporate Website URL</label>
                  <input
                    type="text"
                    value={settings.company.website}
                    onChange={(e) => updateSettingsState(prev => ({
                      ...prev,
                      company: { ...prev.company, website: e.target.value }
                    }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-gray-500 block uppercase text-[9px]">Federal Tax Identification ID</label>
                  <input
                    type="text"
                    value={settings.company.taxId}
                    onChange={(e) => updateSettingsState(prev => ({
                      ...prev,
                      company: { ...prev.company, taxId: e.target.value }
                    }))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                  />
                </div>
              </div>

              {/* Business Address section */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <div className="flex items-center space-x-2 text-[#032B73]">
                  <MapPin className="h-4 w-4" />
                  <span className="text-xs font-bold font-mono uppercase">Official Business Headquarters</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="md:col-span-2 space-y-1">
                    <label className="font-bold text-gray-500 block uppercase text-[9px]">Street Address</label>
                    <input
                      type="text"
                      value={settings.address.street}
                      onChange={(e) => updateSettingsState(prev => ({
                        ...prev,
                        address: { ...prev.address, street: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-500 block uppercase text-[9px]">Suite / Room / Unit</label>
                    <input
                      type="text"
                      value={settings.address.suite}
                      onChange={(e) => updateSettingsState(prev => ({
                        ...prev,
                        address: { ...prev.address, suite: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-500 block uppercase text-[9px]">City</label>
                    <input
                      type="text"
                      value={settings.address.city}
                      onChange={(e) => updateSettingsState(prev => ({
                        ...prev,
                        address: { ...prev.address, city: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-500 block uppercase text-[9px]">State / Province</label>
                    <input
                      type="text"
                      value={settings.address.state}
                      onChange={(e) => updateSettingsState(prev => ({
                        ...prev,
                        address: { ...prev.address, state: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-500 block uppercase text-[9px]">ZIP / Postal Code</label>
                    <input
                      type="text"
                      value={settings.address.zip}
                      onChange={(e) => updateSettingsState(prev => ({
                        ...prev,
                        address: { ...prev.address, zip: e.target.value }
                      }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Emails & Hotlines */}
              <div className="border-t border-gray-100 pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Communication Emails */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-[#032B73]">
                      <Mail className="h-4 w-4" />
                      <span className="text-xs font-bold font-mono uppercase">Internal Routing Emails</span>
                    </div>

                    <div className="space-y-3 text-xs font-mono">
                      <div className="space-y-1">
                        <label className="font-bold text-gray-500 block text-[9px]">Customer Support Helpdesk</label>
                        <input
                          type="email"
                          value={settings.emails.support}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            emails: { ...prev.emails, support: e.target.value }
                          }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-gray-500 block text-[9px]">Financial & Billing Invoicing</label>
                        <input
                          type="email"
                          value={settings.emails.billing}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            emails: { ...prev.emails, billing: e.target.value }
                          }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-gray-500 block text-[9px]">Cargo Operations Terminal</label>
                        <input
                          type="email"
                          value={settings.emails.operations}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            emails: { ...prev.emails, operations: e.target.value }
                          }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hotlines */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 text-[#032B73]">
                      <Phone className="h-4 w-4" />
                      <span className="text-xs font-bold font-mono uppercase">Global Telephone Hotlines</span>
                    </div>

                    <div className="space-y-3 text-xs font-mono">
                      <div className="space-y-1">
                        <label className="font-bold text-gray-500 block text-[9px]">Toll-Free National Line</label>
                        <input
                          type="text"
                          value={settings.phones.tollFree}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            phones: { ...prev.phones, tollFree: e.target.value }
                          }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-gray-500 block text-[9px]">Urgent VIP Support Hotline</label>
                        <input
                          type="text"
                          value={settings.phones.support}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            phones: { ...prev.phones, support: e.target.value }
                          }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-gray-500 block text-[9px]">Terminal Gate Dispatch</label>
                        <input
                          type="text"
                          value={settings.phones.operations}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            phones: { ...prev.phones, operations: e.target.value }
                          }))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-1 focus:ring-blue-800 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. TARIFFS, COUNTRIES & DEFAULT PRICING */}
          {activeSection === "pricing" && (
            <div className="space-y-6 animate-[fadeIn_0.15s_ease-out]">
              
              {/* Shipping Rates Configuration */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center space-x-2">
                  <DollarSign className="h-4.5 w-4.5 text-[#032B73]" />
                  <h4 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wide">
                    Tariff Formulas by Service Tier
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  {/* Express */}
                  <div className="p-4 bg-amber-50/40 rounded-xl border border-amber-200/50 space-y-3">
                    <span className="font-bold text-amber-800 block text-[10px] uppercase">⚡ EXPRESS CARGO</span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] text-slate-500">Base Cost ({getCurrencySymbol()})</label>
                        <input
                          type="number"
                          value={settings.rates.expressBase}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            rates: { ...prev.rates, expressBase: Number(e.target.value) }
                          }))}
                          className="w-full bg-white border border-amber-200 rounded-lg p-2 focus:outline-none text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500">Per KG Weight Rate ({getCurrencySymbol()})</label>
                        <input
                          type="number"
                          value={settings.rates.expressPerKg}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            rates: { ...prev.rates, expressPerKg: Number(e.target.value) }
                          }))}
                          className="w-full bg-white border border-amber-200 rounded-lg p-2 focus:outline-none text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Standard */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <span className="font-bold text-slate-700 block text-[10px] uppercase">📦 STANDARD CARGO</span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] text-slate-500">Base Cost ({getCurrencySymbol()})</label>
                        <input
                          type="number"
                          value={settings.rates.standardBase}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            rates: { ...prev.rates, standardBase: Number(e.target.value) }
                          }))}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500">Per KG Weight Rate ({getCurrencySymbol()})</label>
                        <input
                          type="number"
                          value={settings.rates.standardPerKg}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            rates: { ...prev.rates, standardPerKg: Number(e.target.value) }
                          }))}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Economy */}
                  <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-200/50 space-y-3">
                    <span className="font-bold text-emerald-800 block text-[10px] uppercase">🌱 ECONOMY SEA-FREIGHT</span>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[9px] text-slate-500">Base Cost ({getCurrencySymbol()})</label>
                        <input
                          type="number"
                          value={settings.rates.economyBase}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            rates: { ...prev.rates, economyBase: Number(e.target.value) }
                          }))}
                          className="w-full bg-white border border-emerald-200 rounded-lg p-2 focus:outline-none text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-slate-500">Per KG Weight Rate ({getCurrencySymbol()})</label>
                        <input
                          type="number"
                          value={settings.rates.economyPerKg}
                          onChange={(e) => updateSettingsState(prev => ({
                            ...prev,
                            rates: { ...prev.rates, economyPerKg: Number(e.target.value) }
                          }))}
                          className="w-full bg-white border border-emerald-200 rounded-lg p-2 focus:outline-none text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Default Accessory Charges */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center space-x-2">
                  <Scale className="h-4.5 w-4.5 text-brand-blue" />
                  <h4 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wide">
                    Accessory Logistics Surcharges & Sizing Defaults
                  </h4>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
                  <div className="space-y-1">
                    <label className="font-bold text-gray-400 block text-[9px] uppercase">Packaging Fee ({getCurrencySymbol()}/pkg)</label>
                    <input
                      type="number"
                      value={settings.charges.packagingPerPackage}
                      onChange={(e) => updateSettingsState(prev => ({
                        ...prev,
                        charges: { ...prev.charges, packagingPerPackage: Number(e.target.value) }
                      }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-400 block text-[9px] uppercase">Terminal Pickup Fee ({getCurrencySymbol()})</label>
                    <input
                      type="number"
                      value={settings.charges.pickupFee}
                      onChange={(e) => updateSettingsState(prev => ({
                        ...prev,
                        charges: { ...prev.charges, pickupFee: Number(e.target.value) }
                      }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-400 block text-[9px] uppercase">Insurance Surcharge (%)</label>
                    <input
                      type="number"
                      value={settings.charges.insuranceRatePercent}
                      onChange={(e) => updateSettingsState(prev => ({
                        ...prev,
                        charges: { ...prev.charges, insuranceRatePercent: Number(e.target.value) }
                      }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-400 block text-[9px] uppercase">Customs Surcharge ({getCurrencySymbol()})</label>
                    <input
                      type="number"
                      value={settings.charges.customsCharge}
                      onChange={(e) => updateSettingsState(prev => ({
                        ...prev,
                        charges: { ...prev.charges, customsCharge: Number(e.target.value) }
                      }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none font-bold"
                    />
                  </div>

                  <div className="col-span-2 md:col-span-1 space-y-1">
                    <label className="font-bold text-gray-400 block text-[9px] uppercase">Handling Surcharges ({getCurrencySymbol()})</label>
                    <input
                      type="number"
                      value={settings.charges.handlingSurcharges}
                      onChange={(e) => updateSettingsState(prev => ({
                        ...prev,
                        charges: { ...prev.charges, handlingSurcharges: Number(e.target.value) }
                      }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Supported Countries & Currencies */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* 1. Base Currency Configurations */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                  <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase text-gray-800">Financial Currencies</span>
                    <DollarSign className="h-4 w-4 text-blue-800" />
                  </div>

                  <div className="space-y-3 text-xs font-mono">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-500">PRIMARY SYSTEM BASE</label>
                      <select
                        value={settings.currencies.baseCurrency}
                        onChange={(e) => updateSettingsState(prev => ({
                          ...prev,
                          currencies: { ...prev.currencies, baseCurrency: e.target.value }
                        }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:outline-none"
                      >
                        {settings.currencies.allowedCurrencies.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2 pt-2">
                      <label className="text-[9px] font-bold text-gray-500 block uppercase">Allowed Multi-Currencies</label>
                      <div className="max-h-32 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
                        {settings.currencies.allowedCurrencies.map(c => (
                          <div key={c} className="flex items-center justify-between p-2 hover:bg-slate-50">
                            <span className="font-bold text-slate-700">{c}</span>
                            <button
                              onClick={() => handleRemoveCurrency(c)}
                              className="text-slate-400 hover:text-red-500 p-0.5"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="Add e.g. NGN (₦)"
                        value={newCurrency}
                        onChange={(e) => setNewCurrency(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                      />
                      <button
                        onClick={handleAddCurrency}
                        className="bg-brand-blue hover:bg-brand-blue-dark text-white px-2.5 rounded-lg text-xs font-mono font-bold"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Country origins */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                  <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase text-gray-800">Supported Origins</span>
                    <Globe className="h-4 w-4 text-emerald-800" />
                  </div>

                  <div className="space-y-3 text-xs font-mono">
                    <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
                      {settings.countries.supportedOrigins.map(co => (
                        <div key={co} className="flex items-center justify-between p-2 hover:bg-slate-50">
                          <span className="font-semibold text-slate-700">{co}</span>
                          <button
                            onClick={() => handleRemoveOrigin(co)}
                            className="text-slate-400 hover:text-red-500 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="New origin country"
                        value={newOrigin}
                        onChange={(e) => setNewOrigin(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                      />
                      <button
                        onClick={handleAddOrigin}
                        className="bg-brand-blue hover:bg-brand-blue-dark text-white px-2.5 rounded-lg text-xs font-mono font-bold"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Country destinations */}
                <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs space-y-4">
                  <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                    <span className="text-xs font-bold font-mono uppercase text-gray-800">Supported Destinations</span>
                    <Globe className="h-4 w-4 text-brand-blue" />
                  </div>

                  <div className="space-y-3 text-xs font-mono">
                    <div className="max-h-48 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-50">
                      {settings.countries.supportedDestinations.map(cd => (
                        <div key={cd} className="flex items-center justify-between p-2 hover:bg-slate-50">
                          <span className="font-semibold text-slate-700">{cd}</span>
                          <button
                            onClick={() => handleRemoveDest(cd)}
                            className="text-slate-400 hover:text-red-500 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="New destination country"
                        value={newDest}
                        onChange={(e) => setNewDest(e.target.value)}
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-mono"
                      />
                      <button
                        onClick={handleAddDest}
                        className="bg-brand-blue hover:bg-brand-blue-dark text-white px-2.5 rounded-lg text-xs font-mono font-bold"
                      >
                        + Add
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* 3. ACCESS CONTROL (SUB-ADMIN ACCOUNTS & ROLE PERMISSIONS) */}
          {activeSection === "admins" && (
            <div className="space-y-6 animate-[fadeIn_0.15s_ease-out]">
              
              {/* Virtual Admin Accounts Table */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
                <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4.5 w-4.5 text-[#032B73]" />
                    <h4 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wide">
                      Virtual Sub-Admin Accounts Registered
                    </h4>
                  </div>
                  <span className="bg-[#032B73]/10 text-[#032B73] font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full">
                    {settings.admins.length} Total Users
                  </span>
                </div>

                {/* Sub admin Table */}
                <div className="overflow-x-auto text-xs font-mono">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200/50">
                        <th className="py-2.5 px-4">Display Name</th>
                        <th className="py-2.5 px-4">Username ID</th>
                        <th className="py-2.5 px-4">Privilege Role</th>
                        <th className="py-2.5 px-4 text-center">Operational Status</th>
                        <th className="py-2.5 px-4 text-right">Ledger Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {settings.admins.map(adm => (
                        <tr key={adm.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-800">{adm.name}</td>
                          <td className="py-3 px-4 font-bold text-[#032B73]">{adm.username}</td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-100 border border-slate-200/50 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {adm.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleAdminStatus(adm.id)}
                              className={`px-2 py-0.5 rounded-full font-mono text-[9px] font-bold ${
                                adm.status === "Active"
                                  ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                                  : "bg-amber-50 border border-amber-200 text-amber-700"
                              }`}
                            >
                              ● {adm.status}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-right">
                            {adm.username !== "superadmin" ? (
                              <button
                                onClick={() => handleRemoveAdmin(adm.id)}
                                className="text-red-400 hover:text-red-600 font-bold transition-colors"
                              >
                                Delete Account
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px] italic">Permanent Owner</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add sub admin user form */}
                <form onSubmit={handleAddAdmin} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
                  <span className="text-[10px] font-bold font-mono text-slate-600 block uppercase">
                    Register a New Sub-Admin Account Profile
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Display Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe"
                        value={newAdmin.name}
                        onChange={(e) => setNewAdmin(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Unique Username</label>
                      <input
                        type="text"
                        placeholder="e.g. johndoe_ops"
                        value={newAdmin.username}
                        onChange={(e) => setNewAdmin(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase">Role Assignment</label>
                      <select
                        value={newAdmin.role}
                        onChange={(e) => setNewAdmin(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 focus:outline-none"
                      >
                        <option value="Finance Admin">Finance Admin</option>
                        <option value="Operations Desk">Operations Desk</option>
                        <option value="Super Admin">Super Admin</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="w-full bg-[#032B73] hover:bg-blue-900 text-white font-mono font-bold p-2 rounded-lg flex items-center justify-center space-x-1"
                      >
                        <UserPlus className="h-4 w-4" />
                        <span>Register User</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Role Permissions Matrix */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center space-x-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-[#032B73]" />
                  <h4 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wide">
                    Operational Permission Capabilities Mapping
                  </h4>
                </div>

                <p className="text-[11px] font-mono text-slate-400">
                  Enable or disable functional blocks for user classes. Primary system safeguards prevent non-privileged accounts from modifying accounting sheets.
                </p>

                <div className="overflow-x-auto text-xs font-mono pt-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200/50">
                        <th className="py-2.5 px-4">Role Classification</th>
                        <th className="py-2.5 px-4 text-center">Manage Cargo Bookings</th>
                        <th className="py-2.5 px-4 text-center">Modify Finance Ledgers</th>
                        <th className="py-2.5 px-4 text-center">Access Analytics Reports</th>
                        <th className="py-2.5 px-4 text-center">Run Database Backups</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {settings.permissions.map(perm => (
                        <tr key={perm.role} className="hover:bg-slate-50/30 transition-colors">
                          <td className="py-3 px-4 font-bold text-[#032B73]">{perm.role}</td>
                          
                          {/* Manage Shipments */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={perm.canManageShipments}
                              disabled={perm.role === "Super Admin"}
                              onChange={() => handleTogglePermission(perm.role, "canManageShipments")}
                              className="h-4 w-4 text-[#032B73] focus:ring-0 rounded"
                            />
                          </td>

                          {/* Manage Finances */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={perm.canManageFinances}
                              disabled={perm.role === "Super Admin"}
                              onChange={() => handleTogglePermission(perm.role, "canManageFinances")}
                              className="h-4 w-4 text-[#032B73] focus:ring-0 rounded"
                            />
                          </td>

                          {/* Manage Reports */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={perm.canManageReports}
                              disabled={perm.role === "Super Admin"}
                              onChange={() => handleTogglePermission(perm.role, "canManageReports")}
                              className="h-4 w-4 text-[#032B73] focus:ring-0 rounded"
                            />
                          </td>

                          {/* Manage Backups */}
                          <td className="py-3 px-4 text-center">
                            <input
                              type="checkbox"
                              checked={perm.canManageBackups}
                              disabled={perm.role === "Super Admin"}
                              onChange={() => handleTogglePermission(perm.role, "canManageBackups")}
                              className="h-4 w-4 text-[#032B73] focus:ring-0 rounded"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* 4. SYSTEM CONFIGURATION (NOTIFICATIONS, BACKUP, THEMES) */}
          {activeSection === "system" && (
            <div className="space-y-6 animate-[fadeIn_0.15s_ease-out]">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Notification Settings */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                  <div className="border-b border-gray-100 pb-3 flex items-center space-x-2">
                    <Bell className="h-4.5 w-4.5 text-[#032B73]" />
                    <h4 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wide">
                      Automated Alerts & Notifications
                    </h4>
                  </div>

                  <div className="space-y-4 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 block">Milestone Update Alerts</span>
                        <span className="text-[10px] text-slate-400">Mail customer instantly when status updates</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailOnMilestoneUpdate}
                        onChange={(e) => updateSettingsState(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, emailOnMilestoneUpdate: e.target.checked }
                        }))}
                        className="h-4 w-4 text-[#032B73] focus:ring-0 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 block">Delay Warnings Alert</span>
                        <span className="text-[10px] text-slate-400">Trigger warnings for expired expected delivery dates</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailOnDelayWarning}
                        onChange={(e) => updateSettingsState(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, emailOnDelayWarning: e.target.checked }
                        }))}
                        className="h-4 w-4 text-[#032B73] focus:ring-0 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 block">Payment Invoices Email</span>
                        <span className="text-[10px] text-slate-400">Mail a receipt upon changes in financial status</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailOnPaymentReceipt}
                        onChange={(e) => updateSettingsState(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, emailOnPaymentReceipt: e.target.checked }
                        }))}
                        className="h-4 w-4 text-[#032B73] focus:ring-0 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 block">Backup Diagnostic Reports</span>
                        <span className="text-[10px] text-slate-400">Send logs on daily database sync diagnostic statuses</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.emailOnBackupSuccess}
                        onChange={(e) => updateSettingsState(prev => ({
                          ...prev,
                          notifications: { ...prev.notifications, emailOnBackupSuccess: e.target.checked }
                        }))}
                        className="h-4 w-4 text-[#032B73] focus:ring-0 rounded"
                      />
                    </div>
                  </div>
                </div>

                {/* Backup Configuration */}
                <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                  <div className="border-b border-gray-100 pb-3 flex items-center space-x-2">
                    <Database className="h-4.5 w-4.5 text-[#032B73]" />
                    <h4 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wide">
                      Disaster Recovery & Backup Configuration
                    </h4>
                  </div>

                  <div className="space-y-4 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-700 block">Automated Daily Sync</span>
                        <span className="text-[10px] text-slate-400">Daily database exports to storage container</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.backups.autoDailyBackup}
                        onChange={(e) => updateSettingsState(prev => ({
                          ...prev,
                          backups: { ...prev.backups, autoDailyBackup: e.target.checked }
                        }))}
                        className="h-4 w-4 text-[#032B73] focus:ring-0 rounded"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block uppercase text-[9px]">Retention Limit (Days)</label>
                      <input
                        type="number"
                        value={settings.backups.retentionLimitDays}
                        onChange={(e) => updateSettingsState(prev => ({
                          ...prev,
                          backups: { ...prev.backups, retentionLimitDays: Number(e.target.value) }
                        }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600 block uppercase text-[9px]">Disaster Target API Gateway</label>
                      <input
                        type="text"
                        value={settings.backups.targetGateway}
                        onChange={(e) => updateSettingsState(prev => ({
                          ...prev,
                          backups: { ...prev.backups, targetGateway: e.target.value }
                        }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-none text-[10px]"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Theme Settings Preset Selection */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4">
                <div className="border-b border-gray-100 pb-3 flex items-center space-x-2">
                  <Palette className="h-4.5 w-4.5 text-[#032B73]" />
                  <h4 className="text-xs font-bold font-mono text-gray-900 uppercase tracking-wide">
                    Administrative Visual Themes Configuration
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  {/* Preset 1: Light Slate */}
                  <button
                    onClick={() => updateSettingsState(prev => ({
                      ...prev,
                      theme: { themeName: "Light Slate" }
                    }))}
                    className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                      settings.theme.themeName === "Light Slate"
                        ? "border-[#032B73] ring-1 ring-blue-800 bg-slate-50/50"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Light Slate</span>
                      <div className="h-3.5 w-3.5 rounded-full bg-[#032B73] border border-white" />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Classic clean corporate styling using robust Deep Navy `#032B73` and Light Slate backgrounds.
                    </p>
                  </button>

                  {/* Preset 2: Cosmic Indigo */}
                  <button
                    onClick={() => updateSettingsState(prev => ({
                      ...prev,
                      theme: { themeName: "Cosmic Indigo" }
                    }))}
                    className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                      settings.theme.themeName === "Cosmic Indigo"
                        ? "border-indigo-600 ring-1 ring-indigo-600 bg-indigo-50/10"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-indigo-900">Cosmic Indigo</span>
                      <div className="h-3.5 w-3.5 rounded-full bg-indigo-600 border border-white" />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Modern tech aesthetic styled around Deep Indigo `#4F46E5` highlights and space-gray cards.
                    </p>
                  </button>

                  {/* Preset 3: Teal Forest */}
                  <button
                    onClick={() => updateSettingsState(prev => ({
                      ...prev,
                      theme: { themeName: "Teal Forest" }
                    }))}
                    className={`p-4 rounded-xl border text-left space-y-2 transition-all ${
                      settings.theme.themeName === "Teal Forest"
                        ? "border-teal-600 ring-1 ring-teal-600 bg-teal-50/10"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-teal-900">Teal Forest</span>
                      <div className="h-3.5 w-3.5 rounded-full bg-teal-600 border border-white" />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Eco-friendly, warm-toned look focusing on Forest Teal `#0D9488` highlights and organic mint details.
                    </p>
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
