import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, PackageCheck, AlertCircle } from 'lucide-react';
import { apiClient } from '../../api/client';
import L from 'leaflet';

// Fix leaflet icon issue in react
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface PharmacyResult {
  pharmacy: {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
  };
  total_stock: number;
  distance_km: number;
}

interface MedicineAvailabilityMapProps {
  medicineId: string;
  medicineName: string;
  onClose: () => void;
}

export const MedicineAvailabilityMap: React.FC<MedicineAvailabilityMapProps> = ({ medicineId, medicineName, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<PharmacyResult[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserLocation([lat, lng]);

        try {
          const res = await apiClient(`/medicines/${medicineId}/nearby?lat=${lat}&lng=${lng}&radius=2.0`);
          setResults(res);
        } catch (_err) {
          setError("Failed to fetch nearby pharmacies.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.warn("Geolocation error:", err);
        // Fallback to center of Bangalore for testing if location fails
        const lat = 12.9716;
        const lng = 77.5946;
        setUserLocation([lat, lng]);
        apiClient(`/medicines/${medicineId}/nearby?lat=${lat}&lng=${lng}&radius=2.0`)
          .then(setResults)
          .catch(() => setError("Failed to fetch nearby pharmacies."))
          .finally(() => setLoading(false));
      }
    );
  }, [medicineId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-neutral-200/50 flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-neutral-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
          <div>
            <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
              <MapPin className="text-blue-600" />
              Find {medicineName}
            </h2>
            <p className="text-sm text-neutral-500 font-medium mt-1">Showing pharmacies within 2 KM radius</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white text-neutral-500 shadow-sm border border-neutral-200 hover:bg-neutral-50 transition-colors">
            ✕
          </button>
        </div>

        <div className="flex-1 bg-neutral-100 relative min-h-[350px]">
          {loading && (
            <div className="absolute inset-0 z-[400] flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
              <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
              <p className="mt-4 font-semibold text-neutral-700 animate-pulse">Locating nearby stock...</p>
            </div>
          )}
          
          {error && (
            <div className="absolute inset-0 z-[400] flex items-center justify-center bg-white">
              <div className="text-center p-6 text-danger">
                <AlertCircle size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold">{error}</p>
              </div>
            </div>
          )}

          {userLocation && (
            <MapContainer center={userLocation} zoom={14} className="w-full h-full z-10" zoomControl={false} style={{ height: '350px' }}>
              <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              />
              {/* User Location */}
              <Circle center={userLocation} radius={2000} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 2 }} />
              <Marker position={userLocation}>
                <Popup>
                  <div className="font-bold text-center">You are here</div>
                </Popup>
              </Marker>

              {/* Pharmacy Results */}
              {results.map((res) => (
                <Marker key={res.pharmacy.id} position={[res.pharmacy.latitude, res.pharmacy.longitude]} icon={greenIcon}>
                  <Popup>
                    <div className="font-bold text-neutral-900">{res.pharmacy.name}</div>
                    <div className="text-green-600 font-semibold text-sm flex items-center gap-1 mt-1">
                      <PackageCheck size={14} /> In Stock ({res.total_stock})
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>

        <div className="p-4 bg-white max-h-[30vh] overflow-y-auto">
          <h3 className="font-bold text-neutral-800 mb-3 px-1">{results.length} Pharmacies Found</h3>
          {results.length === 0 && !loading ? (
            <div className="text-center p-4 text-neutral-500 bg-neutral-50 rounded-xl">
              No pharmacies have stock within 2 KM.
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((res) => (
                <div key={res.pharmacy.id} className="flex items-center justify-between p-3 border border-neutral-100 bg-neutral-50 rounded-xl hover:border-blue-200 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                      <PackageCheck size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-neutral-900">{res.pharmacy.name}</h4>
                      <p className="text-xs font-semibold text-green-600 mt-0.5">{res.total_stock} units available</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-neutral-800 bg-white px-2 py-1 rounded-lg border border-neutral-200 shadow-sm inline-flex items-center gap-1">
                      <Navigation size={12} className="text-blue-500" />
                      {res.distance_km < 1 ? `${(res.distance_km * 1000).toFixed(0)} m` : `${res.distance_km.toFixed(1)} km`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
