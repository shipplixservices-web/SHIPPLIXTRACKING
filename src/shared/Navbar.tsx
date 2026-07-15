import React from "react";
import { Search } from "lucide-react";

export default function Navbar() {
  return (
    <header className="bg-[#032B73] text-white shadow-md border-b-4 border-[#FFD700]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo and Branding */}
          <div className="flex items-center select-none">
            <div className="flex items-center bg-white/5 px-4 py-2.5 rounded-xl border border-white/5">
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

          {/* Nav Links */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div
              id="nav-customer-btn"
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-lg text-sm font-bold bg-[#FFD700] text-[#032B73] shadow-md scale-102 select-none"
            >
              <Search className="h-4.5 w-4.5" />
              <span>Track Parcel</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
