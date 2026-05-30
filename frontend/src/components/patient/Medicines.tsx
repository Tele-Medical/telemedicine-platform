import React, { useState, useEffect } from 'react';
import { Pill, Search, MapPin, AlertTriangle, X, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { pharmacyService, authService } from '../../api/services';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Medicine {
  id: string;
  medicine_id: string; // Formulary ID
  name: string;
  dosage: string;
  purpose: string;
  schedule: string;
  timing: string;
  stockLeft: number;
}

interface PharmacyResult {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  quantity: number;
  distance: number;
}

const Medicines: React.FC = () => {
  const { t } = useTranslation();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState<Record<string, boolean>>({});
  
  // Map Modal State
  const [showMap, setShowMap] = useState(false);
  const [mapResults, setMapResults] = useState<PharmacyResult[]>([]);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      try {
        let patientId = localStorage.getItem('active_patient_id');
        if (!patientId || patientId === 'undefined' || patientId === 'null') {
          const userData = await authService.getMe();
          patientId = userData?.patient_id || null;
        }
        const prescriptions = await pharmacyService.getPrescriptions(patientId || undefined);
        
        const fetchedMedicines: Medicine[] = [];
        prescriptions.forEach((rx: any) => {
          if (rx.status !== 'cancelled' && rx.items) {
            rx.items.forEach((item: any) => {
              fetchedMedicines.push({
                id: item.id,
                medicine_id: item.medicine_id,
                name: item.medicine_name || 'Unknown Medicine',
                dosage: item.dosage,
                purpose: rx.notes || t('pharmacy.prescribed_treatment', 'Prescribed Treatment'),
                schedule: 'As directed',
                timing: "Follow doctor's instructions",
                stockLeft: item.duration_days || item.quantity_prescribed || 0
              });
            });
          }
        });
        setMedicines(fetchedMedicines);
      } catch (error) {
        console.error('Failed to fetch prescriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, [t]);

  const handleCheckAvailability = async (med: Medicine) => {
    const identifier = med.medicine_id || med.name;
    if (!identifier) {
      alert("Missing medicine identifier. Cannot check local stock.");
      return;
    }
    setCheckingStatus(prev => ({ ...prev, [med.id]: true }));

    try {
      // 1. Get user location
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setUserLocation({ lat, lng });

      // 2. Query backend for nearby stock
      const results: PharmacyResult[] = await pharmacyService.checkAvailability(identifier, lat, lng, 5.0);

      const requiredQty = med.stockLeft > 0 ? med.stockLeft : 15; // Refill exactly what was originally prescribed
      const totalStock = results.reduce((sum, r) => sum + r.quantity, 0);

      // 3. Evaluate results
      if (results.length > 0 && totalStock >= requiredQty) {
        // Available! Show Map.
        setMapResults(results);
        setShowMap(true);
      } else {
        // Not available! Trigger Demand Signal!
        let patientId = localStorage.getItem('active_patient_id');
        if (!patientId || patientId === 'undefined' || patientId === 'null') {
          const userData = await authService.getMe();
          patientId = userData?.patient_id || null;
        }
        
        await pharmacyService.createPrescription({
          patient_id: patientId,
          notes: `Demand Signal: ${med.purpose}`,
          latitude: lat,
          longitude: lng,
          items: [
            {
              medicine_id: med.medicine_id,
              medicine_name: med.name,
              dosage: med.dosage,
              duration_days: requiredQty,
              quantity_prescribed: requiredQty
            }
          ]
        });
        
        alert(`Currently Out of Stock locally. We have automatically notified local pharmacists to restock ${med.name}. Please check back tomorrow.`);
      }
    } catch (_err) {
      alert("Location permission denied or error checking availability.");
    } finally {
      setCheckingStatus(prev => ({ ...prev, [med.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in pb-12 flex justify-center items-center h-48">
        <Search className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-12">
      <header className="mb-6 mt-2">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">My Medications</h1>
        <p className="text-neutral-500 text-sm mt-1">Check local availability instantly.</p>
      </header>

      {medicines.length > 0 ? (
        <div className="space-y-4">
          <div className="grid gap-4">
            {medicines.map((med) => (
              <div 
                key={med.id} 
                className="bg-white rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] border border-neutral-200/60 flex flex-col gap-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Pill size={20} className="stroke-[2.25]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-neutral-900">{med.name}</h3>
                      <p className="text-xs text-neutral-500 font-semibold mt-0.5">
                        For {med.purpose} • {med.dosage}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase ${
                      med.stockLeft <= 5 
                        ? 'bg-red-50 text-red-600 border border-red-200 animate-pulse' 
                        : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                    }`}>
                      {med.stockLeft} days left
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-neutral-100 mt-2">
                  <span className="text-[11px] text-neutral-500 font-semibold flex items-center gap-1">
                    {med.stockLeft <= 5 && (
                      <>
                        <AlertTriangle size={12} className="text-red-500" />
                        <span className="text-red-500">Running Low</span>
                      </>
                    )}
                  </span>
                  
                  <button
                    onClick={() => handleCheckAvailability(med)}
                    disabled={checkingStatus[med.id]}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm ${
                      checkingStatus[med.id]
                        ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border border-neutral-200'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    {checkingStatus[med.id] ? (
                      <Search size={14} className="animate-spin" />
                    ) : (
                      <MapPin size={14} />
                    )}
                    {checkingStatus[med.id] ? 'Locating...' : 'Check Local Availability'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-8 border border-neutral-100 shadow-sm text-center">
          <div className="w-16 h-16 bg-neutral-50 text-neutral-300 rounded-full flex items-center justify-center mx-auto mb-4">
            <Pill size={32} />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 mb-2">No Active Prescriptions</h3>
          <p className="text-neutral-500 text-sm max-w-sm mx-auto">
            You do not have any active medications at this time.
          </p>
        </div>
      )}

      {/* Map Modal */}
      {showMap && userLocation && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col h-[80vh]">
            <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-indigo-50">
              <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                <MapPin size={18} className="text-indigo-600" />
                Available Nearby
              </h3>
              <button onClick={() => setShowMap(false)} className="p-1.5 hover:bg-indigo-100 rounded-full text-indigo-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 relative bg-neutral-100">
              <MapContainer 
                center={[userLocation.lat, userLocation.lng]} 
                zoom={14} 
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                
                {/* User Location */}
                <CircleMarker 
                  center={[userLocation.lat, userLocation.lng]} 
                  radius={8}
                  pathOptions={{ color: 'white', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}
                >
                  <Popup><strong>You are here</strong></Popup>
                </CircleMarker>

                {/* Pharmacy Locations */}
                {mapResults.map(p => (
                  <Marker key={p.id} position={[p.latitude, p.longitude]}>
                    <Popup>
                      <div className="text-center font-sans">
                        <strong className="block mb-1 text-sm text-neutral-900">{p.name}</strong>
                        <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          {p.quantity} In Stock
                        </span>
                        <div className="mt-2 text-xs text-neutral-500">{p.distance.toFixed(1)} km away</div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

            <div className="bg-white p-4 overflow-y-auto max-h-[30vh]">
              <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Pharmacies in Stock</h4>
              <ul className="space-y-3">
                {mapResults.map(p => (
                  <li key={p.id} className="flex justify-between items-center p-3 rounded-xl border border-neutral-100 bg-neutral-50">
                    <div>
                      <strong className="text-sm text-neutral-900 block">{p.name}</strong>
                      <span className="text-xs text-neutral-500">{p.distance.toFixed(1)} km away</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-md block mb-1">
                        {p.quantity} Units
                      </span>
                      <button className="text-indigo-600 text-[10px] font-bold flex items-center gap-1 hover:text-indigo-800">
                        <Navigation size={10} /> Get Directions
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medicines;
