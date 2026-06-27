import React from "react";

interface ShipplixLogoProps {
  variant?: "full" | "horizontal" | "icon" | "banner";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "auto";
  textColor?: string;
  className?: string;
}

export default function ShipplixLogo({
  variant = "horizontal",
  size = "md",
  textColor = "text-[#032B73]",
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
      <p className="text-red-600 font-black text-sm sm:text-lg tracking-wider uppercase leading-tight font-sans mt-1">
        THINK SHIPPING THINK SHIPPLIX
      </p>

      {/* Official Contact Phone Number */}
      <p className="text-[#032B73] font-black text-base sm:text-xl tracking-wide font-mono mt-1.5 bg-[#FFD700]/10 px-4 py-1.5 rounded-full border border-[#FFD700]/30 shadow-xs">
        09168273513
      </p>
    </div>
  );
}
