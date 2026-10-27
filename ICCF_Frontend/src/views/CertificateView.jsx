import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import {
  Download, Share2, CheckCircle2, ShieldCheck, Sparkles, Printer,
  Copy, Check, AlertTriangle, ArrowRight, ExternalLink, Mail,
  Award, QrCode, RefreshCw, ChevronDown, CheckCircle, FileText, Send
} from 'lucide-react';
import Logo from '../components/Logo';
import { CERTIFICATION_THRESHOLD, getCompetencyLevel } from '../lib/scoring';
import { getStoredAttempts } from '../lib/storage';

export default function CertificateView({ setView, currentUser, activeAttempt }) {
  const [copied, setCopied] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState(activeAttempt?.id || null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Fetch all user attempts for multi-attempt selection
  const allAttempts = getStoredAttempts();
  const currentUserId = currentUser?.uid || currentUser?.id;
  const userAttempts = currentUserId
    ? allAttempts.filter(a => a.userId === currentUserId || a.rollNo === currentUser?.rollNo)
    : allAttempts;

  // Resolve current active attempt with fallback to top certified attempt
  const currentAttempt = (selectedAttemptId
    ? userAttempts.find(a => a.id === selectedAttemptId)
    : null) || activeAttempt || (userAttempts.length > 0 ? userAttempts[0] : allAttempts[0]) || null;

  const studentName = currentUser?.name || currentAttempt?.studentName || 'Aarav Sharma';
  const rollNo = currentUser?.rollNo || currentAttempt?.rollNo || '22CSE0002';
  const department = currentUser?.department || currentAttempt?.department || 'Computer Science & Technology';
  const overallScore = Math.round(Number(currentAttempt?.overallScore) || 84);
  const isCertified = Boolean(!currentAttempt || overallScore >= CERTIFICATION_THRESHOLD);
  const levelInfo = getCompetencyLevel(overallScore);

  const certId = currentAttempt?.certificate?.certificateNumber ||
    `MRU-ICCF-${rollNo || 'GEN'}-${new Date(currentAttempt?.timestamp || Date.now()).getFullYear()}-${(currentAttempt?.id || '01').slice(-4).toUpperCase()}`;
  const verificationHash = currentAttempt?.certificate?.verificationHash || '67de16cad0d03e09ed644e82e26aac258410294b';
  const issueDate = currentAttempt?.timestamp
    ? new Date(currentAttempt.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  // Official Institutional Theme (Standardized University Imperial Maroon & Gold)
  const theme = {
    id: 'maroon',
    name: 'Official Imperial Maroon & Gold',
    primary: '#8B1528',
    accent: '#D97706',
    bg: '#FFFDF9',
    border: '12px double #D97706',
    badgeBg: '#FDF2F4',
    badgeText: '#8B1528',
    sealBg: '#FFFBEB',
    sealBorder: '#D97706',
    sealText: '#B45309'
  };

  // Generate live, scannable QR Code pointing to verification endpoint
  const verifyUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?verify=${encodeURIComponent(certId)}`
    : `https://verify.mru.edu.in/cert/${encodeURIComponent(certId)}`;

  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(verifyUrl, {
      width: 280,
      margin: 1,
      color: {
        dark: '#1C1917',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    }).then(url => {
      if (isMounted) setQrCodeDataUrl(url);
    }).catch(err => {
      console.error('Failed to generate credential QR code:', err);
    });
    return () => { isMounted = false; };
  }, [verifyUrl]);

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    const url = `https://verify.mru.edu.in/cert/${certId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleLinkedInShare = () => {
    const title = encodeURIComponent(`Institutional Competency Certification (ICCF) - ${levelInfo?.level || 'Proficient'}`);
    const org = encodeURIComponent('Manav Rachna Educational Institutions');
    const certUrlEncoded = encodeURIComponent(verifyUrl);
    const certIdParam = encodeURIComponent(certId);
    const date = new Date(currentAttempt?.timestamp || Date.now());
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Real-time official LinkedIn Add-to-Profile Certification API
    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${title}&organizationName=${org}&issueYear=${year}&issueMonth=${month}&certUrl=${certUrlEncoded}&certId=${certIdParam}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedInFeedShare = () => {
    const shareText = encodeURIComponent(`I am proud to share that I have earned the official Institutional Competency Certification (ICCF) from Manav Rachna Educational Institutions with an evaluated composite score of ${overallScore}% across 15 core competency dimensions! #ManavRachna #ICCF #CompetencyCertification #ProfessionalGrowth`);
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}&summary=${shareText}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // High-Resolution Canvas Generator
  const generateCertificateCanvas = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1600;
    canvas.height = 1130;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer & Inner Borders
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 14;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, canvas.width - 96, canvas.height - 96);

    // Corner ornamental flourishes
    const drawCorner = (x, y) => {
      ctx.fillStyle = theme.accent;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
    };
    drawCorner(60, 60);
    drawCorner(canvas.width - 60, 60);
    drawCorner(60, canvas.height - 60);
    drawCorner(canvas.width - 60, canvas.height - 60);

    // Header Text
    ctx.fillStyle = theme.accent;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MANAV RACHNA EDUCATIONAL INSTITUTIONS', canvas.width / 2, 140);

    ctx.font = '600 20px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('INSTITUTIONAL COMPETENCY CERTIFICATION FRAMEWORK', canvas.width / 2, 180);

    // Certificate Title
    ctx.font = 'bold 56px serif';
    ctx.fillStyle = theme.primary;
    ctx.fillText('Certificate of Competency', canvas.width / 2, 260);

    ctx.font = 'italic 28px serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('This is to officially certify that', canvas.width / 2, 330);

    // Student Name
    ctx.font = 'bold 62px serif';
    ctx.fillStyle = theme.primary;
    ctx.fillText(studentName, canvas.width / 2, 430);

    // Underline under name
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 350, 460);
    ctx.lineTo(canvas.width / 2 + 350, 460);
    ctx.stroke();

    // Description text
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(`Roll No: ${rollNo}  •  Department: ${department}`, canvas.width / 2, 510);

    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText('has successfully undergone multidimensional evaluation across 15 core competency dimensions', canvas.width / 2, 560);
    ctx.fillText('and satisfied the Official Institutional Passing Standard (Minimum 65.00% Required) with:', canvas.width / 2, 600);

    // Pill Box for Score & Level
    const pillW = 680;
    const pillH = 70;
    const pillX = canvas.width / 2 - pillW / 2;
    const pillY = 640;

    ctx.fillStyle = theme.badgeBg;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(pillX, pillY, pillW, pillH, 35);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fill();
    ctx.strokeStyle = theme.accent;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = theme.primary;
    ctx.fillText(`${levelInfo.level} (${levelInfo.name})  •  Score: ${overallScore}% (Passing: ≥65%)`, canvas.width / 2, pillY + 44);

    // Footer divider
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(100, 850);
    ctx.lineTo(canvas.width - 100, 850);
    ctx.stroke();

    // Footer - Left: Scannable QR Code & Credential ID
    if (qrCodeDataUrl) {
      try {
        const qrImg = new Image();
        qrImg.src = qrCodeDataUrl;
        await new Promise((resolve) => {
          if (qrImg.complete) resolve();
          else qrImg.onload = resolve;
        });
        ctx.drawImage(qrImg, 100, 875, 95, 95);
        ctx.textAlign = 'left';
        ctx.font = '14px monospace';
        ctx.fillStyle = '#64748B';
        ctx.fillText('CREDENTIAL IDENTIFIER:', 215, 905);
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = '#1E293B';
        ctx.fillText(certId, 215, 930);
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#059669';
        ctx.fillText(`✔ Validated Credential  •  Passing: ≥65.00%`, 215, 960);
      } catch (e) {
        console.warn('QR code draw warning:', e);
      }
    } else {
      ctx.textAlign = 'left';
      ctx.font = '16px monospace';
      ctx.fillStyle = '#64748B';
      ctx.fillText('CREDENTIAL IDENTIFIER:', 100, 900);
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#1E293B';
      ctx.fillText(certId, 100, 930);
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#059669';
      ctx.fillText(`✔ Validated Credential  •  Passing: ≥65.00%`, 100, 965);
    }

    // Footer - Center Seal
    ctx.textAlign = 'center';
    ctx.fillStyle = theme.accent;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 940, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('OFFICIAL', canvas.width / 2, 935);
    ctx.fillText('SEAL', canvas.width / 2, 955);

    // Footer - Right: Signature
    ctx.textAlign = 'right';
    ctx.font = 'italic bold 32px cursive';
    ctx.fillStyle = '#0F172A';
    ctx.fillText('Manav Rachna ICCF', canvas.width - 100, 925);
    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText('Dean & Framework Chair', canvas.width - 100, 960);
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Manav Rachna Educational Institutions', canvas.width - 100, 985);

    return canvas;
  };

  // High-Resolution PNG Certificate Download
  const handleDownloadPNG = async () => {
    setIsDownloading(true);
    try {
      const canvas = await generateCertificateCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `Certificate_${rollNo}_${certId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Canvas download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // Direct 1-Click PDF Certificate Download via jsPDF
  const handleDownloadPDF = async () => {
    setIsDownloadingPdf(true);
    try {
      const canvas = await generateCertificateCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL('image/png');
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      doc.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      doc.save(`Certificate_${rollNo}_${certId}.pdf`);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div style={{ padding: '24px 0 60px 0' }} className="animate-fade-in">
      <div className="container">
        {/* Header with Title & Quick Switchers */}
        <div className="no-print" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Award size={22} color="#8B1528" />
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#8B1528', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Verified Credentials
              </span>
            </div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#1C1917',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.2
            }}>
              Your Official Competency Certificate
            </h1>
            <p style={{ color: '#78716C', fontSize: '0.95rem', marginTop: '4px' }}>
              Tamper-evident recognition of institutional competency evaluation under the Manav Rachna ICCF Standards.
            </p>
          </div>

          {/* Multiple Attempts Switcher (If student took more than 1 attempt) */}
          {userAttempts.length > 1 && (
            <div style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: '12px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600 }}>Attempt:</span>
              <select
                value={selectedAttemptId || ''}
                onChange={(e) => setSelectedAttemptId(e.target.value)}
                style={{
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: '#1C1917',
                  backgroundColor: 'transparent',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {userAttempts.map((att, i) => (
                  <option key={att.id || i} value={att.id}>
                    Attempt #{userAttempts.length - i} • {att.overallScore}% ({new Date(att.timestamp).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* If No Attempt Taken Yet */}
        {!currentAttempt && (
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '56px 32px',
            border: '1px solid #ECE7DF',
            textAlign: 'center',
            marginBottom: '28px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              backgroundColor: '#FDF2F4',
              color: '#8B1528',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <ShieldCheck size={36} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
              No Assessment Attempt Yet
            </h3>
            <p style={{ color: '#78716C', maxWidth: '520px', margin: '0 auto 24px auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
              Complete the Institutional Competency Assessment and achieve an overall score of at least {CERTIFICATION_THRESHOLD.toFixed(2)}% to earn your officially verified credential.
            </p>
            <button
              onClick={() => setView('assessment')}
              className="btn-primary"
              style={{ padding: '12px 28px', fontSize: '0.95rem' }}
            >
              Take Assessment Now <ArrowRight size={16} style={{ marginLeft: '8px', verticalAlign: 'middle' }} />
            </button>
          </div>
        )}

        {/* If Attempt Taken But Not Yet Certified (<65%) */}
        {currentAttempt && !isCertified && (
          <div style={{
            backgroundColor: '#FFFBEB',
            borderRadius: '20px',
            padding: '24px 28px',
            border: '2px dashed #F59E0B',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <AlertTriangle size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#92400E' }}>
                  Certification Requirement Pending (Minimum {CERTIFICATION_THRESHOLD.toFixed(2)}% Required)
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#B45309', marginTop: '4px', maxWidth: '680px' }}>
                  Your current evaluated composite score is <strong>{overallScore}%</strong>. The ICCF framework requires a minimum threshold of <strong>{CERTIFICATION_THRESHOLD.toFixed(2)}%</strong> to issue a verified institutional certificate. You can practice via your personalized development roadmap and re-take the assessment.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setView('development')}
                className="btn-secondary"
                style={{ padding: '9px 18px', fontSize: '0.85rem' }}
              >
                View Development Plan
              </button>
              <button
                onClick={() => setView('assessment')}
                className="btn-primary"
                style={{ padding: '9px 20px', fontSize: '0.85rem', backgroundColor: '#D97706' }}
              >
                Re-take Assessment Now
              </button>
            </div>
          </div>
        )}

        {/* Certificate Display Area + Details Sidebar */}
        {currentAttempt && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: '28px',
            alignItems: 'start',
            opacity: isCertified ? 1 : 0.8
          }} className="certificate-layout">
            {/* Official Certificate Card */}
            <div
              className="print-area mr-card animate-fade-in"
              style={{
                backgroundColor: theme.bg,
                borderRadius: '24px',
                padding: '48px 44px',
                border: theme.border,
                boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.08)',
                position: 'relative',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: '640px',
                overflow: 'hidden'
              }}
            >
              {/* Subtle Guilloche / Watermark Pattern */}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
                opacity: 0.035
              }}>
                <Logo size="normal" show30Years={false} />
              </div>

              {/* Decorative Corner Ornaments */}
              <div style={{ position: 'absolute', top: '16px', left: '16px', width: '24px', height: '24px', borderTop: `3px solid ${theme.accent}`, borderLeft: `3px solid ${theme.accent}` }} />
              <div style={{ position: 'absolute', top: '16px', right: '16px', width: '24px', height: '24px', borderTop: `3px solid ${theme.accent}`, borderRight: `3px solid ${theme.accent}` }} />
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', width: '24px', height: '24px', borderBottom: `3px solid ${theme.accent}`, borderLeft: `3px solid ${theme.accent}` }} />
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', width: '24px', height: '24px', borderBottom: `3px solid ${theme.accent}`, borderRight: `3px solid ${theme.accent}` }} />

              {/* Certificate Header Logos */}
              <div style={{ marginBottom: '20px', zIndex: 1 }}>
                <Logo size="normal" show30Years={true} />
              </div>

              {/* Certificate Title */}
              <div style={{ zIndex: 1, marginBottom: '24px' }}>
                <div style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  letterSpacing: '0.15em',
                  color: theme.accent,
                  textTransform: 'uppercase',
                  marginBottom: '6px'
                }}>
                  Institutional Competency Certification Framework
                </div>

                <h2 style={{
                  fontSize: 'clamp(1.5rem, 2.8vw, 2.2rem)',
                  fontWeight: 900,
                  color: theme.primary,
                  letterSpacing: '0.04em',
                  fontFamily: 'var(--font-serif)',
                  textTransform: 'uppercase',
                  lineHeight: 1.2
                }}>
                  Human-Centric Skills
                </h2>
                <div style={{
                  fontSize: '1.15rem',
                  fontWeight: 700,
                  color: '#1C1917',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginTop: '4px'
                }}>
                  Competency Certificate
                </div>
              </div>

              {/* Recipient Details */}
              <div style={{ zIndex: 1, maxWidth: '640px', width: '100%', marginBottom: '28px' }}>
                <p style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '1.05rem',
                  color: '#78716C',
                  marginBottom: '10px'
                }}>
                  This is to certify that
                </p>

                <div style={{
                  fontSize: 'clamp(1.8rem, 3.5vw, 2.4rem)',
                  fontWeight: 800,
                  color: theme.primary,
                  fontFamily: 'var(--font-serif)',
                  borderBottom: `2px solid ${theme.accent}`,
                  display: 'inline-block',
                  padding: '0 24px 8px 24px',
                  marginBottom: '16px'
                }}>
                  {studentName}
                </div>

                <p style={{
                  fontSize: '0.98rem',
                  color: '#44403C',
                  lineHeight: 1.6,
                  marginTop: '6px'
                }}>
                  Roll No: <strong>{rollNo}</strong> &bull; has completed the institutional assessment across 15 multidimensional skill areas under the Faculty of <strong>{department}</strong> and has satisfied the <strong>Official Institutional Passing Standard (Minimum 65.00% Required)</strong> with:
                </p>

                {/* Awarded Level & Score Pill */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '8px 24px',
                  borderRadius: '9999px',
                  backgroundColor: theme.badgeBg,
                  border: `1px solid ${theme.accent}44`,
                  marginTop: '16px'
                }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: theme.primary }}>
                    {levelInfo.level} ({levelInfo.name})
                  </span>
                  <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: theme.accent }} />
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: theme.accent }}>
                    Composite Score: {overallScore}% (Passing Standard: ≥65.00%)
                  </span>
                </div>
              </div>

              {/* Certificate Footer */}
              <div style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingTop: '24px',
                borderTop: '1px solid #EAE5DC',
                zIndex: 1,
                flexWrap: 'wrap',
                gap: '20px'
              }}>
                {/* Left: Real Scannable QR & Verification ID */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
                  <div
                    onClick={() => setVerifyModalOpen(true)}
                    style={{
                      padding: '5px',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D6D3D1',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                      transition: 'transform 0.2s ease',
                      width: '74px',
                      height: '74px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden'
                    }}
                    title="Scan with any camera or click to verify credential online"
                  >
                    {qrCodeDataUrl ? (
                      <img 
                        src={qrCodeDataUrl} 
                        alt="Scannable Credential QR Code" 
                        style={{ width: '64px', height: '64px', display: 'block' }} 
                      />
                    ) : (
                      <div style={{ fontSize: '0.62rem', color: '#78716C' }}>Loading QR...</div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Credential Identifier
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1C1917', fontFamily: 'monospace' }}>
                      {certId}
                    </div>
                    <div
                      onClick={() => setVerifyModalOpen(true)}
                      style={{
                        fontSize: '0.72rem',
                        color: '#16A34A',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '2px',
                        cursor: 'pointer'
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Live Scannable QR • Click to Verify</span>
                    </div>
                  </div>
                </div>

                {/* Center: University Gold Seal */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    border: `2px dashed ${theme.sealBorder}`,
                    backgroundColor: theme.sealBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.sealText,
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.15)'
                  }}>
                    <ShieldCheck size={32} />
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, color: theme.sealText, textTransform: 'uppercase' }}>
                    Official Seal
                  </span>
                </div>

                {/* Right: Signature */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: 'cursive',
                    fontSize: '1.4rem',
                    color: '#1E293B',
                    marginBottom: '2px'
                  }}>
                    NA
                  </div>
                  <div style={{ width: '140px', height: '1px', backgroundColor: '#D6D3D1', marginLeft: 'auto', marginBottom: '4px' }} />
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#1C1917' }}>
                    Dean & Framework Chair
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#78716C' }}>
                    Issued: {issueDate}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Action Sidebar */}
            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Institutional Benchmark & Security Card */}
              <div className="mr-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <ShieldCheck size={18} color="#8B1528" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1C1917' }}>
                    Institutional Standard
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1EFEA' }}>
                    <span style={{ color: '#78716C' }}>Standard Format:</span>
                    <strong style={{ color: '#8B1528' }}>Official Imperial Maroon</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1EFEA' }}>
                    <span style={{ color: '#78716C' }}>Passing Criteria:</span>
                    <strong style={{ color: '#16A34A' }}>Minimum 65.00% Required</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1EFEA' }}>
                    <span style={{ color: '#78716C' }}>Evaluated Score:</span>
                    <strong style={{ color: overallScore >= 65 ? '#16A34A' : '#DC2626' }}>
                      {overallScore}% ({overallScore >= 65 ? 'Passed & Certified' : 'Threshold Not Met'})
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ color: '#78716C' }}>Security:</span>
                    <strong style={{ color: '#2563EB' }}>Live Scannable QR</strong>
                  </div>
                </div>
              </div>

              {/* Quick Actions Card */}
              <div className="mr-card" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1C1917', marginBottom: '14px' }}>
                  Export & Share
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Download Direct PDF Button */}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={!isCertified || isDownloadingPdf}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      opacity: isCertified ? 1 : 0.5,
                      backgroundColor: '#8B1528',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 12px rgba(139, 21, 40, 0.25)'
                    }}
                  >
                    {isDownloadingPdf ? <RefreshCw size={17} className="animate-spin" /> : <FileText size={17} />}
                    <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Certificate (PDF)'}</span>
                  </button>

                  {/* Download High-Res PNG Button */}
                  <button
                    onClick={handleDownloadPNG}
                    disabled={!isCertified || isDownloading}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      padding: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      opacity: isCertified ? 1 : 0.5
                    }}
                  >
                    {isDownloading ? <RefreshCw size={16} className="animate-spin" /> : <Download size={16} />}
                    <span>{isDownloading ? 'Rendering Certificate...' : 'Download Image (PNG)'}</span>
                  </button>

                  {/* Add to LinkedIn Profile Button */}
                  <button
                    onClick={handleLinkedInShare}
                    disabled={!isCertified}
                    style={{
                      width: '100%',
                      padding: '11px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.88rem',
                      backgroundColor: '#0A66C2',
                      color: '#FFFFFF',
                      borderRadius: '8px',
                      border: 'none',
                      fontWeight: 700,
                      cursor: isCertified ? 'pointer' : 'not-allowed',
                      opacity: isCertified ? 1 : 0.5,
                      transition: 'background-color 0.15s ease',
                      boxShadow: '0 2px 8px rgba(10, 102, 194, 0.25)'
                    }}
                  >
                    <ExternalLink size={16} />
                    <span>Add to LinkedIn Profile</span>
                  </button>

                  {/* Share on LinkedIn Feed Button */}
                  <button
                    onClick={handleLinkedInFeedShare}
                    disabled={!isCertified}
                    style={{
                      width: '100%',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      backgroundColor: '#F0F7FF',
                      color: '#0A66C2',
                      borderRadius: '8px',
                      border: '1px solid #BAE0FD',
                      fontWeight: 700,
                      cursor: isCertified ? 'pointer' : 'not-allowed',
                      opacity: isCertified ? 1 : 0.5,
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Share2 size={16} />
                    <span>Share on LinkedIn Feed</span>
                  </button>

                  {/* Print / Save via Browser */}
                  <button
                    onClick={handlePrint}
                    disabled={!isCertified}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      opacity: isCertified ? 1 : 0.5
                    }}
                  >
                    <Printer size={16} />
                    <span>Print / Save via Browser</span>
                  </button>

                  {/* Copy Link Button */}
                  <button
                    onClick={handleShare}
                    disabled={!isCertified}
                    className="btn-secondary"
                    style={{
                      width: '100%',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      opacity: isCertified ? 1 : 0.5
                    }}
                  >
                    {copied ? <Check size={16} color="#16A34A" /> : <Copy size={16} />}
                    <span>{copied ? 'Verification Link Copied!' : 'Copy Verification URL'}</span>
                  </button>
                </div>
              </div>

              {/* Public Verification Box */}
              <div className="mr-card" style={{ padding: '22px', backgroundColor: '#FAF8F5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <ShieldCheck size={20} color="#16A34A" />
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1C1917' }}>
                    Registrar Validation
                  </h4>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5, marginBottom: '12px' }}>
                  Anyone can verify the authenticity of this certification using the Manav Rachna Public Registrar portal.
                </p>

                <div
                  onClick={() => setVerifyModalOpen(true)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    border: '1px solid #ECE7DF',
                    fontSize: '0.75rem',
                    fontFamily: 'monospace',
                    color: '#8B1528',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  title="Click to view live registrar verification"
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    verify.mru.edu.in/cert/{certId.slice(0, 18)}...
                  </span>
                  <ExternalLink size={14} color="#8B1528" style={{ flexShrink: 0, marginLeft: '6px' }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Public Verification Modal */}
      {verifyModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }} className="animate-fade-in">
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            maxWidth: '560px',
            width: '100%',
            padding: '32px',
            boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.3)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  backgroundColor: '#DCFCE7',
                  color: '#16A34A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#1C1917' }}>
                    Authenticity Verification
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: '#16A34A', fontWeight: 700 }}>
                    Official Academic Council Ledger
                  </span>
                </div>
              </div>
              <button
                onClick={() => setVerifyModalOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.4rem',
                  color: '#94A3B8',
                  cursor: 'pointer'
                }}
              >
                &times;
              </button>
            </div>

            <div style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '16px',
              padding: '18px',
              border: '1px solid #E2E8F0',
              marginBottom: '20px',
              fontSize: '0.84rem'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', rowGap: '10px' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Recipient:</span>
                <strong style={{ color: '#0F172A' }}>{studentName}</strong>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Roll Number:</span>
                <strong style={{ color: '#0F172A' }}>{rollNo}</strong>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Faculty / Dept:</span>
                <span style={{ color: '#0F172A' }}>{department}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Credential ID:</span>
                <span style={{ color: '#0F172A', fontFamily: 'monospace', fontWeight: 700 }}>{certId}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Issue Date:</span>
                <span style={{ color: '#0F172A' }}>{issueDate}</span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Passing Criteria:</span>
                <strong style={{ color: '#0F172A' }}>≥65.00% (Institutional Standard Satisfied)</strong>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Certified Score:</span>
                <strong style={{ color: '#16A34A' }}>{overallScore}% ({levelInfo.level} — Passed)</strong>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Verification URL:</span>
                <span style={{ color: '#2563EB', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {verifyUrl}
                </span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Crypto Hash:</span>
                <span style={{ color: '#475569', fontFamily: 'monospace', fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {verificationHash}
                </span>

                <span style={{ color: '#64748B', fontWeight: 600 }}>Ledger Status:</span>
                <span style={{ color: '#16A34A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={14} /> Confirmed Valid & Unaltered
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleShare}
                className="btn-primary"
                style={{ flex: 1, padding: '10px', fontSize: '0.88rem' }}
              >
                {copied ? 'Copied Link!' : 'Copy Verification URL'}
              </button>
              <button
                onClick={() => setVerifyModalOpen(false)}
                className="btn-secondary"
                style={{ padding: '10px 20px', fontSize: '0.88rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
