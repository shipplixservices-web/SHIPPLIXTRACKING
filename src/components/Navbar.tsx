import React from "react";

interface NavbarProps {
  currentView: "customer" | "admin";
  onViewChange: (view: "customer" | "admin") => void;
}

export default function Navbar({ onViewChange }: NavbarProps) {
  return (
    <header className="bg-[#032B73] text-white shadow-md border-b-4 border-[#FFD700]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Branding */}
          <div 
            className="flex items-center cursor-pointer group"
            onClick={() => onViewChange("customer")}
          >
            <div className="flex items-center bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-xl transition-all border border-white/5 hover:border-white/15">
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-none select-none">
                  Shipplix
                </span>
                <span className="text-[9px] font-bold text-[#FFD700] tracking-widest uppercase mt-1">
                  Think Shipping Think Shipplix
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
