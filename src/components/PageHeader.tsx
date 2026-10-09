'use client';
import { useState } from 'react';
import { Bell } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <div className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      <div className="header-actions">
        {actions}
        <button
          className="notif-btn"
          onClick={() => setNotifOpen(!notifOpen)}
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="notif-dot" />
        </button>
      </div>
    </div>
  );
}
