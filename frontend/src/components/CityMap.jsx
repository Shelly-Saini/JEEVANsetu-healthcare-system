import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by Vite's asset pipeline
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export default function CityMap({ hospitals }) {
  return (
    <MapContainer
      center={[28.61, 77.23]}
      zoom={11}
      className="h-80 w-full rounded-lg z-0"
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {hospitals.map((h) =>
        h.lat && h.lng ? (
          <Marker key={h.hospitalId} position={[h.lat, h.lng]}>
            <Popup>
              <div className="p-2 rounded text-sm min-w-[160px]">
                <p className="font-bold text-gray-800 mb-1">{h.name}</p>
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
        ) : null
      )}
    </MapContainer>
  );
}
