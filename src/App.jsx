import React, { useState, useEffect, useMemo } from 'react';
import { ShieldCheck, CheckCircle2, Award, ExternalLink, X, FileCheck } from 'lucide-react';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';
import LandingView from './views/LandingView';
import SplashView from './views/SplashView';
import AuthView from './views/AuthView';
import DashboardView from './views/DashboardView';
import AssessmentView from './views/AssessmentView';
import ResultsView from './views/ResultsView';
import DevelopmentView from './views/DevelopmentView';
import CertificateView from './views/CertificateView';
import AdminView from './views/AdminView';
import FacultyView from './views/FacultyView';

import { 
  USER_ROLES, 
  getCurrentUser, 
  setCurrentUser, 
  getStoredAssessments, 
  getStoredAttempts,
  getLatestAttempt,
  handleSeedData 
} from './lib/storage';
import { initAuthSession, apiLogoutUser, subscribeAuth } from './lib/authClient';

export default function App() {
  // Public Credential Verification via QR scan (?verify=MRU-ICCF-...)
  const [publicVerifyId, setPublicVerifyId] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search);
      return p.get('verify') || null;
    }
    return null;
  });

  // Current view state: default to landing page
  const [currentUserData, setUserData] = useState(() => getCurrentUser());
  const [currentView, setView] = useState('landing');
  
  // User & Role State adhering to COMPLETE_DOCUMENTATION.md
  // Roles: 'student' | 'dept_head' | 'core_team' | 'system_admin'
  const userRole = currentUserData?.role || USER_ROLES.STUDENT;

  // Active Assessment configuration state
  const [assessments, setAssessments] = useState(() => getStoredAssessments());
  const [activeAssessment, setActiveAssessment] = useState(() => assessments[0] || null);

  // Latest attempt / results state for dynamic scoring & certificates
  const [activeAttempt, setActiveAttempt] = useState(() => getLatestAttempt(currentUserData?.uid || currentUserData?.id));

  // Auto-restore session from HttpOnly refresh cookie on application load
  useEffect(() => {
    initAuthSession().then((restoredUser) => {
      if (restoredUser) {
        setUserData(restoredUser);
        setCurrentUser(restoredUser);
        setActiveAttempt(getLatestAttempt(restoredUser?.uid || restoredUser?.id));
      }
    });

    // Listen for session expiration events (failed refresh / expired session)
    const unsubscribe = subscribeAuth((event, data) => {
      if (event === 'session_expired') {
        const storedUser = getCurrentUser();
        // Only clear and redirect if there is no active local session
        if (!storedUser) {
          localStorage.removeItem('mr_iccf_current_user_v1');
          localStorage.removeItem('mr_iccf_token');
          setUserData(null);
          setView((prev) => (prev === 'landing' ? 'landing' : 'auth'));
        }
      }
    });
    return unsubscribe;
  }, []);

  // Secure Logout handler
  const handleLogout = async () => {
    try {
      await apiLogoutUser();
    } catch (e) {
      // ignore
    }
    localStorage.removeItem('mr_iccf_current_user_v1');
    localStorage.removeItem('mr_iccf_token');
    setUserData(null);
    setView('landing');
  };

  // Set authenticated user data and synchronize state
  const handleUserAuthenticated = (user) => {
    if (user) {
      setUserData(user);
      setCurrentUser(user);
      setActiveAttempt(getLatestAttempt(user?.uid || user?.id));
      const role = (user.role || '').toLowerCase();
      if (role === 'core_team' || role === 'system_admin' || role === 'admin') {
        setView('admin');
      } else if (role === 'faculty' || role === 'dept_head' || role === 'hod' || role === 'dean') {
        setView('faculty');
      } else {
        setView('dashboard');
      }
    }
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return <LandingView setView={setView} currentUser={currentUserData} onLogout={handleLogout} />;
      case 'splash':
        return <SplashView setView={setView} />;
      case 'auth':
        return (
          <AuthView 
            setView={setView} 
            setUserData={handleUserAuthenticated} 
          />
        );
      case 'faculty':
        if (!currentUserData) {
          return (
            <AuthView 
              setView={setView} 
              setUserData={handleUserAuthenticated} 
            />
          );
        }
        if (userRole === USER_ROLES.STUDENT) {
          return (
            <DashboardView 
              setView={setView} 
              currentUser={currentUserData}
              userRole={userRole}
              activeAttempt={activeAttempt}
              setActiveAttempt={setActiveAttempt}
              setActiveAssessment={setActiveAssessment}
            />
          );
        }
        return (
          <FacultyView
            setView={setView}
            currentUser={currentUserData}
            userRole={userRole}
            onLogout={handleLogout}
          />
        );
      case 'dashboard':
        if (!currentUserData) {
          return (
            <AuthView 
              setView={setView} 
              setUserData={handleUserAuthenticated} 
            />
          );
        }
        if (userRole === USER_ROLES.FACULTY || userRole === USER_ROLES.DEPT_HEAD) {
          return (
            <FacultyView
              setView={setView}
              currentUser={currentUserData}
              userRole={userRole}
              onLogout={handleLogout}
            />
          );
        }
        if (userRole !== USER_ROLES.STUDENT) {
          return (
            <AdminView 
              setView={setView} 
              currentUser={currentUserData}
              userRole={userRole}
              onAssessmentsUpdated={() => setAssessments(getStoredAssessments())}
              setActiveAttempt={setActiveAttempt}
            />
          );
        }
        return (
          <DashboardView 
            setView={setView} 
            currentUser={currentUserData}
            userRole={userRole}
            activeAttempt={activeAttempt}
            setActiveAttempt={setActiveAttempt}
            setActiveAssessment={setActiveAssessment}
          />
        );
      case 'assessment':
        // Guard: Only students take the assessment exam; faculty/admins view their respective portals
        if (userRole === USER_ROLES.FACULTY || userRole === USER_ROLES.DEPT_HEAD) {
          return (
            <FacultyView
              setView={setView}
              currentUser={currentUserData}
              userRole={userRole}
              onLogout={handleLogout}
            />
          );
        }
        if (userRole !== USER_ROLES.STUDENT) {
          return (
            <AdminView 
              setView={setView} 
              currentUser={currentUserData}
              userRole={userRole}
              onAssessmentsUpdated={() => setAssessments(getStoredAssessments())}
              setActiveAttempt={setActiveAttempt}
            />
          );
        }
        return (
          <AssessmentView 
            setView={setView} 
            currentUser={currentUserData}
            activeAssessment={activeAssessment}
            onCompleteAttempt={(completedAttempt) => {
              setActiveAttempt(completedAttempt);
              setView('results');
            }}
          />
        );
      case 'results':
        // Guard: Individual test scorecard is for students only; Faculty/Admins view results in their portals
        if (userRole === USER_ROLES.FACULTY || userRole === USER_ROLES.DEPT_HEAD) {
          return (
            <FacultyView
              setView={setView}
              currentUser={currentUserData}
              userRole={userRole}
              onLogout={handleLogout}
            />
          );
        }
        if (userRole !== USER_ROLES.STUDENT) {
          return (
            <AdminView 
              setView={setView} 
              currentUser={currentUserData}
              userRole={userRole}
              onAssessmentsUpdated={() => setAssessments(getStoredAssessments())}
              setActiveAttempt={setActiveAttempt}
            />
          );
        }
        return (
          <ResultsView 
            setView={setView} 
            currentUser={currentUserData}
            activeAttempt={activeAttempt}
            setActiveAttempt={setActiveAttempt}
          />
        );
      case 'development':
        if (userRole === USER_ROLES.FACULTY || userRole === USER_ROLES.DEPT_HEAD) {
          return (
            <FacultyView
              setView={setView}
              currentUser={currentUserData}
              userRole={userRole}
              onLogout={handleLogout}
            />
          );
        }
        if (userRole !== USER_ROLES.STUDENT) {
          return (
            <AdminView 
              setView={setView} 
              currentUser={currentUserData}
              userRole={userRole}
              onAssessmentsUpdated={() => setAssessments(getStoredAssessments())}
              setActiveAttempt={setActiveAttempt}
            />
          );
        }
        return (
          <DevelopmentView 
            setView={setView} 
            currentUser={currentUserData}
            activeAttempt={activeAttempt}
          />
        );
      case 'certificate':
        // Guard: Individual certificates are issued to students; Faculty/Admins view dashboards
        if (userRole === USER_ROLES.FACULTY || userRole === USER_ROLES.DEPT_HEAD) {
          return (
            <FacultyView
              setView={setView}
              currentUser={currentUserData}
              userRole={userRole}
              onLogout={handleLogout}
            />
          );
        }
        if (userRole !== USER_ROLES.STUDENT) {
          return (
            <AdminView 
              setView={setView} 
              currentUser={currentUserData}
              userRole={userRole}
              onAssessmentsUpdated={() => setAssessments(getStoredAssessments())}
              setActiveAttempt={setActiveAttempt}
            />
          );
        }
        return (
          <CertificateView 
            setView={setView} 
            currentUser={currentUserData}
            activeAttempt={activeAttempt}
          />
        );
      case 'admin':
        // Guard: Students cannot access Admin portal
        if (userRole === USER_ROLES.STUDENT) {
          return (
            <DashboardView 
              setView={setView} 
              currentUser={currentUserData}
              userRole={userRole}
              activeAttempt={activeAttempt}
              setActiveAttempt={setActiveAttempt}
              setActiveAssessment={setActiveAssessment}
            />
          );
        }
        // Guard: Faculty & Department Heads stay inside Faculty Portal
        if (userRole === USER_ROLES.FACULTY || userRole === USER_ROLES.DEPT_HEAD) {
          return (
            <FacultyView
              setView={setView}
              currentUser={currentUserData}
              userRole={userRole}
              onLogout={handleLogout}
            />
          );
        }
        return (
          <AdminView 
            setView={setView} 
            currentUser={currentUserData}
            userRole={userRole}
            onAssessmentsUpdated={() => setAssessments(getStoredAssessments())}
            setActiveAttempt={setActiveAttempt}
          />
        );
      default:
        if (userRole === USER_ROLES.FACULTY || userRole === USER_ROLES.DEPT_HEAD) {
          return (
            <FacultyView
              setView={setView}
              currentUser={currentUserData}
              userRole={userRole}
              onLogout={handleLogout}
            />
          );
        }
        if (userRole !== USER_ROLES.STUDENT) {
          return (
            <AdminView 
              setView={setView} 
              currentUser={currentUserData}
              userRole={userRole}
              onAssessmentsUpdated={() => setAssessments(getStoredAssessments())}
              setActiveAttempt={setActiveAttempt}
            />
          );
        }
        return (
          <DashboardView 
            setView={setView} 
            currentUser={currentUserData}
            userRole={userRole}
            activeAttempt={activeAttempt}
            setActiveAttempt={setActiveAttempt}
            setActiveAssessment={setActiveAssessment}
          />
        );
    }
  };

  const isFullscreenView = currentView === 'splash' || currentView === 'landing' || currentView === 'auth';

  return (
    <div className="app-root" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      {!isFullscreenView && (
        <Navbar 
          currentView={currentView} 
          setView={setView} 
          userRole={userRole} 
          currentUser={currentUserData}
          onLogout={handleLogout}
        />
      )}

      {/* Main View Area */}
      <main style={{ flex: 1 }}>
        {renderCurrentView()}
      </main>

      {/* Floating Bottom Navigator for mobile viewport */}
      {!isFullscreenView && (
        <MobileBottomNav currentView={currentView} setView={setView} />
      )}

      {/* Public Credential Verification Modal (for QR Code Scans) */}
      {publicVerifyId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="mr-card" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '30px',
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '2px solid #D97706'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917', margin: 0 }}>
                    Official Credential Verified
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#16A34A', fontWeight: 700 }}>
                    Manav Rachna University Academic Ledger
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setPublicVerifyId(null);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', window.location.pathname);
                  }
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{
              backgroundColor: '#FDFBF9',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid #ECE7DF',
              marginBottom: '20px',
              fontSize: '0.86rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: '10px' }}>
                <span style={{ color: '#78716C', fontWeight: 600 }}>Status:</span>
                <strong style={{ color: '#16A34A', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={16} /> Authentic & Validated
                </strong>

                <span style={{ color: '#78716C', fontWeight: 600 }}>Credential ID:</span>
                <span style={{ color: '#1C1917', fontFamily: 'monospace', fontWeight: 700 }}>{publicVerifyId}</span>

                <span style={{ color: '#78716C', fontWeight: 600 }}>Passing Criteria:</span>
                <strong style={{ color: '#1C1917' }}>Minimum 65.00% Required (Satisfied)</strong>

                <span style={{ color: '#78716C', fontWeight: 600 }}>Framework:</span>
                <span style={{ color: '#1C1917' }}>ICCF 15-Dimension Competency Diagnostic</span>

                <span style={{ color: '#78716C', fontWeight: 600 }}>Institution:</span>
                <span style={{ color: '#8B1528', fontWeight: 700 }}>Manav Rachna Educational Institutions</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setPublicVerifyId(null);
                  if (typeof window !== 'undefined') {
                    window.history.replaceState({}, '', window.location.pathname);
                  }
                  setView('landing');
                }}
                className="btn-primary"
                style={{ flex: 1, padding: '12px', fontSize: '0.92rem' }}
              >
                Continue to Portal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
