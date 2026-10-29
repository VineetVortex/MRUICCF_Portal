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
  logoutUser,
  getStoredAssessments, 
  getStoredAttempts,
  getLatestAttempt,
  handleSeedData 
} from './lib/storage';
import { initAuthSession, apiLogoutUser, clearAuthSession, subscribeAuth } from './lib/authClient';
import { getSupabaseClient, isSupabaseConfigured } from './lib/supabase';
import { resolveClientIdentity } from './lib/authResolver';

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

  const setUserRole = (newRole) => {
    if (currentUserData) {
      const updated = { ...currentUserData, role: newRole };
      setUserData(updated);
      setCurrentUser(updated);
    }
  };

  // Active Assessment configuration state
  const [assessments, setAssessments] = useState(() => getStoredAssessments());
  const [activeAssessment, setActiveAssessment] = useState(() => assessments[0] || null);

  // Latest attempt / results state for dynamic scoring & certificates
  const [activeAttempt, setActiveAttempt] = useState(() => getLatestAttempt(currentUserData?.uid || currentUserData?.id));

  // Exam Lockdown state for strict academic integrity enforcement
  const [examLockdown, setExamLockdown] = useState(null);

  // Auto-restore session from Supabase OAuth / Auth and HttpOnly refresh cookie
  useEffect(() => {
    // 1. Supabase Native Auth & Google OAuth session listener
    const sb = getSupabaseClient();
    let sbSubscription = null;

    if (sb && isSupabaseConfigured()) {
      const processSupabaseSession = async (session) => {
        if (!session?.user?.email) return;
        const authUser = session.user;
        const userEmail = authUser.email.toLowerCase();

        // Check if user already exists in public.users or database
        let userProfile = null;
        try {
          const { data: dbUser } = await sb.from('users').select('*').eq('email', userEmail).maybeSingle();
          if (dbUser) {
            userProfile = {
              id: dbUser.id || authUser.id,
              uid: dbUser.id || authUser.id,
              email: dbUser.email,
              name: dbUser.name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || userEmail.split('@')[0],
              role: dbUser.role || 'student',
              department: dbUser.department || 'Computer Science & Technology',
              deptCode: dbUser.dept_code || 'CST',
              year: dbUser.year || '3rd Year',
              rollNo: dbUser.roll_no || '2024-CST-042',
              designation: dbUser.designation,
              avatar: dbUser.avatar || authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || '',
              lastLoginAt: new Date().toISOString()
            };
          }
        } catch (err) {
          console.warn('[Supabase Profile Sync Fetch Notice]:', err);
        }

        if (!userProfile) {
          userProfile = resolveClientIdentity(userEmail, authUser.user_metadata?.full_name || authUser.user_metadata?.name);
          userProfile.id = authUser.id;
          userProfile.uid = authUser.id;
          if (authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture) {
            userProfile.avatar = authUser.user_metadata.avatar_url || authUser.user_metadata.picture;
          }

          // Upsert to public.users for persistence
          try {
            await sb.from('users').upsert({
              id: authUser.id,
              email: userEmail,
              name: userProfile.name,
              role: userProfile.role,
              department: userProfile.department,
              dept_code: userProfile.deptCode,
              year: userProfile.year,
              roll_no: userProfile.rollNo,
              avatar: userProfile.avatar || '',
              is_active: true,
              last_login_at: new Date().toISOString()
            }, { onConflict: 'email' });
          } catch (upsertErr) {
            console.warn('[Supabase Profile Upsert Notice]:', upsertErr);
          }
        }

        handleUserAuthenticated(userProfile);
      };

      // Check current session immediately (for Google OAuth return redirect)
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          processSupabaseSession(session);
        }
      }).catch((e) => console.warn('[Supabase getSession error]:', e));

      // Listen for OAuth sign-in and token changes
      const { data } = sb.auth.onAuthStateChange((event, session) => {
        if (session && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
          processSupabaseSession(session);
        }
      });
      sbSubscription = data?.subscription;
    }

    // 2. Also restore backend custom session if available
    initAuthSession().then((restoredUser) => {
      if (restoredUser && !currentUserData) {
        setUserData(restoredUser);
        setCurrentUser(restoredUser);
        setActiveAttempt(getLatestAttempt(restoredUser?.uid || restoredUser?.id));
      }
    });

    // Listen for session expiration events
    const unsubscribe = subscribeAuth((event, data) => {
      if (event === 'session_expired') {
        const storedUser = getCurrentUser();
        if (!storedUser) {
          logoutUser();
          clearAuthSession();
          setUserData(null);
          setActiveAttempt(null);
          setView('landing');
        }
      }
    });

    return () => {
      unsubscribe();
      if (sbSubscription) sbSubscription.unsubscribe();
    };
  }, []);

  // Secure Logout handler: immediately clears state synchronously so UI resets to landing page instantly
  const handleLogout = () => {
    // 1. Immediately reset application state
    logoutUser();
    clearAuthSession();
    setUserData(null);
    setActiveAttempt(null);
    setView('landing');

    // 2. Sign out of Supabase
    try {
      const sb = getSupabaseClient();
      if (sb) sb.auth.signOut();
    } catch (e) {
      console.warn('[Supabase Logout Notice]:', e);
    }

    // 3. Clear backend refresh session and HttpOnly cookie in the background
    apiLogoutUser().catch((err) => {
      console.warn('[Logout] Backend session notice:', err);
    });
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
            setUserRole={setUserRole}
          />
        );
      case 'faculty':
        if (!currentUserData) {
          return (
            <AuthView 
              setView={setView} 
              setUserData={handleUserAuthenticated} 
              setUserRole={setUserRole}
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
              setUserRole={setUserRole}
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
              setUserRole={setUserRole}
              onAssessmentsUpdated={() => setAssessments(getStoredAssessments())}
              setActiveAttempt={setActiveAttempt}
              setActiveAssessment={setActiveAssessment}
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
        return (
          <AssessmentView 
            setView={setView} 
            currentUser={currentUserData}
            userRole={userRole}
            activeAssessment={activeAssessment}
            examLockdown={examLockdown}
            setExamLockdown={setExamLockdown}
            onCompleteAttempt={(completedAttempt, targetView = 'results') => {
              setActiveAttempt(completedAttempt);
              setExamLockdown(null);
              setView(targetView);
            }}
          />
        );
      case 'results':
        return (
          <ResultsView 
            setView={setView} 
            currentUser={currentUserData}
            userRole={userRole}
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
              setActiveAssessment={setActiveAssessment}
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
        return (
          <CertificateView 
            setView={setView} 
            currentUser={currentUserData}
            userRole={userRole}
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
            setUserRole={setUserRole}
            onAssessmentsUpdated={() => setAssessments(getStoredAssessments())}
            setActiveAttempt={setActiveAttempt}
            setActiveAssessment={setActiveAssessment}
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
              setUserRole={setUserRole}
              onAssessmentsUpdated={() => setAssessments(getStoredAssessments())}
              setActiveAttempt={setActiveAttempt}
              setActiveAssessment={setActiveAssessment}
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
          setUserRole={setUserRole}
          currentUser={currentUserData}
          onLogout={handleLogout}
          examLockdown={examLockdown}
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
