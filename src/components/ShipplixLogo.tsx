import React from "react";
import { MessageSquare } from "lucide-react";

interface ShipplixLogoProps {
  variant?: "full" | "horizontal" | "icon" | "banner";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "auto";
  textColor?: string;
  className?: string;
}

export default function ShipplixLogo({
  variant = "horizontal",
  size = "md",
  textColor = "text-brand-blue",
  className = "",
}: ShipplixLogoProps) {
  if (variant === "icon") {
    return (
      <span className={`font-black tracking-tight ${textColor} select-none`}>
        Shipplix
      </span>
    );
  }

  if (variant === "horizontal") {
    return (
      <div className={`inline-flex flex-col ${className}`}>
        <span className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${textColor} font-sans leading-none select-none`}>
          Shipplix
        </span>
        <span className="text-[10px] font-bold text-rose-600 tracking-wider uppercase mt-1">
          Think Shipping Think Shipplix
        </span>
      </div>
    );
  }

  // Full traditional brand block without the Globe/Logo, just leaving the name Shipplix and slogan
  return (
    <div className={`flex flex-col items-center text-center p-4 ${className}`}>
      {/* "Shipplix" Wordmark */}
      <span className={`text-4xl sm:text-5xl font-black tracking-tight ${textColor} font-sans mb-1`}>
        Shipplix
      </span>

      {/* Slogan: THINK SHIPPING THINK SHIPPLIX */}
      <p className="text-brand-danger font-black text-sm sm:text-lg tracking-wider uppercase leading-tight font-sans mt-1">
        THINK SHIPPING THINK SHIPPLIX
      </p>

      {/* Official Contact Phone Number */}
      <a 
        href="https://wa.me/2349168273513" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-brand-blue hover:text-brand-blue-dark transition-all duration-200 font-bold text-sm sm:text-base mt-3 bg-brand-yellow hover:bg-brand-yellow-dark px-5 py-2.5 rounded-full border border-brand-yellow shadow-md inline-flex items-center gap-2 select-none"
      >
        <MessageSquare className="h-4 w-4 text-brand-blue" />
        <span>Contact us on WhatsApp</span>
      </a>
    </div>
  );
}
