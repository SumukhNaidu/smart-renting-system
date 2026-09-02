import React from 'react';
import { Bell } from 'lucide-react';

interface HeaderProps {
  unreadAlertCount: number;
  onOpenNotifications: () => void;
  wsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ unreadAlertCount, onOpenNotifications, wsConnected }) => {
  return (
    <header className="bg-white border-b border-gray-200 text-gray-900 shadow-sm sticky top-0 z-40">
      {/* Top Caterpillar Yellow Accent Ribbon */}
      <div className="bg-[#FFCD00] h-1.5 w-full" />

      <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Caterpillar Corporate Branding */}
        <div className="flex items-center gap-4">
          <div className="bg-black text-[#FFCD00] font-black px-3.5 py-1.5 rounded text-xl tracking-tighter uppercase shadow flex items-center gap-1.5 border border-black">
            <span className="text-[#FFCD00]">CATERPILLAR</span>
          </div>
          <div className="h-8 w-px bg-gray-300 hidden sm:block" />
          <div>
            <h1 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
              SMART RENTAL TRACKING SYSTEM
            </h1>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
              Fleet Telemetry • Usage Logging • AI Anomaly Diagnostics
            </p>
          </div>
        </div>

        {/* Live System Status & Controls */}
        <div className="flex items-center gap-5">
          {/* System Health / Connection Badge */}
          <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-300 text-xs font-semibold text-gray-700">
            <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
            <span>{wsConnected ? (unreadAlertCount > 0 ? 'Dealer alerts active' : 'No dealer alerts') : 'Connecting dealer feed...'}</span>
          </div>

          {/* Notification Bell Icon */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-gray-700 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-[#FFCD00]"
            title="Open Notification Center"
          >
            <Bell className="w-5 h-5 text-gray-800" />
            {unreadAlertCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce border-2 border-white">
                {unreadAlertCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
