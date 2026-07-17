import React, { useMemo } from "react";
import { Plane, MapPin, Compass, Navigation } from "lucide-react";
import { Shipment, MILESTONES } from "../types.js";
import THEME from "../utils/theme.ts";

interface StaticMapProps {
  shipment: Shipment;
}

interface Coord {
  x: number;
  y: number;
  city: string;
  country: string;
  airport: string;
  code: string;
  lat: string;
  lng: string;
  distanceKm: number;
}

export default function StaticMap({ shipment }: StaticMapProps) {
  const { destinationCountry, currentMilestoneIndex, isPaused, portGateway } = shipment;

  // Origin is always Lagos Hub for Shipplix
  const origin: Coord = {
    x: 430,
    y: 245,
    city: "Lagos",
    country: "Nigeria",
    airport: "Murtala Muhammed Int'l (Lagos Hub)",
    code: "LOS",
    lat: "6.5244° N",
    lng: "3.3792° E",
    distanceKm: 0,
  };

  // Resolve Destination city & coordinates
  const destination: Coord = useMemo(() => {
    const dest = destinationCountry.toLowerCase().trim();
    const gateway = portGateway?.toUpperCase().trim() || "";

    if (
      dest.includes("united kingdom") ||
      dest.includes("uk") ||
      dest.includes("london") ||
      dest.includes("britain") ||
      dest.includes("england")
    ) {
      return {
        x: 410,
        y: 110,
        city: "London",
        country: "United Kingdom",
        airport: "London Heathrow Airport",
        code: gateway || "LHR",
        lat: "51.4700° N",
        lng: "0.4543° W",
        distanceKm: 5012, // Approx distance Lagos -> London in km
      };
    } else if (
      dest.includes("canada") ||
      dest.includes("toronto") ||
      dest.includes("ca")
    ) {
      return {
        x: 205,
        y: 125,
        city: "Toronto",
        country: "Canada",
        airport: "Toronto Pearson Int'l Airport",
        code: gateway || "YYZ",
        lat: "43.6777° N",
        lng: "79.6248° W",
        distanceKm: 8780, // Approx distance Lagos -> Toronto in km
      };
    } else {
      // Default to US (Houston or New York depending on gateway)
      const isJFK = gateway === "JFK" || dest.includes("new york") || dest.includes("ny");
      return {
        x: isJFK ? 220 : 190,
        y: isJFK ? 140 : 155,
        city: isJFK ? "New York" : "Houston",
        country: "United States",
        airport: isJFK ? "John F. Kennedy Int'l" : "George Bush Intercontinental",
        code: gateway || (isJFK ? "JFK" : "IAH"),
        lat: isJFK ? "40.6413° N" : "29.9902° N",
        lng: isJFK ? "73.7781° W" : "95.3368° W",
        distanceKm: isJFK ? 8450 : 9620, // Approx distance in km
      };
    }
  }, [destinationCountry, portGateway]);

  // Calculate cargo flight progress along the curve (from 0 to 1)
  // Standard flow: 24 milestones (0 to 23)
  const progress = useMemo(() => {
    return Math.min(Math.max(currentMilestoneIndex / 23, 0), 1);
  }, [currentMilestoneIndex]);

  // Cubic Bezier curve control points for visual flight arc
  const arcPathData = useMemo(() => {
    const p0 = origin;
    const p3 = destination;

    // Pull upwards to create an elegant flight arc over the Atlantic
    const dx = p3.x - p0.x;
    const dy = p3.y - p0.y;

    const p1x = p0.x + dx * 0.25;
    const p1y = p0.y + dy * 0.25 - Math.abs(dx) * 0.22;

    const p2x = p0.x + dx * 0.75;
    const p2y = p0.y + dy * 0.75 - Math.abs(dx) * 0.22;

    return {
      p0,
      p1: { x: p1x, y: p1y },
      p2: { x: p2x, y: p2y },
      p3,
      pathString: `M ${p0.x} ${p0.y} C ${p1x} ${p1y}, ${p2x} ${p2y}, ${p3.x} ${p3.y}`,
    };
  }, [origin, destination]);

  // Calculate current location coordinate (x, y) along the Bezier curve
  const currentPosition = useMemo(() => {
    const t = progress;
    const { p0, p1, p2, p3 } = arcPathData;

    // De Casteljau's algorithm for cubic Bezier curves
    const cx =
      (1 - t) ** 3 * p0.x +
      3 * (1 - t) ** 2 * t * p1.x +
      3 * (1 - t) * t ** 2 * p2.x +
      t ** 3 * p3.x;
    const cy =
      (1 - t) ** 3 * p0.y +
      3 * (1 - t) ** 2 * t * p1.y +
      3 * (1 - t) * t ** 2 * p2.y +
      t ** 3 * p3.y;

    // Angle of flight for airplane icon rotation
    const dt = 0.01;
    const t2 = Math.min(t + dt, 1);
    const cx2 =
      (1 - t2) ** 3 * p0.x +
      3 * (1 - t2) ** 2 * t2 * p1.x +
      3 * (1 - t2) * t2 ** 2 * p2.x +
      t2 ** 3 * p3.x;
    const cy2 =
      (1 - t2) ** 3 * p0.y +
      3 * (1 - t2) ** 2 * t2 * p1.y +
      3 * (1 - t2) * t2 ** 2 * p2.y +
      t2 ** 3 * p3.y;

    const angle = Math.atan2(cy2 - cy, cx2 - cx) * (180 / Math.PI);

    return { x: cx, y: cy, angle };
  }, [progress, arcPathData]);

  // Derived stats for map overlays
  const currentDistanceCovered = Math.round(destination.distanceKm * progress);
  
  // Calculate simulated latitude and longitude for the current position
  const currentCoords = useMemo(() => {
    if (progress === 0) return { lat: origin.lat, lng: origin.lng };
    if (progress === 1) return { lat: destination.lat, lng: destination.lng };

    // Simple linear interpolation of coordinates for visual display
    const latNumOrigin = parseFloat(origin.lat);
    const latNumDest = parseFloat(destination.lat);
    const lngNumOrigin = parseFloat(origin.lng);
    const lngNumDest = parseFloat(destination.lng) * (destination.lng.includes("W") ? -1 : 1);

    const curLat = latNumOrigin + (latNumDest - latNumOrigin) * progress;
    const curLng = lngNumOrigin + (lngNumDest - lngNumOrigin) * progress;

    return {
      lat: `${Math.abs(curLat).toFixed(4)}° ${curLat >= 0 ? "N" : "S"}`,
      lng: `${Math.abs(curLng).toFixed(4)}° ${curLng >= 0 ? "E" : "W"}`,
    };
  }, [progress, origin, destination]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl text-white font-sans flex flex-col relative">
      {/* Map Header HUD */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-5 py-4 flex flex-wrap items-center justify-between gap-4 z-10 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
            <Compass className="h-5 w-5 animate-[spin_10s_linear_infinite]" />
          </div>
          <div>
            <h4 className="text-sm font-black tracking-wide uppercase text-brand-yellow">
              
            </h4>
            <p className="text-[10px] text-slate-400 font-mono">
              HUB DISPATCH VECTOR • LAGOS HUB ➔ {destination.city.toUpperCase()}
            </p>
          </div>
        </div>

        {/* Dynamic Flight Stats Info bar */}
        <div className="flex items-center space-x-6 text-xs font-mono">
          <div className="hidden sm:block">
            <span className="text-slate-500 text-[9px] block uppercase">Est. Distance</span>
            <span className="text-slate-200 font-bold">{destination.distanceKm.toLocaleString()} KM</span>
          </div>
          <div className="hidden md:block">
            <span className="text-slate-500 text-[9px] block uppercase">Range Cleared</span>
            <span className="text-emerald-400 font-bold">{currentDistanceCovered.toLocaleString()} KM</span>
          </div>
          <div>
            <span className="text-slate-500 text-[9px] block uppercase">Transit Status</span>
            <span className={`font-extrabold ${isPaused ? "text-red-400 animate-pulse" : progress === 1 ? "text-emerald-400" : "text-blue-400"}`}>
              {isPaused ? "ON HOLD" : progress === 1 ? "ARRIVED" : `${Math.round(progress * 100)}% IN FLIGHT`}
            </span>
          </div>
        </div>
      </div>

      {/* Main Map Arena */}
      <div className="relative w-full aspect-[2/1] min-h-[300px] bg-slate-950">
        
        {/* Radar grids overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

        {/* SVG Map Canvas */}
        <svg
          viewBox="0 0 800 400"
          className="w-full h-full select-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Latitude / Longitude Coordinate Lines */}
          <g opacity="0.08" stroke="#ffffff" strokeWidth="0.5" strokeDasharray="3,3">
            <line x1="0" y1="100" x2="800" y2="100" />
            <line x1="0" y1="200" x2="800" y2="200" />
            <line x1="0" y1="300" x2="800" y2="300" />
            <line x1="200" y1="0" x2="200" y2="400" />
            <line x1="400" y1="0" x2="400" y2="400" />
            <line x1="600" y1="0" x2="600" y2="400" />
          </g>

          {/* Cartography Continent Outlines - stylized abstract shapes for continents */}
          {/* North America representation */}
          <path
            d="M 40 80 C 80 60, 150 50, 190 90 C 230 130, 260 150, 240 190 C 220 230, 180 250, 140 230 C 100 210, 60 170, 40 130 Z"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          {/* South America representation */}
          <path
            d="M 160 250 C 200 270, 250 290, 250 330 C 250 370, 200 390, 180 390 C 160 390, 140 350, 130 310 C 120 270, 140 250, 160 250 Z"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          {/* Europe & Middle East representation */}
          <path
            d="M 350 60 C 400 40, 450 40, 470 80 C 490 120, 520 150, 480 180 C 440 210, 390 180, 360 150 C 330 120, 320 80, 350 60 Z"
            fill="#0f172a"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          {/* Africa representation - Highly visible as the origin */}
          <path
            d="M 370 190 C 420 160, 480 190, 490 240 C 500 290, 530 330, 490 370 C 450 410, 410 390, 390 350 C 370 310, 350 250, 370 190 Z"
            fill="#1e293b"
            stroke="#334155"
            strokeWidth="2"
          />

          {/* Core Flight Arc Path (Shadow line) */}
          <path
            d={arcPathData.pathString}
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="4"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Active completed route path (glowing gold line) */}
          {progress > 0 && (
            <path
              d={arcPathData.pathString}
              fill="none"
              stroke={THEME.yellow}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="1000"
              strokeDashoffset={1000 * (1 - progress)}
              className="transition-all duration-700"
            />
          )}

          {/* Animated pulsing beacons along the path */}
          <path
            d={arcPathData.pathString}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            strokeDasharray="10, 15"
            strokeLinecap="round"
            className="opacity-40 animate-[dash_35s_linear_infinite]"
          />

          {/* Origin Node - Lagos Hub */}
          <g transform={`translate(${origin.x}, ${origin.y})`} className="cursor-pointer group">
            <circle r="16" fill={THEME.blue} opacity="0.35" className="animate-ping" />
            <circle r="8" fill={THEME.blue} stroke={THEME.yellow} strokeWidth="2" />
            <circle r="3.5" fill="#ffffff" />
            
            {/* Label box */}
            <g transform="translate(0, 24)">
              <rect x="-45" y="-12" width="90" height="20" rx="4" fill="#0f172a" stroke="#334155" strokeWidth="1" />
              <text textAnchor="middle" y="2" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="monospace">
                LOS: LAGOS
              </text>
            </g>
          </g>

          {/* Destination Node */}
          <g transform={`translate(${destination.x}, ${destination.y})`} className="cursor-pointer">
            <circle r="16" fill={THEME.yellow} opacity="0.25" className="animate-ping" />
            <circle r="8" fill={THEME.yellow} stroke={THEME.blue} strokeWidth="2" />
            <circle r="3.5" fill={THEME.blue} />
            
            {/* Label box */}
            <g transform="translate(0, -22)">
              <rect x="-55" y="-12" width="110" height="20" rx="4" fill="#0f172a" stroke={THEME.yellow} strokeWidth="1" opacity="0.9" />
              <text textAnchor="middle" y="2" fill={THEME.yellow} fontSize="9" fontWeight="extrabold" fontFamily="monospace">
                {destination.code}: {destination.city.toUpperCase()}
              </text>
            </g>
          </g>

          {/* Dynamic Cargo Tracker Plane Icon along the path */}
          <g 
            transform={`translate(${currentPosition.x}, ${currentPosition.y}) rotate(${currentPosition.angle})`}
            className="transition-transform duration-700 ease-out"
          >
            {/* Glowing Tracker Halo */}
            <circle r="22" fill={isPaused ? "#ef4444" : THEME.yellow} opacity="0.2" className="animate-pulse" />
            <circle r="11" fill={isPaused ? "#7f1d1d" : THEME.blue} stroke={isPaused ? "#f87171" : THEME.yellow} strokeWidth="1.5" />
            
            {/* Plane icon SVG */}
            <path
              d="M14 11.5l-4-3V4.5C10 3.67 9.33 3 8.5 3S7 3.67 7 4.5v4l-4 3v1.5l4-1.25V14l-1.5 1.25V17l3-1 3 1v-1.75L10 14v-2.25l4 1.25v-1.5z"
              fill={isPaused ? "#f87171" : THEME.yellow}
              transform="scale(1.2) translate(-8.5, -9)"
            />
          </g>
        </svg>

        {/* Floating Telemetry Coordinates Overlay */}
        <div className="absolute bottom-4 left-4 bg-slate-900/85 backdrop-blur-xs border border-slate-800 rounded-lg p-3 font-mono text-[10px] space-y-1 z-10 shadow-lg">
          <div className="flex items-center space-x-2 text-slate-400">
            <Navigation className="h-3.5 w-3.5 text-brand-yellow shrink-0" />
            <span className="font-bold text-brand-yellow uppercase tracking-wider">CARGO POSITION RADAR</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 text-slate-300">
            <div>LAT: <span className="text-white font-bold">{currentCoords.lat}</span></div>
            <div>LNG: <span className="text-white font-bold">{currentCoords.lng}</span></div>
            <div>COMPASS: <span className="text-white font-bold">{Math.round(currentPosition.angle + 180)}°</span></div>
            <div>GRID: <span className="text-blue-400 font-bold">X{Math.round(currentPosition.x)} : Y{Math.round(currentPosition.y)}</span></div>
          </div>
        </div>

        {/* Map Legend Overlay */}
        <div className="absolute bottom-4 right-4 bg-slate-900/85 backdrop-blur-xs border border-slate-800 rounded-lg p-3 font-mono text-[9px] space-y-1.5 z-10 shadow-lg">
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="h-1.5 w-3 bg-brand-yellow inline-block rounded-xs" />
            <span>Active Flight Arc</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="h-1.5 w-3 bg-brand-blue/50 inline-block rounded-xs" />
            <span>Staged Flight Range</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-blue-500 inline-block border border-blue-200" />
            <span>Lagos Dispatch Hub</span>
          </div>
          <div className="flex items-center space-x-1.5 text-slate-300">
            <span className="h-2 w-2 rounded-full bg-yellow-400 inline-block border border-blue-900" />
            <span>Destination City Airport</span>
          </div>
        </div>
      </div>

      {/* Flight Route Progress Stats Footer Panel */}
      <div className="bg-slate-900/90 border-t border-slate-800 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono backdrop-blur-md">
        <div className="flex items-start space-x-3.5 pr-4">
          <div className="p-1.5 bg-blue-500/10 rounded border border-blue-500/20 text-blue-400 shrink-0">
            <MapPin className="h-4 w-4" />
          </div>
          <div>
            <span className="text-slate-500 text-[8px] block uppercase">Lagos Origin Hub</span>
            <span className="text-white font-bold text-xs">{origin.airport}</span>
            <span className="text-slate-400 text-[10px] block mt-0.5 font-mono">{origin.lat} • {origin.lng}</span>
          </div>
        </div>

        <div className="flex items-start space-x-3.5 border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0 md:pl-4">
          <div className="p-1.5 bg-yellow-500/10 rounded border border-yellow-500/20 text-brand-yellow shrink-0">
            <Plane className="h-4 w-4" />
          </div>
          <div>
            <span className="text-slate-500 text-[8px] block uppercase">Final Delivery Terminal</span>
            <span className="text-brand-yellow font-black text-xs">{destination.city} ({destination.code})</span>
            <span className="text-slate-300 text-[10px] block font-semibold">{destination.airport}</span>
            <span className="text-slate-400 text-[10px] block mt-0.5 font-mono">{destination.lat} • {destination.lng}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
