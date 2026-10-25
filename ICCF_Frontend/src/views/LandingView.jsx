import React from 'react';
import { 
  ArrowRight, 
  BookOpen, 
  CheckCircle2, 
  Award, 
  Target, 
  Users, 
  Sparkles, 
  Building2, 
  ShieldCheck, 
  BarChart3, 
  FileCheck, 
  LogIn, 
  LogOut, 
  Compass, 
  GraduationCap, 
  MapPin, 
  Mail, 
  Phone 
} from 'lucide-react';
import Logo from '../components/Logo';

export default function LandingView({ setView, currentUser, onLogout }) {
  const stats = [
    { number: '15', label: 'Core Competencies', icon: Target, color: '#DC2626', bg: '#FEF2F2' },
    { number: '150', label: 'Calibrated Items', icon: BookOpen, color: '#2563EB', bg: '#EFF6FF' },
    { number: '5', label: 'Proficiency Tiers', icon: Sparkles, color: '#059669', bg: '#ECFDF5' },
    { number: 'Official', label: 'Institutional Credential', icon: Award, color: '#7C3AED', bg: '#F5F3FF' },
  ];

  const competencies = [
    { num: '01', title: 'Communication', domain: 'Interpersonal', desc: 'Clarity, active listening, adaptive delivery & constructive feedback exchange.' },
    { num: '02', title: 'Planning & Organizing', domain: 'Cognitive', desc: 'Systematic goal setting, resource prioritization & rigorous timeline execution.' },
    { num: '03', title: 'Professionalism', domain: 'Ethical', desc: 'Punctuality, business etiquette, accountability & unwavering workplace integrity.' },
    { num: '04', title: 'Resource Management', domain: 'Cognitive', desc: 'Optimal allocation of time, assets, human effort & waste minimization.' },
    { num: '05', title: 'Building Trust', domain: 'Interpersonal', desc: 'Reliability, intellectual honesty, consistency & keeping commitments.' },
    { num: '06', title: 'Collaboration & Teamwork', domain: 'Interpersonal', desc: 'Cross-functional cooperation, mutual support & group goal achievement.' },
    { num: '07', title: 'Conflict Resolution', domain: 'Interpersonal', desc: 'Impartial mediation, objective problem solving & constructive negotiation.' },
    { num: '08', title: 'Emotional Intelligence', domain: 'Personal', desc: 'High self-awareness, social perception & measured emotional regulation.' },
    { num: '09', domain: 'Personal', title: 'Empathy', desc: 'Active perspective taking, compassionate understanding & human connection.' },
    { num: '10', title: 'Inclusion & Diversity', domain: 'Ethical', desc: 'Valuing diverse lived experiences, equity & fostering psychological safety.' },
    { num: '11', title: 'Ethics & Integrity', domain: 'Ethical', desc: 'Principled conduct, transparency, moral compass & adherence to codes of honor.' },
    { num: '12', title: 'Accountability', domain: 'Ethical', desc: 'Full ownership of outcomes, transparent actions & learning from mistakes.' },
    { num: '13', title: 'Lifelong Learning', domain: 'Cognitive', desc: 'Intellectual curiosity, autonomous upskilling & growth mindset adoption.' },
    { num: '14', title: 'Resilience', domain: 'Personal', desc: 'Bouncing back from setbacks with perseverance, grit & optimism.' },
    { num: '15', title: 'Self-Management', domain: 'Personal', desc: 'Personal discipline, stress mitigation, attention control & healthy impulse regulation.' },
  ];

  const workflowSteps = [
    {
      step: '01',
      title: 'Institutional Single Sign-In',
      desc: 'Log in with your official Manav Rachna University email (@mru.ac.in for students, @mru.edu.in for faculty/admins) with real-time domain resolution.',
      icon: LogIn,
      color: '#8B1528'
    },
    {
      step: '02',
      title: '150-Item Calibrated Diagnostic',
      desc: 'Engage with scientifically designed behavioral scenarios that measure actual real-world actions rather than theoretical memorization.',
      icon: BookOpen,
      color: '#2563EB'
    },
    {
      step: '03',
      title: 'Real-Time Radar & Benchmark Scoring',
      desc: 'Gain instant visualization across all 15 competencies with comparison against department and cohort benchmarks.',
      icon: BarChart3,
      color: '#059669'
    },
    {
      step: '04',
      title: 'Verifiable University Credential',
      desc: 'Earn an official, cryptographically verifiable Institutional Competency Certificate with dynamic QR verification for recruiters.',
      icon: Award,
      color: '#7C3AED'
    }
  ];

  return (
    <div className="landing-page" style={{ minHeight: '100vh', backgroundColor: '#FDFBF9' }}>
      {/* Top Banner Header */}
      <header style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #EAE7E0',
        padding: '14px 0',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <div className="container" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <Logo size="normal" onClick={() => setView('landing')} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <nav style={{ display: 'none', gap: '22px', fontSize: '0.88rem', fontWeight: 600, color: '#57534E' }} className="landing-nav">
              <a href="#about" style={{ color: '#57534E', textDecoration: 'none', transition: 'color 0.15s ease' }}>About Framework</a>
              <a href="#competencies" style={{ color: '#57534E', textDecoration: 'none', transition: 'color 0.15s ease' }}>15 Competencies</a>
              <a href="#framework" style={{ color: '#57534E', textDecoration: 'none', transition: 'color 0.15s ease' }}>How It Works</a>
              <a href="#accreditations" style={{ color: '#57534E', textDecoration: 'none', transition: 'color 0.15s ease' }}>Accreditations</a>
              <a href="#contact" style={{ color: '#57534E', textDecoration: 'none', transition: 'color 0.15s ease' }}>Contact</a>
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {currentUser ? (
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    backgroundColor: '#F8F6F2',
                    border: '1px solid #E6E1D8'
                  }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16A34A' }} />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>
                      {currentUser?.name || 'Active User'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      if (currentUser?.role === 'core_team' || currentUser?.role === 'system_admin') {
                        setView('admin');
                      } else if (currentUser?.role === 'faculty' || currentUser?.role === 'dept_head') {
                        setView('faculty');
                      } else {
                        setView('dashboard');
                      }
                    }}
                    className="btn-primary"
                    style={{ padding: '8px 20px', fontSize: '0.88rem' }}
                  >
                    <span>
                      {currentUser?.role === 'core_team' || currentUser?.role === 'system_admin'
                        ? 'Admin Portal'
                        : (currentUser?.role === 'faculty' || currentUser?.role === 'dept_head'
                            ? 'Faculty Portal'
                            : 'Dashboard')}
                    </span>
                    <ArrowRight size={15} />
                  </button>
                  <button
                    onClick={onLogout}
                    className="btn-secondary"
                    style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    title="Sign Out"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setView('auth')}
                  className="btn-primary"
                  style={{ padding: '9px 24px', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <LogIn size={16} />
                  <span>Institutional Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <style>{`
        @media (min-width: 880px) {
          .landing-nav { display: flex !important; }
        }
        .landing-nav a:hover {
          color: #8B1528 !important;
        }
      `}</style>

      {/* Hero Section */}
      <section style={{ padding: '56px 0 36px 0' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '44px',
            alignItems: 'center'
          }}>
            {/* Left Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                backgroundColor: '#FDF2F4',
                color: '#8B1528',
                fontSize: '0.78rem',
                fontWeight: 700,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                width: 'fit-content',
                border: '1px solid #F8D7DA'
              }}>
                <Sparkles size={14} color="#8B1528" />
                <span>Institutional Competency Certification Framework (ICCF)</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(2.4rem, 4.2vw, 3.6rem)',
                fontWeight: 800,
                color: '#8B1528',
                lineHeight: 1.15,
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-serif, serif)'
              }}>
                Empowering Future-Ready Graduates
              </h1>

              <p style={{
                fontSize: '1.08rem',
                color: '#57534E',
                lineHeight: 1.65,
                maxWidth: '560px'
              }}>
                A comprehensive human-centric skills assessment and diagnostic platform engineered specifically for Manav Rachna University students. Scientifically evaluate, track, and officially certify 15 essential competencies recognized by global accreditation bodies and top corporate employers.
              </p>

              {/* Primary CTA Buttons */}
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '6px' }}>
                {currentUser ? (
                  <>
                    <button
                      onClick={() => {
                        if (currentUser?.role === 'core_team' || currentUser?.role === 'system_admin' || currentUser?.role === 'dept_head') {
                          setView('admin');
                        } else {
                          setView('dashboard');
                        }
                      }}
                      className="btn-primary"
                      style={{ padding: '14px 32px', fontSize: '1.02rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <span>{currentUser?.role === 'core_team' || currentUser?.role === 'system_admin' || currentUser?.role === 'dept_head' ? 'Open Admin Governance Console' : 'Open Student Dashboard'}</span>
                      <ArrowRight size={18} />
                    </button>
                    {currentUser?.role === 'student' && (
                      <button
                        onClick={() => setView('assessment')}
                        className="btn-secondary"
                        style={{ padding: '14px 28px', fontSize: '1.02rem' }}
                      >
                        Take Assessment
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => setView('auth')}
                      className="btn-primary"
                      style={{ padding: '14px 34px', fontSize: '1.02rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                    >
                      <LogIn size={18} />
                      <span>Institutional Login</span>
                      <ArrowRight size={18} />
                    </button>

                    <a
                      href="#competencies"
                      className="btn-secondary"
                      style={{ padding: '14px 28px', fontSize: '1.02rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                    >
                      Explore 15 Competencies
                    </a>
                  </>
                )}
              </div>

              {/* 4 Quick Stat Pills */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                marginTop: '18px',
                width: '100%',
                boxSizing: 'border-box',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                cursor: 'default',
                caretColor: 'transparent'
              }}>
                {stats.map((s, idx) => {
                  const Icon = s.icon;
                  return (
                    <div 
                      key={idx}
                      className="stat-pill"
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #EAE7E0',
                        borderRadius: '14px',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                        minWidth: 0,
                        boxSizing: 'border-box',
                        userSelect: 'none',
                        WebkitUserSelect: 'none',
                        cursor: 'default',
                        caretColor: 'transparent'
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: s.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: s.color,
                        flexShrink: 0,
                        userSelect: 'none',
                        pointerEvents: 'none'
                      }}>
                        <Icon size={18} />
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        minWidth: 0, 
                        flex: 1,
                        userSelect: 'none',
                        pointerEvents: 'none'
                      }}>
                        <span style={{ 
                          fontSize: '1.18rem', 
                          fontWeight: 800, 
                          color: '#1C1917', 
                          lineHeight: 1.15,
                          userSelect: 'none',
                          cursor: 'default',
                          caretColor: 'transparent'
                        }}>
                          {s.number}
                        </span>
                        <span style={{
                          fontSize: '0.74rem',
                          fontWeight: 650,
                          color: '#57534E',
                          lineHeight: 1.25,
                          marginTop: '2px',
                          wordBreak: 'keep-all',
                          overflowWrap: 'normal',
                          whiteSpace: 'normal',
                          hyphens: 'none',
                          userSelect: 'none',
                          WebkitUserSelect: 'none',
                          cursor: 'default',
                          caretColor: 'transparent'
                        }}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Campus Visual (Grand Building with Fountain) */}
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'relative',
                borderRadius: '32px',
                overflow: 'hidden',
                boxShadow: '0 20px 40px -10px rgba(139, 21, 40, 0.16)',
                border: '4px solid #FFFFFF'
              }}>
                <img
                  src="/assets/mr_campus_hero.jpg"
                  alt="Manav Rachna Campus Fountain"
                  style={{
                    width: '100%',
                    height: '420px',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                />

                {/* Curved Overlay Banner top-left */}
                <div style={{
                  position: 'absolute',
                  top: '18px',
                  left: '18px',
                  backgroundColor: 'rgba(255, 255, 255, 0.94)',
                  backdropFilter: 'blur(8px)',
                  padding: '10px 18px',
                  borderRadius: '16px',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Sparkles size={18} color="#D97706" />
                  <span style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: '0.96rem',
                    fontWeight: 700,
                    color: '#8B1528',
                    fontStyle: 'italic'
                  }}>
                    Education Beyond Classrooms
                  </span>
                </div>

                {/* Quote Bubble bottom-right */}
                <div style={{
                  position: 'absolute',
                  bottom: '18px',
                  right: '18px',
                  backgroundColor: 'rgba(28, 25, 23, 0.88)',
                  color: '#FFFFFF',
                  backdropFilter: 'blur(8px)',
                  padding: '12px 20px',
                  borderRadius: '18px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                  maxWidth: '280px'
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FEF3C7' }}>
                    “Building People. Building a Better Tomorrow.”
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#D6D3D1', marginTop: '2px' }}>
                    Manav Rachna Educational Institutions
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About the Framework Section */}
      <section id="about" style={{ padding: '60px 0', backgroundColor: '#FFFFFF', borderTop: '1px solid #EAE7E0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 48px auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: '#FFF5F6',
              color: '#8B1528',
              fontSize: '0.74rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px'
            }}>
              <ShieldCheck size={14} color="#8B1528" />
              <span>Scientific Pedagogy</span>
            </div>
            <h2 style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#8B1528',
              fontFamily: 'var(--font-serif)'
            }}>
              Human-Centric Competency Architecture
            </h2>
            <p style={{ color: '#57534E', marginTop: '10px', fontSize: '1.02rem', lineHeight: 1.6 }}>
              In an era dominated by rapid AI and technical automation, enduring career success depends upon foundational human skills. ICCF establishes a standard rubric to benchmark and nurture these non-linear capabilities.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px'
          }}>
            {[
              {
                title: 'Cognitive Mastery',
                desc: 'Strategic thinking, prioritization, agile learning, and resource optimization in complex scenarios.',
                icon: Compass,
                color: '#2563EB',
                bg: '#EFF6FF'
              },
              {
                title: 'Interpersonal Excellence',
                desc: 'Active listening, collaborative teamwork, constructive conflict mediation, and trust architecture.',
                icon: Users,
                color: '#059669',
                bg: '#ECFDF5'
              },
              {
                title: 'Personal Fortitude',
                desc: 'Emotional regulation, grit, perseverance through setbacks, and disciplined self-management.',
                icon: Target,
                color: '#D97706',
                bg: '#FEF3C7'
              },
              {
                title: 'Ethical Leadership',
                desc: 'Uncompromising integrity, inclusive cultural practices, accountability, and workplace decorum.',
                icon: ShieldCheck,
                color: '#8B1528',
                bg: '#FDF2F4'
              }
            ].map((pillar, idx) => {
              const Icon = pillar.icon;
              return (
                <div key={idx} style={{
                  padding: '28px 24px',
                  borderRadius: '20px',
                  backgroundColor: '#FDFBF9',
                  border: '1px solid #ECE7DF',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    backgroundColor: pillar.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: pillar.color,
                    marginBottom: '18px'
                  }}>
                    <Icon size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                    {pillar.title}
                  </h3>
                  <p style={{ fontSize: '0.88rem', color: '#64748B', lineHeight: 1.55 }}>
                    {pillar.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 15 Human Centric Competencies Showcase */}
      <section id="competencies" style={{ padding: '64px 0', backgroundColor: '#FDFBF9', borderTop: '1px solid #EAE7E0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 40px auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: '#FEF2F2',
              color: '#DC2626',
              fontSize: '0.74rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px'
            }}>
              <Target size={14} color="#DC2626" />
              <span>Comprehensive 15-Dimensional Rubric</span>
            </div>
            <h2 style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#8B1528',
              fontFamily: 'var(--font-serif)'
            }}>
              15 Human-Centric Competency Dimensions
            </h2>
            <p style={{ color: '#57534E', marginTop: '8px', fontSize: '1rem' }}>
              Scientifically formulated questionnaire based on 150 items measuring self-awareness, interpersonal excellence, and ethical resilience.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px'
          }}>
            {competencies.map((c) => (
              <div 
                key={c.num}
                style={{
                  padding: '20px',
                  borderRadius: '16px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EAE7E0',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
                onClick={() => currentUser ? setView('assessment') : setView('auth')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#8B1528';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 18px rgba(139, 21, 40, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#EAE7E0';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: '#B45309'
                    }}>
                      DIMENSION {c.num}
                    </span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#64748B',
                      backgroundColor: '#F1F5F9',
                      padding: '2px 8px',
                      borderRadius: '6px'
                    }}>
                      {c.domain}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.08rem', fontWeight: 700, color: '#1C1917', marginBottom: '6px' }}>
                    {c.title}
                  </div>
                  <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.45 }}>
                    {c.desc}
                  </p>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '14px',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  color: '#8B1528'
                }}>
                  <span>Evaluate 10 Calibrated Items</span>
                  <ArrowRight size={13} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <button
              onClick={() => currentUser ? setView('assessment') : setView('auth')}
              className="btn-primary"
              style={{ padding: '14px 34px', fontSize: '1rem', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <span>Take 150-Item Assessment Now</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="framework" style={{ padding: '64px 0', backgroundColor: '#FFFFFF', borderTop: '1px solid #EAE7E0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 48px auto' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '9999px',
              backgroundColor: '#EFF6FF',
              color: '#2563EB',
              fontSize: '0.74rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '10px'
            }}>
              <Compass size={14} color="#2563EB" />
              <span>Assessment Roadmap</span>
            </div>
            <h2 style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              color: '#8B1528',
              fontFamily: 'var(--font-serif)'
            }}>
              How the ICCF Evaluation Operates
            </h2>
            <p style={{ color: '#57534E', marginTop: '8px', fontSize: '1rem' }}>
              A seamless, zero-friction 4-stage evaluation designed for student growth and transparent faculty moderation.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px'
          }}>
            {workflowSteps.map((s, idx) => {
              const Icon = s.icon;
              return (
                <div key={idx} style={{
                  padding: '28px 22px',
                  borderRadius: '18px',
                  backgroundColor: '#FDFBF9',
                  border: '1px solid #ECE7DF',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '12px',
                    right: '16px',
                    fontSize: '2.2rem',
                    fontWeight: 900,
                    color: '#ECE7DF',
                    lineHeight: 1,
                    fontFamily: 'var(--font-serif)'
                  }}>
                    {s.step}
                  </div>
                  <div style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #EAE7E0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: s.color,
                    marginBottom: '16px'
                  }}>
                    <Icon size={20} />
                  </div>
                  <h3 style={{ fontSize: '1.08rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
                    {s.title}
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: 1.5 }}>
                    {s.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Institutional Accreditations & Trust Banner */}
      <section id="accreditations" style={{ padding: '48px 0', backgroundColor: '#F8F6F2', borderTop: '1px solid #EAE7E0', borderBottom: '1px solid #EAE7E0' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Recognized & Endorsed by National & Global Benchmarks
            </span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '36px'
          }}>
            {[
              { label: 'NAAC A++ Grade', desc: 'Highest National Accreditation' },
              { label: 'UGC & AICTE Approved', desc: 'Statutory Body Compliance' },
              { label: 'QS I-GAUGE Diamond', desc: 'Global Rating Excellence' },
              { label: 'NIRF Top Ranked', desc: 'Ministry of Education, Govt of India' },
              { label: '30 Years Legacy', desc: 'Educational Excellence & Impact' }
            ].map((acc, idx) => (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '1rem',
                  fontWeight: 800,
                  color: '#8B1528',
                  lineHeight: 1.2
                }}>
                  {acc.label}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#78716C', marginTop: '2px' }}>
                  {acc.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campus Footer */}
      <footer id="contact" style={{ backgroundColor: '#1C1917', color: '#D6D3D1', padding: '56px 0 28px 0' }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '40px',
            marginBottom: '40px'
          }}>
            {/* Col 1: University Identity */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#8B1528',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 900
                }}>
                  MR
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  Manav Rachna University
                </div>
              </div>
              <p style={{ fontSize: '0.82rem', color: '#A8A29E', lineHeight: 1.6 }}>
                Institutional Competency Certification Framework (ICCF) — Establishing continuous behavioral development and authenticated credentials for students across all university departments.
              </p>
            </div>

            {/* Col 2: Campus Address */}
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                Campus Location
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: '#A8A29E' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <MapPin size={16} color="#8B1528" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>Sector 43, Aravalli Hills, Delhi-Surajkund Road, Faridabad, Haryana - 121004</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Phone size={14} color="#8B1528" style={{ flexShrink: 0 }} />
                  <span>+91-129-4259000 (ICCF Desk)</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={14} color="#8B1528" style={{ flexShrink: 0 }} />
                  <span>iccf.portal@mru.edu.in</span>
                </div>
              </div>
            </div>

            {/* Col 3: Portal Quick Links */}
            <div>
              <div style={{ fontSize: '0.86rem', fontWeight: 800, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '14px' }}>
                Portal Navigation
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.82rem' }}>
                <button 
                  onClick={() => currentUser ? setView('dashboard') : setView('auth')}
                  style={{ background: 'none', border: 'none', color: '#A8A29E', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
                  onMouseLeave={(e) => e.target.style.color = '#A8A29E'}
                >
                  Student Portal Access
                </button>
                <button 
                  onClick={() => currentUser ? setView('assessment') : setView('auth')}
                  style={{ background: 'none', border: 'none', color: '#A8A29E', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
                  onMouseLeave={(e) => e.target.style.color = '#A8A29E'}
                >
                  150-Item Questionnaire Guidelines
                </button>
                <button 
                  onClick={() => currentUser ? setView('certificate') : setView('auth')}
                  style={{ background: 'none', border: 'none', color: '#A8A29E', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
                  onMouseLeave={(e) => e.target.style.color = '#A8A29E'}
                >
                  Official Certificate Verification
                </button>
                <button 
                  onClick={() => currentUser ? setView('admin') : setView('auth')}
                  style={{ background: 'none', border: 'none', color: '#A8A29E', textAlign: 'left', cursor: 'pointer', padding: 0 }}
                  onMouseEnter={(e) => e.target.style.color = '#FFFFFF'}
                  onMouseLeave={(e) => e.target.style.color = '#A8A29E'}
                >
                  Faculty & Department Moderation
                </button>
              </div>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid #292524',
            paddingTop: '20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            fontSize: '0.74rem',
            color: '#78716C'
          }}>
            <div>
              © 2026 Manav Rachna Educational Institutions (MREI). All Rights Reserved.
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <span>Privacy Policy</span>
              <span>Terms of Assessment</span>
              <span>Honor Code</span>
              <span>University Ethics Charter</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
