import React, { useState } from 'react';
import Logo from './Logo';
import { 
  Search, 
  Bell, 
  ChevronDown, 
  GraduationCap, 
  ShieldCheck, 
  User, 
  LogOut,
  Sparkles,
  Layers,
  Settings,
  FileCheck,
  Building,
  Check
} from 'lucide-react';
import { USER_ROLES } from '../lib/storage';

export default function Navbar({ currentView, setView, userRole, setUserRole, currentUser, onLogout }) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Dynamic nav links according to roles in COMPLETE_DOCUMENTATION.md
  const getNavLinks = () => {
    if (userRole === USER_ROLES.STUDENT) {
      return [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'assessment', label: 'Take Assessment' },
        { id: 'results', label: 'My Results' },
        { id: 'development', label: 'Development' },
        { id: 'certificate', label: 'Certificates' }
      ];
    }
    if (userRole === USER_ROLES.FACULTY) {
      return [
        { id: 'faculty', label: 'Faculty Portal' }
      ];
    }
    if (userRole === USER_ROLES.DEPT_HEAD) {
      return [
        { id: 'faculty', label: 'Faculty & HoD Portal' }
      ];
    }
    // CORE_TEAM and SYSTEM_ADMIN
    return [
      { id: 'admin', label: 'Admin Management & Governance' }
    ];
  };

  const navLinks = getNavLinks();

  const roleLabels = {
    [USER_ROLES.STUDENT]: { label: 'Student', color: '#16A34A', bg: '#DCFCE7' },
    [USER_ROLES.FACULTY]: { label: 'Faculty', color: '#0D9488', bg: '#CCFBF1' },
    [USER_ROLES.DEPT_HEAD]: { label: 'Department Head', color: '#0284C7', bg: '#E0F2FE' },
    [USER_ROLES.CORE_TEAM]: { label: 'Core Team (Admin)', color: '#8B1528', bg: '#FDF2F4' },
    [USER_ROLES.SYSTEM_ADMIN]: { label: 'System Admin', color: '#7C3AED', bg: '#F3E8FF' }
  };

  const currentRoleInfo = roleLabels[userRole] || roleLabels[USER_ROLES.STUDENT];

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      backgroundColor: '#FFFFFF',
      borderBottom: '1px solid #EAE7E0',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px'
      }}>
        {/* Left Logo */}
        <Logo onClick={() => {
          if (userRole === USER_ROLES.STUDENT) setView('dashboard');
          else if (userRole === USER_ROLES.FACULTY || userRole === USER_ROLES.DEPT_HEAD) setView('faculty');
          else setView('admin');
        }} />

        {/* Top Horizontal Nav Links */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap'
        }} className="desktop-nav">
          {navLinks.map((link) => {
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setView(link.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? '#8B1528' : '#57534E',
                  backgroundColor: isActive ? '#FDF2F4' : 'transparent',
                  transition: 'all 0.15s ease',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Right Section Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>

          {/* Active Role Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '5px 12px',
            borderRadius: '9999px',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: currentRoleInfo.color,
            backgroundColor: currentRoleInfo.bg,
            border: `1px solid ${currentRoleInfo.color}33`
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: currentRoleInfo.color }} />
            <span>{currentRoleInfo.label}</span>
          </div>

          {/* Profile Pill & Role Switcher */}
          <div style={{ position: 'relative' }}>
            <div
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '4px 10px 4px 4px',
                borderRadius: '9999px',
                backgroundColor: '#F8F6F2',
                border: '1px solid #E6E1D8',
                cursor: 'pointer'
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  backgroundColor: '#8B1528',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.85rem',
                  fontWeight: 800,
                  flexShrink: 0
                }}
              >
                {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ display: 'none', flexDirection: 'column', textAlign: 'left' }} className="profile-text">
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917', lineHeight: 1.1 }}>
                  {currentUser?.name || 'User'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#78716C', lineHeight: 1 }}>
                  {currentUser?.designation || currentUser?.year || 'ICCF Portal'}
                </span>
              </div>
              <ChevronDown size={14} color="#78716C" />
            </div>

            {/* Profile & Role Switcher Dropdown */}
            {profileDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                width: '280px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                boxShadow: '0 12px 35px rgba(0,0,0,0.14)',
                border: '1px solid #EAE7E0',
                padding: '12px',
                zIndex: 100
              }}>
                <div style={{ padding: '6px 8px 10px 8px', borderBottom: '1px solid #F1EFEA', marginBottom: '10px' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#1C1917' }}>
                    {currentUser?.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '2px' }}>
                    {currentUser?.email}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#8B1528', fontWeight: 600, marginTop: '2px' }}>
                    {currentUser?.department}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #F1EFEA', paddingTop: '8px' }}>
                  <button
                    onClick={() => {
                      if (onLogout) {
                        onLogout();
                      } else {
                        localStorage.removeItem('mr_iccf_current_user_v1');
                        localStorage.removeItem('mr_iccf_token');
                        setView('landing');
                      }
                      setProfileDropdownOpen(false);
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.82rem',
                      color: '#DC2626',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer'
                    }}
                  >
                    <LogOut size={14} /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
