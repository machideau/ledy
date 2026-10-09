'use client';
import { useEffect, useState } from 'react';

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function compute(expiresAt: string): TimeLeft {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };

  const totalSeconds = Math.floor(diff / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, expired: false };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

interface CountdownProps {
  expiresAt: string;  // ISO string
  color?: string;     // accent color
}

export default function Countdown({ expiresAt, color = 'var(--green-600)' }: CountdownProps) {
  const [time, setTime] = useState<TimeLeft>(() => compute(expiresAt));

  useEffect(() => {
    const id = setInterval(() => setTime(compute(expiresAt)), 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  if (time.expired) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--green-600)' }}>
        <span>✓ Échéance atteinte</span>
      </div>
    );
  }

  const units = [
    { label: 'J',  value: time.days    },
    { label: 'H',  value: time.hours   },
    { label: 'Min',value: time.minutes },
    { label: 'Sec',value: time.seconds },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      {units.map(({ label, value }, i) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <div style={{
            background: `${color}14`,
            border: `1px solid ${color}30`,
            borderRadius: '6px',
            padding: '3px 7px',
            minWidth: '34px',
            textAlign: 'center',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}>
              {label === 'J' ? pad(value) : pad(value)}
            </span>
            <div style={{ fontSize: '9px', fontWeight: 600, color: `${color}90`, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '1px' }}>
              {label}
            </div>
          </div>
          {i < units.length - 1 && (
            <span style={{ fontSize: '13px', fontWeight: 800, color: `${color}60`, marginBottom: '8px' }}>:</span>
          )}
        </div>
      ))}
    </div>
  );
}
