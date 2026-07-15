import React from "react";
import { Check, Clock, AlertTriangle, Play, HelpCircle } from "lucide-react";
import { MILESTONES, MilestoneHistoryEntry } from "../../shared/types.ts";
import { formatTimestamp } from "../../shared/utils.ts";

interface TimelineProps {
  currentMilestoneIndex: number;
  milestoneHistory: MilestoneHistoryEntry[];
  isPaused?: boolean;
}

export default function Timeline({ currentMilestoneIndex, milestoneHistory, isPaused = false }: TimelineProps) {

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-[#032B73]">Shipment Timeline</h3>
          <p className="text-xs text-gray-500">
            {isPaused ? "Tracking paused by administration" : "Real-time updates directly from flight hubs"}
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full border border-blue-100">
          <Clock className="h-3.5 w-3.5" />
          <span>{milestoneHistory.length} of {MILESTONES.length} Milestones Completed</span>
        </div>
      </div>

      <div className="relative pl-6 sm:pl-8">
        {/* Continuous timeline connector line */}
        <div className="absolute left-[15px] sm:left-[19px] top-4 bottom-4 w-[3px] bg-gray-100 rounded-full" />
        
        {/* Colored active path connector line */}
        <div 
          className="absolute left-[15px] sm:left-[19px] top-4 w-[3px] bg-blue-600 rounded-full transition-all duration-700"
          style={{
            height: `calc(${(currentMilestoneIndex / (MILESTONES.length - 1)) * 100}% - 4px)`
          }}
        />

        {/* Milestone Steps */}
        <div className="space-y-6">
          {MILESTONES.map((milestone, idx) => {
            const isCompleted = idx <= currentMilestoneIndex;
            const isActive = idx === currentMilestoneIndex;
            const isPending = idx > currentMilestoneIndex;
            
            // Look up if we have a custom history log for this milestone
            const historyEntry = milestoneHistory.find(h => h.milestoneIndex === idx);
            const timeInfo = historyEntry ? formatTimestamp(historyEntry.timestamp) : null;
            const description = historyEntry?.description || milestone.description;

            return (
              <div 
                key={idx} 
                className={`relative flex flex-col sm:flex-row sm:items-start transition-all duration-300 ${
                  isActive ? "bg-blue-50/50 p-4 rounded-xl border border-blue-200/50 -mx-4 shadow-sm" : ""
                } ${isPending ? "opacity-60" : ""}`}
              >
                {/* Node Dot Icon */}
                <div className="absolute -left-[28px] sm:-left-[32px] mt-1 z-10 flex items-center justify-center">
                  {isPaused && isActive ? (
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-red-100 text-red-600 border-2 border-red-500 flex items-center justify-center shadow-md animate-pulse">
                      <AlertTriangle className="h-4.5 w-4.5" />
                    </div>
                  ) : isActive ? (
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-blue-600 text-white border-4 border-blue-100 flex items-center justify-center shadow-md ring-4 ring-blue-500/20 animate-pulse">
                      <div className="h-2.5 w-2.5 rounded-full bg-white" />
                    </div>
                  ) : isCompleted ? (
                    <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-100 text-blue-700 border-2 border-blue-600 flex items-center justify-center shadow-sm">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-white text-gray-300 border-2 border-gray-200 flex items-center justify-center">
                      <span className="text-[10px] font-mono font-bold">{idx + 1}</span>
                    </div>
                  )}
                </div>

                {/* Milestone Details */}
                <div className="flex-grow sm:pr-8">
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between">
                    <h4 className={`text-sm sm:text-base font-bold ${
                      isActive 
                        ? "text-blue-900" 
                        : isCompleted 
                          ? "text-gray-800" 
                          : "text-gray-400"
                    }`}>
                      {milestone.name}
                      {isActive && !isPaused && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase tracking-wider animate-pulse">
                          Active Stage
                        </span>
                      )}
                      {isActive && isPaused && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 uppercase tracking-wider animate-pulse">
                          On Hold
                        </span>
                      )}
                    </h4>
                  </div>
                  
                  <p className={`text-xs mt-1 leading-relaxed ${
                    isActive ? "text-gray-700" : isCompleted ? "text-gray-600" : "text-gray-400"
                  }`}>
                    {description}
                  </p>
                </div>

                {/* Timeline dates aligned right */}
                <div className="mt-2 sm:mt-0 sm:text-right min-w-[120px] shrink-0 flex sm:flex-col items-center sm:items-end space-x-2 sm:space-x-0 font-mono text-xs">
                  {timeInfo ? (
                    <>
                      <span className="text-gray-900 font-bold">{timeInfo.dateStr}</span>
                      <span className="text-gray-500 sm:mt-0.5">{timeInfo.timeStr}</span>
                    </>
                  ) : (
                    <span className="text-gray-300 italic">Pending Stage</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
