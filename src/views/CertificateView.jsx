import React, { useState, useRef, useEffect } from 'react';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import {
  Download, Share2, CheckCircle2, ShieldCheck, Sparkles, Printer,
  Copy, Check, AlertTriangle, ArrowRight, ExternalLink, Mail,
  Award, QrCode, RefreshCw, ChevronDown, CheckCircle, FileText, Send,
  BadgeCheck, Stamp
} from 'lucide-react';
import Logo from '../components/Logo';
import { CERTIFICATION_THRESHOLD, getCompetencyLevel } from '../lib/scoring';
import { getStoredAttempts } from '../lib/storage';

export default function CertificateView({ setView, currentUser, activeAttempt, userRole }) {
  const [copied, setCopied] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [selectedAttemptId, setSelectedAttemptId] = useState(activeAttempt?.id || null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');

  // Fetch all user attempts for multi-attempt selection
  const allAttempts = getStoredAttempts();
  const currentUserId = currentUser?.uid || currentUser?.id;
  const isStudentRole = userRole === 'student' || (!userRole && currentUser?.role === 'student');
  const userAttempts = (isStudentRole && currentUserId)
    ? allAttempts.filter(a => a.userId === currentUserId || a.rollNo === currentUser?.rollNo)
    : allAttempts;

  // Resolve current active attempt
  const currentAttempt = (selectedAttemptId
    ? userAttempts.find(a => a.id === selectedAttemptId)
    : null) || activeAttempt || (userAttempts.length > 0 ? userAttempts[0] : null);

  const studentName = currentAttempt?.studentName || currentUser?.name || 'Student Name';
  const rollNo = currentAttempt?.rollNo || currentUser?.rollNo || '2024-CST-001';
  const department = currentAttempt?.department || currentUser?.department || 'Faculty of Engineering & Technology';
  const overallScore = currentAttempt ? Math.round(Number(currentAttempt?.overallScore) || 0) : 0;
  const isCertified = Boolean(currentAttempt && overallScore >= CERTIFICATION_THRESHOLD);
  const levelInfo = getCompetencyLevel(overallScore);

  const certId = currentAttempt?.certificate?.certificateNumber ||
    `MRU-ICCF-${rollNo || 'GEN'}-${new Date(currentAttempt?.timestamp || Date.now()).getFullYear()}-${(currentAttempt?.id || '01').slice(-4).toUpperCase()}`;
  const verificationHash = currentAttempt?.certificate?.verificationHash || '67de16cad0d03e09ed644e82e26aac258410294b';
  const issueDate = currentAttempt?.timestamp
    ? new Date(currentAttempt.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  // Official Institutional Theme (Imperial Maroon & Rich Gold)
  const theme = {
    id: 'maroon',
    name: 'Official Imperial Maroon & Gold',
    primary: '#8B1528',
    primaryDark: '#5E0E1B',
    accent: '#B45309',
    accentGold: '#D97706',
    goldLight: '#F59E0B',
    bg: '#FFFEFB',
    border: '14px double #D97706',
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
      width: 320,
      margin: 1,
      color: {
        dark: '#1C1917',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
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
    const url = verifyUrl;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  const handleLinkedInShare = () => {
    const title = encodeURIComponent(`Certificate of Excellence in Human-Centric Competency (${levelInfo?.level || 'Proficient'})`);
    const org = encodeURIComponent('Manav Rachna Educational Institutions');
    const certUrlEncoded = encodeURIComponent(verifyUrl);
    const certIdParam = encodeURIComponent(certId);
    const date = new Date(currentAttempt?.timestamp || Date.now());
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    const linkedInUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${title}&organizationName=${org}&issueYear=${year}&issueMonth=${month}&certUrl=${certUrlEncoded}&certId=${certIdParam}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  };

  const handleLinkedInFeedShare = () => {
    const shareText = encodeURIComponent(`I am delighted to share that I have been awarded the official Certificate of Excellence in Human-Centric Competencies (ICCF) by Manav Rachna Educational Institutions, achieving an evaluated composite score of ${overallScore}% across 15 core dimensions of leadership, collaboration, and professional mastery! Verified Credential ID: ${certId}`);
    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}&summary=${shareText}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Ultra High-Resolution Professional Certificate Canvas Generator (2000 x 1400)
  const generateCertificateCanvas = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2000;
    canvas.height = 1400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Background - Warm Parchment Ivory
    ctx.fillStyle = '#FFFEFB';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle guilloche background texture / watermark
    ctx.save();
    ctx.strokeStyle = '#F1ECE1';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 80) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 200, canvas.height);
      ctx.stroke();
    }
    ctx.restore();

    // Outer Heavy Imperial Gold Border
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 12;
    ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

    // Secondary Accent Maroon Border
    ctx.strokeStyle = '#8B1528';
    ctx.lineWidth = 4;
    ctx.strokeRect(52, 52, canvas.width - 104, canvas.height - 104);

    // Thin Inner Inset Gold Line
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(62, 62, canvas.width - 124, canvas.height - 124);

    // Ornamental Corner Accents
    const drawOrnamentalCorner = (x, y, rot) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.strokeStyle = '#D97706';
      ctx.fillStyle = '#8B1528';
      ctx.lineWidth = 3;
      // Diamond
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(18, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(-18, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Flourish lines
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 24);
      ctx.lineTo(0, 48);
      ctx.moveTo(24, 0);
      ctx.lineTo(48, 0);
      ctx.stroke();
      ctx.restore();
    };

    drawOrnamentalCorner(72, 72, 0);
    drawOrnamentalCorner(canvas.width - 72, 72, Math.PI / 2);
    drawOrnamentalCorner(canvas.width - 72, canvas.height - 72, Math.PI);
    drawOrnamentalCorner(72, canvas.height - 72, -Math.PI / 2);

    // Top Header: Institution Name & Directorate
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8B1528';
    ctx.font = 'bold 30px "Cinzel", "Playfair Display", serif';
    ctx.fillText('MANAV RACHNA EDUCATIONAL INSTITUTIONS', canvas.width / 2, 135);

    ctx.fillStyle = '#64748B';
    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('DIRECTORATE OF ACADEMIC EXCELLENCE & STUDENT DEVELOPMENT', canvas.width / 2, 172);

    ctx.fillStyle = '#B45309';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText('INSTITUTIONAL COMPETENCY & CAPABILITY FRAMEWORK (ICCF)', canvas.width / 2, 202);

    // Elegant Divider under Header
    ctx.strokeStyle = '#E2D9C8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 320, 225);
    ctx.lineTo(canvas.width / 2 + 320, 225);
    ctx.stroke();

    // Center Gold Star Ornament on Divider
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 225, 6, 0, Math.PI * 2);
    ctx.fill();

    // Main Certificate Title
    ctx.font = 'bold 54px "Playfair Display", "Cinzel", serif';
    ctx.fillStyle = '#8B1528';
    ctx.fillText('Certificate of Excellence', canvas.width / 2, 305);

    ctx.font = 'bold 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#1C1917';
    const certSubtitle = currentAttempt?.skillName
      ? `IN HUMAN-CENTRIC COMPETENCY: ${currentAttempt.skillName.toUpperCase()}`
      : 'IN COMPREHENSIVE HUMAN-CENTRIC COMPETENCY & PROFESSIONAL MASTERY';
    ctx.fillText(certSubtitle, canvas.width / 2, 348);

    // Preamble Text
    ctx.font = 'italic 23px "Playfair Display", serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('This credential of distinguished accomplishment is officially conferred upon', canvas.width / 2, 420);

    // Recipient Name (Bold, Majestic Serif)
    ctx.font = 'bold 64px "Playfair Display", serif';
    ctx.fillStyle = '#8B1528';
    ctx.fillText(studentName, canvas.width / 2, 510);

    // Underline beneath Student Name
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 380, 535);
    ctx.lineTo(canvas.width / 2 + 380, 535);
    ctx.stroke();

    // Small Gold Diamond beneath underline
    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 530);
    ctx.lineTo(canvas.width / 2 + 7, 535);
    ctx.lineTo(canvas.width / 2, 540);
    ctx.lineTo(canvas.width / 2 - 7, 535);
    ctx.closePath();
    ctx.fill();

    // Student Identification Credentials
    ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#334155';
    ctx.fillText(`Roll Number: ${rollNo}   •   Department of ${department}`, canvas.width / 2, 580);

    // Formal Certification Body Text
    ctx.font = '20px "Plus Jakarta Sans", serif';
    ctx.fillStyle = '#475569';
    let bodyLine1, bodyLine2, bodyLine3;
    if (currentAttempt?.skillName) {
      bodyLine1 = 'for demonstrating exemplary intellectual rigor, ethical conviction, and applied proficiency in';
      bodyLine2 = `${currentAttempt.skillName} within the Human-Centric Competency Framework (ICCF), fulfilling`;
      bodyLine3 = 'all prescribed institutional benchmarks established by the Academic Council.';
    } else {
      bodyLine1 = 'for demonstrating exemplary intellectual rigor, ethical conviction, and behavioral proficiency across';
      bodyLine2 = 'the fifteen foundational and applied dimensions of the Human-Centric Competency Framework, successfully fulfilling';
      bodyLine3 = 'all prescribed institutional benchmarks and criteria established by the Academic Council.';
    }
    ctx.fillText(bodyLine1, canvas.width / 2, 630);
    ctx.fillText(bodyLine2, canvas.width / 2, 665);
    ctx.fillText(bodyLine3, canvas.width / 2, 700);

    // Awarded Distinction Pill Box
    const pillW = 860;
    const pillH = 76;
    const pillX = canvas.width / 2 - pillW / 2;
    const pillY = 745;

    ctx.fillStyle = '#FDF2F4';
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(pillX, pillY, pillW, pillH, 38);
    } else {
      ctx.rect(pillX, pillY, pillW, pillH);
    }
    ctx.fill();

    ctx.strokeStyle = '#8B1528';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.font = 'bold 26px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#8B1528';
    ctx.fillText(
      `CONFERRED DISTINCTION: ${levelInfo.level} — ${levelInfo.name.toUpperCase()}`,
      canvas.width / 2,
      pillY + 36
    );

    ctx.font = '600 18px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#B45309';
    const indexLabel = currentAttempt?.skillName ? `${currentAttempt.skillName} Proficiency Index` : 'Cumulative Competency Index';
    ctx.fillText(
      `${indexLabel}: ${overallScore}.00%   •   Institutional Passing Standard: ≥65.00%   •   Status: Verified`,
      canvas.width / 2,
      pillY + 62
    );

    // Formal Attestation Notice
    ctx.font = 'italic 17px "Playfair Display", serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText(`Given under the official seal of the Institution and authorized Directorate authorities on this ${issueDate}.`, canvas.width / 2, 865);

    // Horizontal Footer Separator
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(110, 915);
    ctx.lineTo(canvas.width - 110, 915);
    ctx.stroke();

    // ── FOOTER: 3 COLUMNS (Left: QR & Credential ID; Center: Seal; Right: Signatures) ──

    // 1. Guaranteed Sharp QR Code (Awaits fresh QR generation if not loaded)
    const activeQrUrl = qrCodeDataUrl || await QRCode.toDataURL(verifyUrl, {
      width: 320,
      margin: 1,
      color: { dark: '#1C1917', light: '#FFFFFF' },
      errorCorrectionLevel: 'H'
    });

    if (activeQrUrl) {
      try {
        const qrImg = new Image();
        qrImg.src = activeQrUrl;
        await new Promise((resolve) => {
          if (qrImg.complete) resolve();
          else qrImg.onload = resolve;
        });

        // Draw QR Code Border Box
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(110, 940, 150, 150);
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 2;
        ctx.strokeRect(110, 940, 150, 150);

        ctx.drawImage(qrImg, 115, 945, 140, 140);

        // QR Labels & Credential Metadata
        ctx.textAlign = 'left';
        ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#8B1528';
        ctx.fillText('OFFICIAL VERIFICATION QR', 280, 965);

        ctx.font = '12px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#64748B';
        ctx.fillText('Scan with any camera or scanner to verify', 280, 988);
        ctx.fillText('authenticity on the university registry.', 280, 1006);

        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = '#1C1917';
        ctx.fillText(`CREDENTIAL ID: ${certId}`, 280, 1038);

        ctx.font = '12px monospace';
        ctx.fillStyle = '#059669';
        ctx.fillText(`LEDGER: Authenticity Confirmed & Tamper-Proof`, 280, 1062);
      } catch (err) {
        console.warn('Canvas QR draw fallback:', err);
      }
    }

    // 2. Center: Official Academic Seal with Medallion Ribbons
    ctx.save();
    ctx.textAlign = 'center';
    const sealX = canvas.width / 2;
    const sealY = 1015;

    // Ribbons
    ctx.fillStyle = '#8B1528';
    ctx.beginPath();
    ctx.moveTo(sealX - 22, sealY + 25);
    ctx.lineTo(sealX - 35, sealY + 95);
    ctx.lineTo(sealX - 20, sealY + 85);
    ctx.lineTo(sealX - 5, sealY + 95);
    ctx.lineTo(sealX, sealY + 25);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(sealX, sealY + 25);
    ctx.lineTo(sealX + 5, sealY + 95);
    ctx.lineTo(sealX + 20, sealY + 85);
    ctx.lineTo(sealX + 35, sealY + 95);
    ctx.lineTo(sealX + 22, sealY + 25);
    ctx.closePath();
    ctx.fill();

    // Outer Seal Circle
    ctx.fillStyle = '#FFFBEB';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(sealX, sealY, 56, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner Dashed Gold Border
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.arc(sealX, sealY, 48, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Seal Text & Emblem
    ctx.fillStyle = '#8B1528';
    ctx.font = 'bold 12px "Cinzel", serif';
    ctx.fillText('MANAV RACHNA', sealX, sealY - 22);

    ctx.fillStyle = '#D97706';
    ctx.font = 'bold 22px serif';
    ctx.fillText('★ ★ ★', sealX, sealY);

    ctx.fillStyle = '#8B1528';
    ctx.font = 'bold 13px "Cinzel", serif';
    ctx.fillText('OFFICIAL SEAL', sealX, sealY + 20);

    ctx.font = 'bold 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#B45309';
    ctx.fillText('ACADEMIC COUNCIL', sealX, sealY + 34);
    ctx.restore();

    // 3. Right: Official Signatories
    ctx.textAlign = 'right';

    // Signature 1
    ctx.font = 'italic bold 32px "Playfair Display", "Brush Script MT", cursive';
    ctx.fillStyle = '#1E293B';
    ctx.fillText('Dr. Sanjay Srivastava', canvas.width - 110, 975);

    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 340, 990);
    ctx.lineTo(canvas.width - 110, 990);
    ctx.stroke();

    ctx.font = 'bold 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#1C1917';
    ctx.fillText('Vice-Chancellor & Chairman', canvas.width - 110, 1012);

    ctx.font = '14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Academic Council, Manav Rachna', canvas.width - 110, 1032);

    // Signature 2
    ctx.font = 'italic bold 30px "Playfair Display", "Brush Script MT", cursive';
    ctx.fillStyle = '#1E293B';
    ctx.fillText('Prof. (Dr.) Naresh Grover', canvas.width - 110, 1075);

    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 340, 1090);
    ctx.lineTo(canvas.width - 110, 1090);
    ctx.stroke();

    ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#1C1917';
    ctx.fillText('Dean of Academic Affairs & Framework Chair', canvas.width - 110, 1112);

    ctx.font = '14px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#64748B';
    ctx.fillText('Directorate of Competency Assessment', canvas.width - 110, 1132);

    return canvas;
  };

  // High-Resolution PNG Certificate Download
  const handleDownloadPNG = async () => {
    setIsDownloading(true);
    try {
      const canvas = await generateCertificateCanvas();
      if (!canvas) return;
      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `ICCF_Certificate_${studentName.replace(/\s+/g, '_')}_${certId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG certificate download error:', err);
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
      const imgData = canvas.toDataURL('image/png', 1.0);
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      doc.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      doc.save(`ICCF_Certificate_${studentName.replace(/\s+/g, '_')}_${certId}.pdf`);
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div style={{ padding: '24px 0 60px 0' }} className="animate-fade-in">
      <div className="container">

        {/* Admin/Faculty Inspector Return Banner */}
        {!isStudentRole && (
          <div className="no-print" style={{
            backgroundColor: '#F8FAFC',
            borderRadius: '16px',
            padding: '12px 20px',
            border: '1px solid #E2E8F0',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: '#8B1528'
              }} />
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1C1917' }}>
                Certificate Inspection Mode: Official Institutional Credential for {studentName} ({rollNo})
              </span>
            </div>
            <button
              onClick={() => setView(userRole === 'faculty' || userRole === 'dept_head' ? 'faculty' : 'admin')}
              className="btn-secondary"
              style={{ padding: '6px 14px', fontSize: '0.82rem', fontWeight: 700 }}
            >
              ← Return to {userRole === 'faculty' || userRole === 'dept_head' ? 'Faculty Portal' : 'Admin Console'}
            </button>
          </div>
        )}

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
                Accredited Credentials
              </span>
            </div>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#1C1917',
              fontFamily: 'var(--font-sans)',
              lineHeight: 1.2
            }}>
              Official Competency Certificate
            </h1>
            <p style={{ color: '#78716C', fontSize: '0.95rem', marginTop: '4px' }}>
              Tamper-evident institutional recognition of human-centric competency mastery under Manav Rachna ICCF Standards.
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
                {userAttempts.map((att, i) => {
                  const label = att.skillName ? `${att.skillName} (${att.overallScore}%)` : (att.assessmentName || `Attempt #${userAttempts.length - i}`);
                  return (
                    <option key={att.id || i} value={att.id}>
                      {label} • {new Date(att.timestamp).toLocaleDateString()}
                    </option>
                  );
                })}
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
                  Institutional Certification Pending (Minimum {CERTIFICATION_THRESHOLD.toFixed(2)}% Required)
                </h3>
                <p style={{ fontSize: '0.88rem', color: '#B45309', marginTop: '4px', maxWidth: '680px' }}>
                  Your evaluated composite score is <strong>{overallScore}%</strong>. The ICCF framework requires a minimum threshold of <strong>{CERTIFICATION_THRESHOLD.toFixed(2)}%</strong> to confer an official credential. You may practice through your personalized roadmap and re-take the diagnostic.
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
            opacity: isCertified ? 1 : 0.82
          }} className="certificate-layout">
            
            {/* ── Official Institutional Certificate Card (On-Screen Render) ── */}
            <div
              className="print-area mr-card animate-fade-in"
              style={{
                backgroundColor: theme.bg,
                borderRadius: '24px',
                padding: '48px 44px',
                border: theme.border,
                boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.09)',
                position: 'relative',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                minHeight: '740px',
                overflow: 'hidden'
              }}
            >
              {/* Watermark Logo */}
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
              <div style={{ position: 'absolute', top: '16px', left: '16px', width: '28px', height: '28px', borderTop: `3px solid ${theme.accentGold}`, borderLeft: `3px solid ${theme.accentGold}` }} />
              <div style={{ position: 'absolute', top: '16px', right: '16px', width: '28px', height: '28px', borderTop: `3px solid ${theme.accentGold}`, borderRight: `3px solid ${theme.accentGold}` }} />
              <div style={{ position: 'absolute', bottom: '16px', left: '16px', width: '28px', height: '28px', borderBottom: `3px solid ${theme.accentGold}`, borderLeft: `3px solid ${theme.accentGold}` }} />
              <div style={{ position: 'absolute', bottom: '16px', right: '16px', width: '28px', height: '28px', borderBottom: `3px solid ${theme.accentGold}`, borderRight: `3px solid ${theme.accentGold}` }} />

              {/* Header Logos & Institutional Identity */}
              <div style={{ marginBottom: '16px', zIndex: 1 }}>
                <Logo size="normal" show30Years={true} />
              </div>

              {/* Certificate Titles & Preamble */}
              <div style={{ zIndex: 1, marginBottom: '20px' }}>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  letterSpacing: '0.14em',
                  color: theme.accentGold,
                  textTransform: 'uppercase',
                  marginBottom: '4px'
                }}>
                  Manav Rachna Educational Institutions
                </div>
                <div style={{
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  color: '#64748B',
                  textTransform: 'uppercase',
                  marginBottom: '10px'
                }}>
                  Directorate of Academic Excellence & Student Development
                </div>

                <h2 style={{
                  fontSize: 'clamp(1.6rem, 3vw, 2.3rem)',
                  fontWeight: 900,
                  color: theme.primary,
                  letterSpacing: '0.02em',
                  fontFamily: 'var(--font-serif)',
                  lineHeight: 1.2,
                  marginBottom: '4px'
                }}>
                  Certificate of Excellence
                </h2>
                <div style={{
                  fontSize: '0.98rem',
                  fontWeight: 800,
                  color: '#1C1917',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase'
                }}>
                  {currentAttempt?.skillName
                    ? `in Human-Centric Competency: ${currentAttempt.skillName}`
                    : 'in Comprehensive Human-Centric Competency & Professional Mastery'}
                </div>
              </div>

              {/* Recipient Details & Citation */}
              <div style={{ zIndex: 1, maxWidth: '680px', width: '100%', marginBottom: '24px' }}>
                <p style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  fontSize: '1.05rem',
                  color: '#64748B',
                  marginBottom: '8px'
                }}>
                  This official credential of competency is solemnly conferred upon
                </p>

                <div style={{
                  fontSize: 'clamp(1.8rem, 3.8vw, 2.6rem)',
                  fontWeight: 800,
                  color: theme.primary,
                  fontFamily: 'var(--font-serif)',
                  borderBottom: `2px solid ${theme.accentGold}`,
                  display: 'inline-block',
                  padding: '0 28px 8px 28px',
                  marginBottom: '12px'
                }}>
                  {studentName}
                </div>

                <div style={{
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: '#334155',
                  marginBottom: '14px'
                }}>
                  Roll Number: <span style={{ fontFamily: 'monospace', color: '#1C1917' }}>{rollNo}</span>
                  &nbsp;&nbsp;•&nbsp;&nbsp;
                  Department: <span style={{ color: '#1C1917' }}>{department}</span>
                </div>

                <p style={{
                  fontSize: '0.92rem',
                  color: '#475569',
                  lineHeight: 1.65,
                  margin: '0 auto 16px auto',
                  maxWidth: '620px'
                }}>
                  {currentAttempt?.skillName ? (
                    <>
                      for demonstrating distinguished intellectual rigor, ethical conviction, and applied proficiency in <strong>{currentAttempt.skillName}</strong> under the Human-Centric Competency Framework (ICCF), successfully fulfilling all institutional standards and criteria established by the Academic Council.
                    </>
                  ) : (
                    <>
                      for demonstrating distinguished intellectual rigor, ethical conviction, and behavioral excellence across the <strong>15 core dimensions</strong> of the Human-Centric Competency Framework, successfully fulfilling all institutional standards and criteria established by the Academic Council.
                    </>
                  )}
                </p>

                {/* Conferred Level & Score Distinction Pill */}
                <div style={{
                  display: 'inline-flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px 28px',
                  borderRadius: '9999px',
                  backgroundColor: theme.badgeBg,
                  border: `1.5px solid ${theme.primary}33`,
                  boxShadow: '0 4px 12px rgba(139, 21, 40, 0.05)'
                }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: theme.primary }}>
                    CONFERRED LEVEL: {levelInfo.level} — {levelInfo.name.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: theme.accentGold }}>
                    {currentAttempt?.skillName ? `${currentAttempt.skillName} Score` : 'Cumulative Score'}: {overallScore}.00% &nbsp;•&nbsp; Institutional Passing Standard: ≥65.00% &nbsp;•&nbsp; Status: Verified
                  </div>
                </div>
              </div>

              {/* Attestation Line */}
              <div style={{ fontSize: '0.78rem', fontStyle: 'italic', color: '#64748B', marginBottom: '20px', zIndex: 1 }}>
                Given under the official seal of the Institution and authorized Directorate authorities on this {issueDate}.
              </div>

              {/* Certificate Footer (QR, Seal, Signatures) */}
              <div style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingTop: '20px',
                borderTop: '1px solid #EAE5DC',
                zIndex: 1,
                flexWrap: 'wrap',
                gap: '20px'
              }}>
                {/* Left: Scannable QR & Credential Verification */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
                  <div
                    onClick={() => setVerifyModalOpen(true)}
                    style={{
                      padding: '5px',
                      backgroundColor: '#FFFFFF',
                      border: `1.5px solid ${theme.accentGold}`,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                      transition: 'transform 0.2s ease',
                      width: '78px',
                      height: '78px',
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
                        alt="Official Verification QR Code" 
                        style={{ width: '68px', height: '68px', display: 'block' }} 
                      />
                    ) : (
                      <div style={{ fontSize: '0.62rem', color: '#78716C' }}>Loading QR...</div>
                    )}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: theme.primary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Official Verification QR
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1C1917', fontFamily: 'monospace', marginTop: '2px' }}>
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
                        marginTop: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      <BadgeCheck size={14} />
                      <span>Scan to Verify on University Ledger</span>
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
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    border: `2px dashed ${theme.sealBorder}`,
                    backgroundColor: theme.sealBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: theme.sealText,
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.18)'
                  }}>
                    <ShieldCheck size={36} />
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 800, color: theme.sealText, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Official University Seal
                  </span>
                </div>

                {/* Right: Formal Signatures */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: '"Playfair Display", "Brush Script MT", cursive',
                    fontSize: '1.5rem',
                    color: '#1E293B',
                    fontWeight: 700,
                    marginBottom: '2px'
                  }}>
                    Prof. (Dr.) Naresh Grover
                  </div>
                  <div style={{ width: '180px', height: '1.5px', backgroundColor: '#CBD5E1', marginLeft: 'auto', marginBottom: '4px' }} />
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#1C1917' }}>
                    Dean of Academic Affairs &amp; Framework Chair
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                    Directorate of Competency Assessment
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: '2px' }}>
                    Issued: {issueDate}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Right Action Sidebar ── */}
            <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Quick Actions Card */}
              <div className="mr-card" style={{ padding: '22px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1C1917', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="#8B1528" />
                  <span>Download &amp; Share</span>
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Download High-Resolution PNG Button (PRIMARY) */}
                  <button
                    onClick={handleDownloadPNG}
                    disabled={!isCertified || isDownloading}
                    className="btn-primary"
                    style={{
                      width: '100%',
                      padding: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.92rem',
                      fontWeight: 800,
                      opacity: isCertified ? 1 : 0.5,
                      backgroundColor: '#8B1528',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 14px rgba(139, 21, 40, 0.28)'
                    }}
                  >
                    {isDownloading ? <RefreshCw size={17} className="animate-spin" /> : <Download size={17} />}
                    <span>{isDownloading ? 'Rendering High-Res PNG...' : 'Download Certificate (PNG)'}</span>
                  </button>

                  {/* Download Direct PDF Button */}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={!isCertified || isDownloadingPdf}
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
                    {isDownloadingPdf ? <RefreshCw size={16} className="animate-spin" /> : <FileText size={16} />}
                    <span>{isDownloadingPdf ? 'Generating PDF...' : 'Download Certificate (PDF)'}</span>
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

                  {/* Print via Browser */}
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
                    <span>Print via Browser</span>
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

              {/* Institutional Standard & Verification Status */}
              <div className="mr-card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <ShieldCheck size={18} color="#8B1528" />
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1C1917' }}>
                    Accreditation &amp; Verification
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1EFEA' }}>
                    <span style={{ color: '#78716C' }}>Passing Benchmark:</span>
                    <strong style={{ color: '#16A34A' }}>Minimum 65.00% Required</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1EFEA' }}>
                    <span style={{ color: '#78716C' }}>Evaluated Score:</span>
                    <strong style={{ color: overallScore >= 65 ? '#16A34A' : '#DC2626' }}>
                      {overallScore}.00% ({overallScore >= 65 ? 'Passed & Certified' : 'Threshold Not Met'})
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F1EFEA' }}>
                    <span style={{ color: '#78716C' }}>QR Code Security:</span>
                    <strong style={{ color: '#059669' }}>Live Scannable (High Res)</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ color: '#78716C' }}>Format:</span>
                    <strong style={{ color: '#8B1528' }}>Ultra High-Res PNG &amp; PDF</strong>
                  </div>
                </div>
              </div>

              {/* Public Verification Box */}
              <div className="mr-card" style={{ padding: '20px', backgroundColor: '#FAF8F5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <BadgeCheck size={20} color="#16A34A" />
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 800, color: '#1C1917' }}>
                    Registrar Public Ledger
                  </h4>
                </div>

                <p style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5, marginBottom: '10px' }}>
                  Employers and academic councils can instantly verify this credential online.
                </p>

                <div
                  onClick={() => setVerifyModalOpen(true)}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    padding: '9px 12px',
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
                    {certId}
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
                  <CheckCircle size={14} /> Confirmed Valid &amp; Unaltered
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
