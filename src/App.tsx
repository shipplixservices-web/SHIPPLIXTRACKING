import React, { useState } from "react";
import Navbar from "./components/Navbar.tsx";
import CustomerPortal from "./components/CustomerPortal.tsx";
import AdminPanel from "./components/AdminPanel.tsx";
import { Globe, Plane, Shield, HelpCircle, Mail, MessageSquare } from "lucide-react";
import ShipplixLogo from "./components/ShipplixLogo.tsx";

export default function App() {
  const [currentView, setCurrentView] = useState<"customer" | "admin">("customer");
  const [activeTrackingQuery, setActiveTrackingQuery] = useState("");

  const handleAdminViewShipment = (trackingNumber: string) => {
    setActiveTrackingQuery(trackingNumber);
    setCurrentView("customer");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col selection:bg-[#FFD700] selection:text-[#032B73]">
      
      {/* Main branded Navigation Bar */}
      <Navbar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main View Workspace */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {currentView === "customer" ? (
          <CustomerPortal initialTrackingQuery={activeTrackingQuery} />
        ) : (
          <AdminPanel onTrackingRequest={handleAdminViewShipment} />
        )}
      </main>

      {/* Corporate Shipplix Brand Footer */}
      <footer className="bg-slate-900 text-white border-t-4 border-[#FFD700] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            
            {/* Column 1: Company Profile */}
            <div className="space-y-4">
              <div className="flex items-center">
                <ShipplixLogo variant="horizontal" textColor="text-white" size="xs" />
              </div>
              <p className="text-xs text-gray-400 leading-relaxed font-sans">
                The ultimate export partner helping African vendors turn local products into global cash. Shipping weekly batches from Lagos Hub directly to households and retail outlets across the USA, UK, and Canada.
              </p>
            </div>

            {/* Column 2: Logistics Services */}
            <div className="space-y-3 font-mono text-xs">
              <h4 className="font-sans font-bold text-sm text-[#FFD700] uppercase tracking-wider">Cargo Fleets</h4>
              <ul className="space-y-1.5 text-gray-400">
                <li className="hover:text-white transition-colors">• Express Air Cargo (3-5 days)</li>
                <li className="hover:text-white transition-colors">• Standard Air Freight (5-7 days)</li>
                <li className="hover:text-white transition-colors">• Economy consolidated shipping</li>
                <li className="hover:text-white transition-colors">• Door-to-door local courier</li>
              </ul>
            </div>

            {/* Column 3: Global Offices */}
            <div className="space-y-3 font-mono text-xs">
              <h4 className="font-sans font-bold text-sm text-[#FFD700] uppercase tracking-wider">Lagos Export Center</h4>
              <p className="text-gray-400 leading-relaxed">
                Shipplix Export Hub,<br />
                Lagos International Airport Road,<br />
                Ikeja, Lagos, Nigeria.<br />
                <span className="text-gray-300">Open 08:00 AM — 06:00 PM (Mon-Sat)</span>
              </p>
            </div>

            {/* Column 4: Customer Support Helpdesk */}
            <div className="space-y-3 font-mono text-xs">
              <h4 className="font-sans font-bold text-sm text-[#FFD700] uppercase tracking-wider">24/7 Security Hotline</h4>
              <div className="space-y-2 text-gray-400">
                <p className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-[#FFD700]" />
                  <span>shipplixservices@gmail.com</span>
                </p>
                <a 
                  href="https://wa.me/2349168273513"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-2 hover:opacity-80 transition-opacity w-fit"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-400 animate-pulse" />
                  <span className="text-emerald-400 font-bold">WhatsApp: +234 916 827 3513</span>
                </a>
              </div>
            </div>

          </div>

          {/* Lower Copyright Row */}
          <div className="border-t border-gray-800 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center text-center sm:text-left gap-4">
            <p className="text-[10px] text-gray-500 font-mono">
              © {new Date().getFullYear()} SHIPPLIX SERVICES CO. LTD. All rights reserved. Registered International Logistics forwarder with local airport cargo clearance credentials.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
