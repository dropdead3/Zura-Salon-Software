import { useState } from 'react';
import type { BookingSurfaceTheme } from '@/hooks/useBookingSurfaceConfig';

export interface BookingClientInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

interface BookingClientFormProps {
  theme: BookingSurfaceTheme;
  onSubmit: (info: BookingClientInfo) => void;
}

export function BookingClientForm({ theme, onSubmit }: BookingClientFormProps) {
  const [form, setForm] = useState<BookingClientInfo>({
    firstName: '', lastName: '', email: '', phone: '', notes: '',
  });

  const inputStyle: React.CSSProperties = {
    backgroundColor: theme.backgroundColor,
    color: theme.textColor,
    borderColor: theme.borderColor,
    borderRadius: 'var(--bk-btn-radius, 8px)',
    outlineColor: theme.primaryColor,
  };

  const isValid = form.firstName.trim() && form.email.trim();

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1.5" style={{ color: theme.mutedTextColor }}>First Name *</label>
          <input
            type="text"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            className="w-full px-3 py-3 text-sm border outline-none focus:ring-2 transition-shadow"
            style={{ ...inputStyle, '--tw-ring-color': theme.primaryColor } as React.CSSProperties}
            placeholder="Jane"
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5" style={{ color: theme.mutedTextColor }}>Last Name</label>
          <input
            type="text"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            className="w-full px-3 py-3 text-sm border outline-none focus:ring-2 transition-shadow"
            style={inputStyle}
            placeholder="Doe"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1.5" style={{ color: theme.mutedTextColor }}>Email *</label>
        <input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-3 text-sm border outline-none focus:ring-2 transition-shadow"
          style={inputStyle}
          placeholder="jane@example.com"
        />
      </div>

      <div>
        <label className="block text-sm mb-1.5" style={{ color: theme.mutedTextColor }}>Phone</label>
        <input
          type="tel"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="w-full px-3 py-3 text-sm border outline-none focus:ring-2 transition-shadow"
          style={inputStyle}
          placeholder="(555) 123-4567"
        />
      </div>

      <div>
        <label className="block text-sm mb-1.5" style={{ color: theme.mutedTextColor }}>Notes (optional)</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={3}
          className="w-full px-3 py-3 text-sm border outline-none focus:ring-2 transition-shadow resize-none"
          style={inputStyle}
          placeholder="Any special requests or notes for your stylist..."
        />
      </div>

      {/* Sticky on mobile */}
      <div className="sm:relative fixed bottom-0 left-0 right-0 sm:p-0 p-4 bg-gradient-to-t from-white via-white sm:bg-none z-10">
        <button
          onClick={() => isValid && onSubmit(form)}
          disabled={!isValid}
          className="w-full py-3.5 text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 active:scale-[0.98]"
          style={{
            backgroundColor: theme.primaryColor,
            borderRadius: 'var(--bk-btn-radius, 8px)',
          }}
        >
          Continue to Review
        </button>
      </div>
    </div>
  );
}
