import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { Equipment, EquipmentStatus } from '../types/equipment';
import { MapPin, Gauge, Fuel } from 'lucide-react';

interface EquipmentMapProps {
  equipmentList: Equipment[];
  onSelectEquipment: (equipment: Equipment) => void;
}

// Custom Leaflet SVG Marker Generator
const createCustomMarkerIcon = (status: EquipmentStatus) => {
  let color = '#2563EB'; // AVAILABLE - Blue
  if (status === 'ACTIVE') color = '#059669'; // Emerald
  else if (status === 'IDLE') color = '#D97706'; // Amber
  else if (status === 'OVERDUE') color = '#DC2626'; // Red
  else if (status === 'UNASSIGNED') color = '#7C3AED'; // Purple
  else if (status === 'ANOMALY') color = '#EA580C'; // Orange

  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="32" height="42">
      <path d="M16 0 C7.16 0 0 7.16 0 16 C0 28 16 42 16 42 C16 42 32 28 32 16 C32 7.16 24.84 0 16 0 Z" fill="${color}" stroke="#000000" stroke-width="2"/>
      <circle cx="16" cy="15" r="7" fill="#000000"/>
      <circle cx="16" cy="15" r="4" fill="${color}"/>
    </svg>
  `;

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: svgString,
    iconSize: [32, 42],
    iconAnchor: [16, 42],
    popupAnchor: [0, -38]
  });
};

export const EquipmentMap: React.FC<EquipmentMapProps> = ({ equipmentList, onSelectEquipment }) => {
  const defaultCenter: [number, number] = [38.5, -95.0];
  const zoomLevel = 4;

  const validEquipment = equipmentList.filter(e => e.latitude !== null && e.longitude !== null);

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-3 flex flex-col h-[420px] relative">
      <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-black" />
          <h2 className="text-sm font-black text-gray-900 uppercase tracking-wide">
            GEOSPATIAL FLEET MAP
          </h2>
        </div>
        <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2.5 py-1 rounded border border-gray-300">
          {validEquipment.length} Active Pins
        </span>
      </div>

      <div className="flex-1 rounded-lg overflow-hidden border border-gray-200 relative z-0">
        <MapContainer center={defaultCenter} zoom={zoomLevel} scrollWheelZoom={true} className="w-full h-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {validEquipment.map(item => (
            <Marker
              key={item.equipment_id}
              position={[item.latitude!, item.longitude!]}
              icon={createCustomMarkerIcon(item.status)}
            >
              <Popup>
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-1 mb-2">
                    <span className="font-mono font-black bg-[#FFCD00] text-black px-1.5 py-0.5 rounded text-sm">{item.equipment_id}</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-gray-100 text-gray-900 border border-gray-300">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs space-y-1 text-gray-800">
                    <p><strong className="text-gray-600">Type:</strong> {item.equipment_type}</p>
                    <p><strong className="text-gray-600">Site ID:</strong> {item.site_id || 'NULL'}</p>
                    <p><strong className="text-gray-600">Operator:</strong> {item.operator_id || 'NULL'}</p>
                    <div className="flex items-center justify-between pt-1 border-t border-gray-200 mt-2">
                      <span className="flex items-center gap-1 font-bold text-emerald-700">
                        <Gauge className="w-3.5 h-3.5" /> {item.utilization_percentage}%
                      </span>
                      <span className="flex items-center gap-1 text-amber-700 font-bold">
                        <Fuel className="w-3.5 h-3.5" /> {item.fuel_level}%
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onSelectEquipment(item)}
                    className="mt-3 w-full py-1.5 bg-[#FFCD00] text-black font-extrabold rounded text-xs hover:bg-[#E6B800] transition-colors border border-black"
                  >
                    View Asset Analytics
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};
