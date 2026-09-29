import React, { useEffect, useState } from 'react';
import { Customer, Business } from '../types';
import { X, Printer, Download, QrCode } from 'lucide-react';
import QRCode from 'qrcode';

interface QrCardModalProps {
  customer: Customer;
  business: Business | null;
  isOpen: boolean;
  onClose: () => void;
}

export const QrCardModal: React.FC<QrCardModalProps> = ({
  customer,
  business,
  isOpen,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const portalToken =
    customer.customerPortalToken ||
    customer.customer_portal_token ||
    customer.qr_token ||
    customer.assigned_qr ||
    customer.assignedQr ||
    customer.id;

  const qrTargetValue = `${window.location.origin}/customer/portal/${portalToken}`;

  useEffect(() => {
    if (!isOpen || !portalToken) return;

    // Generate high-resolution QR code encoding Customer Portal URL
    QRCode.toDataURL(
      qrTargetValue,
      {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      },
      (err, url) => {
        if (!err && url) {
          setQrDataUrl(url);
        }
      }
    );
  }, [isOpen, qrTargetValue, portalToken]);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QR_${customer.name.replace(/\s+/g, '_')}.png`;
    a.click();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Modal Toolbar (hidden in print) */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-brand-600" />
            <h3 className="font-bold text-slate-800 text-sm">Customer QR Door Card</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Card */}
        <div id="printable-qr-card" className="p-6 text-center space-y-4">
          {/* Card Border frame */}
          <div className="border-4 border-brand-500 rounded-3xl p-6 bg-gradient-to-b from-brand-50/50 to-white shadow-inner">
            {/* Header / Business Name */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-extrabold tracking-widest text-brand-600 bg-brand-100/80 px-2.5 py-0.5 rounded-full">
                Home Milk Delivery
              </span>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">
                {business?.name || 'Milk & More Dairy'}
              </h2>
              {business?.phone && (
                <p className="text-xs text-slate-500 font-medium">Helpline: {business.phone}</p>
              )}
            </div>

            {/* QR Code Container */}
            <div className="my-5 flex justify-center">
              <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-200">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR Code for ${customer.name}`}
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-lg" />
                )}
              </div>
            </div>

            {/* Customer Details */}
            <div className="pt-2 border-t border-slate-200/80">
              <h3 className="text-lg font-bold text-slate-900">{customer.name}</h3>
              <p className="text-xs font-semibold text-slate-600">{customer.mobile}</p>
              {customer.address && (
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto leading-tight">
                  {customer.address}
                </p>
              )}
            </div>

            {/* Instruction Footer */}
            <div className="mt-4 pt-3 border-t border-dashed border-slate-300">
              <p className="text-[11px] font-extrabold uppercase tracking-wider text-brand-700">
                Scan for Delivery
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Place this card outside your door or in your milk box.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons (hidden in print) */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 print:hidden">
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl transition-colors shadow-xs"
          >
            <Download className="w-4 h-4" />
            Download QR
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-xl transition-colors shadow-md shadow-brand-500/25"
          >
            <Printer className="w-4 h-4" />
            Print Card
          </button>
        </div>
      </div>
    </div>
  );
};
