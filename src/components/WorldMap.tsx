import React, { useMemo } from "react";
import { Globe, Plane, MapPin } from "lucide-react";

interface WorldMapProps {
  origin: string; // e.g., "Nigeria"
  destination: string; // e.g., "United States", "United Kingdom", "Canada"
  currentMilestoneIndex: number; // 0 to 45
  isPaused?: boolean;
  portGateway?: string;
}

// 800x400 map canvas coordinates
interface Coord {
  x: number;
  y: number;
  label: string;
}

export default function WorldMap({ origin, destination, currentMilestoneIndex, isPaused = false, portGateway }: WorldMapProps) {
  // Origin is always Lagos, Nigeria for Shipplix in our context
  const originCoord: Coord = { x: 410, y: 245, label: "Lagos, Nigeria" };

  // Determine Destination coordinate based on country
  const destCoord: Coord = useMemo(() => {
    const dest = destination.toLowerCase().trim();
    if (
      dest.includes("united kingdom") || 
      dest.includes("uk") || 
      dest.includes("london") || 
      dest.includes("britain") || 
      dest.includes("england")
    ) {
      return { x: 395, y: 110, label: "London, United Kingdom" };
    } else if (
      dest.includes("canada") || 
      dest.includes("toronto") || 
      dest.includes("ca")
    ) {
      return { x: 205, y: 125, label: "Toronto, Canada" };
    } else {
      // Default to United States for anything else or USA/US match
      return { x: 190, y: 145, label: "Houston / New York, USA" };
    }
  }, [destination]);

  // Determine dynamic node label/code case-insensitively
  const destinationCode = useMemo(() => {
    if (portGateway && portGateway.trim()) {
      return portGateway.trim();
    }
    const dest = destination.toLowerCase().trim();
    if (
      dest.includes("united kingdom") || 
      dest.includes("uk") || 
      dest.includes("london") || 
      dest.includes("britain") || 
      dest.includes("england")
    ) {
      return "UK (LHR)";
    } else if (
      dest.includes("canada") || 
      dest.includes("toronto") || 
      dest.includes("ca")
    ) {
      return "CA (YYZ)";
    } else {
      return "US (IAH)";
    }
  }, [destination, portGateway]);

  // Calculate cargo icon progress along the curve (from 0 to 1)
  const progress = useMemo(() => {
    // Standard flow is 24 milestones total (0 to 23 is Delivered)
    return Math.min(Math.max(currentMilestoneIndex / 23, 0), 1);
  }, [currentMilestoneIndex]);

  // Calculate the cubic bezier curve points for natural visual arcs
  // P0 (Origin), P1 (Control 1), P2 (Control 2), P3 (Destination)
  const arcPathData = useMemo(() => {
    const p0 = originCoord;
    const p3 = destCoord;
    
    // Control points to create an elegant upward arched curve
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;
    
    const p1x = p0.x + dx * 0.25;
    const p1y = p0.y + dy * 0.25 - Math.abs(dx) * 0.25; // Pull upwards
    
    const p2x = p0.x + dx * 0.75;
    const p2y = p0.y + dy * 0.75 - Math.abs(dx) * 0.25; // Pull upwards

    return {
      p0,
      p1: { x: p1x, y: p1y },
      p2: { x: p2x, y: p2y },
      p3,
      pathString: `M ${p0.x} ${p0.y} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${p3.x} ${p3.y}`
    };
  }, [originCoord, destCoord]);

  // Get coordinates at a specific point t (0 to 1) along Bezier curve
  const currentPosition = useMemo(() => {
    const t = progress;
    const { p0, p1, p2, p3 } = arcPathData;
    
    // De Casteljau's algorithm for cubic Bezier
    const cx = (1-t)**3 * p0.x + 3*(1-t)**2 * t * p1.x + 3*(1-t) * t**2 * p2.x + t**3 * p3.x;
    const cy = (1-t)**3 * p0.y + 3*(1-t)**2 * t * p1.y + 3*(1-t) * t**2 * p2.y + t**3 * p3.y;
    
    // Calculate tangent slope for rotating airplane icon
    const dt = 0.01;
    const t2 = Math.min(t + dt, 1);
    const cx2 = (1-t2)**3 * p0.x + 3*(1-t2)**2 * t2 * p1.x + 3*(1-t2) * t2**2 * p2.x + t2**3 * p3.x;
    const cy2 = (1-t2)**3 * p0.y + 3*(1-t2)**2 * t2 * p1.y + 3*(1-t2) * t2**2 * p2.y + t2**3 * p3.y;
    
    const angle = Math.atan2(cy2 - cy, cx2 - cx) * (180 / Math.PI);
    
    return { x: cx, y: cy, angle };
  }, [progress, arcPathData]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-inner text-white overflow-hidden relative">
      <div className="absolute top-4 left-4 flex items-center space-x-2 z-10">
        <div className="h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
        <span className="text-xs font-mono tracking-wider uppercase text-slate-400">
          Live Flight Path Tracking Map
        </span>
      </div>

      {isPaused && (
        <div className="absolute top-4 right-4 bg-red-500/90 text-white px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider z-10 animate-pulse">
          Shipment On Hold
        </div>
      )}

      {/* SVG Container */}
      <div className="relative w-full aspect-[2/1] min-h-[220px]">
        <svg 
          viewBox="0 0 800 400" 
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Map Grid / Landmass representation (highly styled tech-look grid) */}
          <g opacity="0.15">
            <line x1="0" y1="50" x2="800" y2="50" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="0" y1="100" x2="800" y2="100" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="0" y1="150" x2="800" y2="150" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="0" y1="200" x2="800" y2="200" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="0" y1="250" x2="800" y2="250" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="0" y1="300" x2="800" y2="300" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="0" y1="350" x2="800" y2="350" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            
            <line x1="100" y1="0" x2="100" y2="400" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="200" y1="0" x2="200" y2="400" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="300" y1="0" x2="300" y2="400" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="400" y1="0" x2="400" y2="400" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="500" y1="0" x2="500" y2="400" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="600" y1="0" x2="600" y2="400" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
            <line x1="700" y1="0" x2="700" y2="400" stroke="#475569" strokeWidth="0.5" strokeDasharray="5,5" />
          </g>

          {/* Minimal Map Outlines for context (West Africa, Europe, Americas representation) */}
          {/* North America representation */}
          <path d="M 50 100 Q 150 80 180 130 T 260 160 T 220 230 T 160 210 Z" fill="#1e293b" opacity="0.4" />
          {/* South America representation */}
          <path d="M 200 240 Q 250 280 270 320 T 250 390 T 200 340 Z" fill="#1e293b" opacity="0.4" />
          {/* Europe representation */}
          <path d="M 360 80 Q 420 70 450 110 T 430 160 T 380 140 Z" fill="#1e293b" opacity="0.4" />
          {/* Africa representation */}
          <path d="M 360 190 Q 430 160 480 220 T 520 280 T 470 380 T 400 350 T 360 240 Z" fill="#1e293b" opacity="0.6" />

          {/* Dynamic Arc Route Line */}
          <path
            d={arcPathData.pathString}
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Glowing Animated Dash Flight Path (simulates movement) */}
          <path
            d={arcPathData.pathString}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeDasharray="8,6"
            strokeLinecap="round"
            className="animate-[dash_25s_linear_infinite]"
            style={{
              strokeDashoffset: 50
            }}
          />

          {/* Active progress path (completed portion) */}
          {progress > 0 && (
            <path
              id="active-path"
              d={arcPathData.pathString}
              fill="none"
              stroke="#ffd700"
              strokeWidth="2"
              strokeDasharray="400"
              strokeDashoffset={400 * (1 - progress)}
              strokeLinecap="round"
            />
          )}

          {/* Origin Node */}
          <g transform={`translate(${originCoord.x}, ${originCoord.y})`} className="cursor-pointer">
            <circle r="14" fill="#032B73" opacity="0.3" className="animate-ping" />
            <circle r="7" fill="#032B73" stroke="#FFD700" strokeWidth="2" />
            <circle r="3" fill="#ffffff" />
            <text y="24" textAnchor="middle" fill="#94a3b8" fontSize="10" fontWeight="bold" fontFamily="monospace">
              NG (LAGOS)
            </text>
          </g>

          {/* Destination Node */}
          <g transform={`translate(${destCoord.x}, ${destCoord.y})`} className="cursor-pointer">
            <circle r="14" fill="#FFD700" opacity="0.2" className="animate-ping" />
            <circle r="7" fill="#FFD700" stroke="#032B73" strokeWidth="2" />
            <circle r="3" fill="#032B73" />
            <text y="-16" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold" fontFamily="monospace">
              {destinationCode}
            </text>
          </g>

          {/* Current Location Cargo Indicator */}
          <g 
            transform={`translate(${currentPosition.x}, ${currentPosition.y}) rotate(${currentPosition.angle})`}
            className="transition-transform duration-500 ease-out"
          >
            {/* Glowing Tracking Ring */}
            <circle r="18" fill={isPaused ? "#ef4444" : "#ffd700"} opacity="0.25" className="animate-pulse" />
            <circle r="10" fill={isPaused ? "#ef4444" : "#032B73"} stroke={isPaused ? "#fca5a5" : "#ffd700"} strokeWidth="1.5" />
            
            {/* Delivery Airplane Icon */}
            <path 
              d="M12 2l3 9h-3l-2-4-2 4h-3z" 
              fill={isPaused ? "#ffffff" : "#ffd700"} 
              transform="scale(0.8) translate(-6, -6)"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}
