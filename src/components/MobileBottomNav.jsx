import React from 'react';
import { LayoutDashboard, ClipboardCheck, Award, TrendingUp, ShieldAlert } from 'lucide-react';

export default function MobileBottomNav({ currentView, setView }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'assessment', label: 'Test', icon: ClipboardCheck },
    { id: 'results', label: 'Results', icon: Award },
    { id: 'development', label: 'Plan', icon: TrendingUp },
    { id: 'certificate', label: 'Certificate', icon: Award },
  ];

  return (
    <nav 
      className="mobile-bottom-nav no-print"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #E5E7EB',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        padding: '8px 4px 12px 4px',
        zIndex: 40,
        boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              color: isActive ? '#8B1528' : '#64748B',
              fontSize: '0.68rem',
              fontWeight: isActive ? 700 : 500,
              flex: 1
            }}
          >
            <Icon size={20} color={isActive ? '#8B1528' : '#64748B'} strokeWidth={isActive ? 2.5 : 2} />
            <span>{tab.label}</span>
          </button>
        );
      })}

      <style>{`
        @media (min-width: 900px) {
          .mobile-bottom-nav {
            display: none !important;
          }
        }
      `}</style>
    </nav>
  );
}
