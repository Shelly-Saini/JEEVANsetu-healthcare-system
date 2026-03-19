import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ─── City centre coordinates + zoom levels ────────────────────────────────────
const CITY_CENTERS = {
  Delhi:     { center: [28.6139, 77.2090], zoom: 11 },
  Mumbai:    { center: [19.0760, 72.8777], zoom: 12 },
  Bangalore: { center: [12.9716, 77.5946], zoom: 12 },
};
const DEFAULT_CENTER = { center: [20.5937, 78.9629], zoom: 5 }; // India fallback

// ─── Resolve coordinates: use hospital lat/lng, else fall back to city centre ─
const resolveCoords = (hospital) => {
  if (hospital.lat && hospital.lng) return [hospital.lat, hospital.lng];
  const cityDef = CITY_CENTERS[hospital.city];
  return cityDef ? cityDef.center : DEFAULT_CENTER.center;
};

// ─── Colored div-icon based on stress level ───────────────────────────────────
const LEVEL_COLORS = { High: '#ef4444', Medium: '#eab308', Low: '#22c55e' };

const makeIcon = (level) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;
      background:${LEVEL_COLORS[level] ?? '#6366f1'};
      border:2px solid #fff;
      border-radius:50%;
      box-shadow:0 1px 4px rgba(0,0,0,.4);
    "></div>`,
    iconSize:   [14, 14],
    iconAnchor: [7, 7],
  });

export default function CityMap({ hospitals, city }) {
  const { center, zoom } = CITY_CENTERS[city] ?? DEFAULT_CENTER;

  return (
    <MapContainer
      key={city}                  /* remount when city changes so center resets */
      center={center}
      zoom={zoom}
      className="h-80 w-full rounded-lg z-0"
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {hospitals.map((h) => (
        <Marker key={h.hospitalId} position={resolveCoords(h)} icon={makeIcon(h.level)}>
          <Popup>
            <div className="p-2 rounded text-sm min-w-[160px]">
              <p className="font-bold text-gray-800 mb-0.5">{h.name}</p>
              <p className="text-xs text-gray-400 mb-2">{h.city}</p>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500">Stress Score</span>
                <span className="font-bold text-gray-800">{h.stressScore}/100</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500">Level</span>
                <span className={`font-semibold ${
                  h.level === 'High' ? 'text-red-600' : h.level === 'Medium' ? 'text-yellow-600' : 'text-green-600'
                }`}>{h.level}</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-500">Available Beds</span>
                <span className="font-semibold text-gray-700">{h.stats?.availableBeds ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Active OPD</span>
                <span className="font-semibold text-gray-700">{h.stats?.activeOpdPatients ?? '—'}</span>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
