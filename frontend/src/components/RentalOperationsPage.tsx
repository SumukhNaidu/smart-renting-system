import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Camera, QrCode, Search, ShieldCheck } from 'lucide-react';
import { BrowserQRCodeReader } from '@zxing/browser';
import { api } from '../services/api';
import type { Equipment } from '../types/equipment';

interface RentalOperationsPageProps {
  equipmentList: Equipment[];
  onRefresh: () => Promise<void> | void;
}

const emptyForm = {
  equipment_id: '',
  qr_code: '',
  action: 'checkout' as 'checkout' | 'checkin',
  site_id: '',
  operator_id: '',
  expected_checkin_date: '',
};

export const RentalOperationsPage: React.FC<RentalOperationsPageProps> = ({ equipmentList, onRefresh }) => {
  const [form, setForm] = useState(emptyForm);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerBusy, setScannerBusy] = useState(false);
  const [equipmentQrUrl, setEquipmentQrUrl] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerControlsRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      if (scannerControlsRef.current) {
        scannerControlsRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedEquipment) {
      setEquipmentQrUrl('');
      return;
    }

    const payload = `SMART_RENTAL_EQ:${selectedEquipment.equipment_id}`;
    QRCode.toDataURL(payload)
      .then((url: string) => setEquipmentQrUrl(url))
      .catch(() => setEquipmentQrUrl(''));
  }, [selectedEquipment]);

  useEffect(() => {
    if (!scannerOpen) return;

    const startScanner = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('This browser does not support camera-based QR scanning.');
        setScannerOpen(false);
        return;
      }

      try {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

        const videoElement = videoRef.current;
        if (!videoElement) {
          setErrorMessage('Camera preview is not ready yet. Please try again.');
          setScannerOpen(false);
          return;
        }

        const reader = new BrowserQRCodeReader();
        const devices = await BrowserQRCodeReader.listVideoInputDevices();
        if (!devices.length) {
          throw new Error('No camera was found on this device.');
        }

        const controls = await reader.decodeFromVideoDevice(devices[0].deviceId, videoElement, (result, error) => {
          if (result) {
            const scannedValue = result.getText();
            handleScannedQrValue(scannedValue);
            stopScanner();
          }

          if (error && !(error instanceof Error && error.message.includes('NotFoundException'))) {
            console.warn('QR scan warning:', error);
          }
        });

        scannerControlsRef.current = controls;
        setScannerBusy(false);
      } catch (err: any) {
        console.error('QR scan failed:', err);
        setErrorMessage(err?.message || 'Unable to open the camera to scan the QR code.');
        stopScanner();
      }
    };

    void startScanner();
  }, [scannerOpen]);

  const matches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return equipmentList;
    return equipmentList.filter((item) => {
      return (
        item.equipment_id.toLowerCase().includes(q) ||
        (item.qr_code ?? '').toLowerCase().includes(q) ||
        item.equipment_type.toLowerCase().includes(q) ||
        (item.site_id ?? '').toLowerCase().includes(q) ||
        (item.operator_id ?? '').toLowerCase().includes(q)
      );
    });
  }, [equipmentList, searchQuery]);

  const applyEquipment = (equipment: Equipment) => {
    setSelectedEquipment(equipment);
    setForm((prev) => ({
      ...prev,
      equipment_id: equipment.equipment_id,
      qr_code: equipment.qr_code ?? '',
      site_id: equipment.site_id ?? '',
      operator_id: equipment.operator_id ?? '',
      expected_checkin_date: equipment.expected_checkin_date ? new Date(equipment.expected_checkin_date).toISOString().slice(0, 10) : '',
    }));
  };

  const stopScanner = () => {
    if (scannerControlsRef.current) {
      scannerControlsRef.current.stop();
      scannerControlsRef.current = null;
    }
    setScannerOpen(false);
    setScannerBusy(false);
  };

  const handleScannedQrValue = (scannedValue: string) => {
    const normalized = scannedValue.trim();
    const equipmentPayloadPrefix = 'SMART_RENTAL_EQ:';

    if (normalized.startsWith(equipmentPayloadPrefix)) {
      const equipmentId = normalized.replace(equipmentPayloadPrefix, '').trim();
      const matched = equipmentList.find((item) => item.equipment_id.toUpperCase() === equipmentId.toUpperCase());

      if (matched) {
        applyEquipment(matched);
        setStatusMessage(`Equipment QR matched: ${matched.equipment_id}`);
        setErrorMessage(null);
        return;
      }

      setErrorMessage(`Equipment with ID ${equipmentId} was not found.`);
      setStatusMessage(null);
      return;
    }

    const matchedByQr = equipmentList.find((item) => {
      const qrValue = (item.qr_code ?? '').trim();
      return qrValue.toUpperCase() === normalized.toUpperCase() || item.equipment_id.toUpperCase() === normalized.toUpperCase();
    });

    if (matchedByQr) {
      applyEquipment(matchedByQr);
      setStatusMessage(`Equipment QR matched: ${matchedByQr.equipment_id}`);
      setErrorMessage(null);
      return;
    }

    setForm((prev) => ({ ...prev, qr_code: normalized }));
    setStatusMessage(`QR code captured: ${normalized}`);
    setErrorMessage(null);
  };

  const handleQrScan = () => {
    setErrorMessage(null);
    setStatusMessage(null);
    setScannerBusy(true);
    setScannerOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.equipment_id && !form.qr_code) {
      setErrorMessage('Enter either the equipment ID or QR code before continuing.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      const response = await api.updateEquipmentCheckinCheckout({
        equipment_id: form.equipment_id || undefined,
        qr_code: form.qr_code || undefined,
        site_id: form.site_id || undefined,
        operator_id: form.operator_id || undefined,
        action: form.action,
        expected_checkin_date: form.expected_checkin_date || undefined,
      });

      const refreshed = await api.getEquipmentById(response.equipment_id);
      setSelectedEquipment(refreshed);
      setStatusMessage(
        form.action === 'checkout'
          ? `Equipment ${refreshed.equipment_id} checked out successfully.`
          : `Equipment ${refreshed.equipment_id} checked in successfully.`
      );
      setForm((prev) => ({ ...prev, equipment_id: refreshed.equipment_id, qr_code: refreshed.qr_code ?? '', site_id: refreshed.site_id ?? '', operator_id: refreshed.operator_id ?? '' }));
      await onRefresh();
    } catch (err: any) {
      console.error('Rental update failed:', err);
      const message = err?.response?.data?.detail || 'Check-in / check-out failed. Please verify the equipment ID or QR code.';
      setErrorMessage(message);
      setStatusMessage(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#FFCD00] border border-black shadow-sm">
              <ArrowRightLeft className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900">Rental Check-In / Check-Out</h2>
              <p className="text-sm text-gray-600">Use equipment ID or QR code to process rental lifecycle events.</p>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-black text-gray-700">Equipment ID</label>
                <input
                  value={form.equipment_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, equipment_id: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-black focus:outline-none"
                  placeholder="EQX1001"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-black text-gray-700">QR Code</label>
                <div className="relative">
                  <QrCode className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                  <input
                    value={form.qr_code}
                    onChange={(e) => setForm((prev) => ({ ...prev, qr_code: e.target.value }))}
                    className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-10 py-2.5 text-sm font-medium text-gray-900 focus:border-black focus:outline-none"
                    placeholder="CAT-EQX1001"
                  />
                  <button
                    type="button"
                    onClick={handleQrScan}
                    className="absolute right-2 top-1.5 flex items-center justify-center rounded-lg border border-gray-300 bg-white p-1.5 text-gray-700 hover:border-black hover:bg-gray-50"
                    title="Scan QR code"
                    disabled={scannerBusy}
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>
                {scannerOpen && (
                  <div className="mt-2 rounded-xl border border-gray-300 bg-black p-2">
                    <video ref={videoRef} className="w-full rounded-lg bg-black" muted playsInline autoPlay />
                    <div className="mt-2 flex items-center justify-between text-[11px] text-gray-200">
                      <span>Scanning for QR...</span>
                      <button type="button" onClick={stopScanner} className="rounded-md border border-white/20 px-2 py-1 text-white hover:bg-white/10">
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-black text-gray-700">Action</label>
                <select
                  value={form.action}
                  onChange={(e) => setForm((prev) => ({ ...prev, action: e.target.value as 'checkout' | 'checkin' }))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-black focus:outline-none"
                >
                  <option value="checkout">Checkout</option>
                  <option value="checkin">Check In</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-black text-gray-700">Expected Return Date</label>
                <input
                  type="date"
                  value={form.expected_checkin_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, expected_checkin_date: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-black text-gray-700">Site ID</label>
                <input
                  value={form.site_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, site_id: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-black focus:outline-none"
                  placeholder="S003"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wide font-black text-gray-700">Operator ID</label>
                <input
                  value={form.operator_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, operator_id: e.target.value }))}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-900 focus:border-black focus:outline-none"
                  placeholder="OP101"
                />
              </div>
            </div>

            {(errorMessage || statusMessage) && (
              <div className={`rounded-xl border px-3 py-2 text-sm font-medium ${errorMessage ? 'border-red-300 bg-red-50 text-red-800' : 'border-emerald-300 bg-emerald-50 text-emerald-800'}`}>
                {errorMessage ?? statusMessage}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm);
                  setSelectedEquipment(null);
                  setErrorMessage(null);
                  setStatusMessage(null);
                }}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-800"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-[#FFCD00] border border-black px-5 py-2.5 text-sm font-black text-black shadow-sm disabled:opacity-60"
              >
                {submitting ? 'Processing...' : form.action === 'checkout' ? 'Confirm Checkout' : 'Confirm Check In'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wide font-black text-gray-700">Find equipment</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-3 py-2.5 text-sm font-medium text-gray-900 focus:border-black focus:outline-none"
                  placeholder="Search by ID, QR, site, operator"
                />
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1.2fr_0.8fr_1fr] bg-gray-100 text-[10px] font-black uppercase tracking-wide text-gray-700">
                <div className="px-3 py-2.5">Equipment</div>
                <div className="px-3 py-2.5">Status</div>
                <div className="px-3 py-2.5">Site</div>
              </div>

              <div className="max-h-[360px] overflow-auto divide-y divide-gray-200">
                {matches.length === 0 ? (
                  <div className="px-3 py-8 text-sm text-gray-500 text-center">No equipment found.</div>
                ) : (
                  matches.map((item) => (
                    <button
                      key={item.equipment_id}
                      type="button"
                      onClick={() => applyEquipment(item)}
                      className={`w-full text-left grid grid-cols-[1.2fr_0.8fr_1fr] transition-colors ${selectedEquipment?.equipment_id === item.equipment_id ? 'bg-[#FFCD00]/10' : 'bg-white hover:bg-gray-50'}`}
                    >
                      <div className="px-3 py-3">
                        <div className="font-black text-gray-900">{item.equipment_id}</div>
                        <div className="text-[11px] text-gray-500 font-medium">{item.equipment_type}</div>
                      </div>
                      <div className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black border ${
                          item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' :
                          item.status === 'OVERDUE' ? 'bg-red-100 text-red-800 border-red-300' :
                          item.status === 'UNASSIGNED' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                          'bg-gray-100 text-gray-800 border-gray-300'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      <div className="px-3 py-3 text-sm text-gray-700 font-medium">{item.site_id ?? 'Unassigned'}</div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedEquipment && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-700 text-xs font-black uppercase tracking-wide">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" /> Current Status
            </div>
            <div className="mt-3 text-2xl font-black text-gray-900">{selectedEquipment.status}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-700 text-xs font-black uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4 text-blue-700" /> Site / Operator
            </div>
            <div className="mt-3 text-sm font-bold text-gray-800">{selectedEquipment.site_id ?? 'Unassigned'} / {selectedEquipment.operator_id ?? 'Unassigned'}</div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 text-gray-700 text-xs font-black uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 text-amber-700" /> Utilization
            </div>
            <div className="mt-3 text-2xl font-black text-gray-900">{selectedEquipment.utilization_percentage}%</div>
          </div>
        </div>
      )}

      {selectedEquipment && equipmentQrUrl && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-wide font-black text-gray-700">Equipment QR</p>
              <h3 className="text-xl font-black text-gray-900">{selectedEquipment.equipment_id}</h3>
            </div>
            <div className="rounded-full border border-gray-300 bg-gray-100 p-2">
              <QrCode className="w-5 h-5 text-gray-700" />
            </div>
          </div>

          <div className="flex justify-center rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <img src={equipmentQrUrl} alt={`${selectedEquipment.equipment_id} QR code`} className="w-52 h-52 rounded-xl border border-gray-200 bg-white" />
          </div>
        </div>
      )}
    </div>
  );
};
