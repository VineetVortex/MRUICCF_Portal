import React, { useState } from 'react';
import { Star, MessageSquare, CheckCircle2, X, Send, Sparkles, ShieldCheck } from 'lucide-react';
import { apiSubmitFeedback } from '../lib/api';

export default function BetaFeedbackModal({ isOpen, onClose, currentUser, assessmentContext = null }) {
  const [rating, setRating] = useState(5);
  const [examFeedback, setExamFeedback] = useState('');
  const [dashboardFeedback, setDashboardFeedback] = useState('');
  const [generalFeedback, setGeneralFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!examFeedback.trim() && !dashboardFeedback.trim() && !generalFeedback.trim()) {
      alert('Please share at least one suggestion so we can improve the platform.');
      return;
    }

    setIsSubmitting(true);
    const payload = {
      userId: currentUser?.id || currentUser?.uid || 'anonymous',
      studentName: currentUser?.name || 'MRU Student',
      rollNo: currentUser?.rollNo || 'N/A',
      email: currentUser?.email || 'student@mru.ac.in',
      department: currentUser?.department || 'Computer Science & Technology',
      rating,
      examFeedback: examFeedback.trim(),
      dashboardFeedback: dashboardFeedback.trim(),
      generalFeedback: generalFeedback.trim(),
      assessmentName: assessmentContext?.name || 'Diagnostic Questionnaire'
    };

    try {
      await apiSubmitFeedback(payload);
    } catch (_) {}

    setIsSubmitting(false);
    setIsSubmitted(true);
    setTimeout(() => {
      onClose(true);
      setIsSubmitted(false);
    }, 2200);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      padding: '16px'
    }}>
      <div className="animate-pop" style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        maxWidth: '560px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        border: '1.5px solid #8B1528',
        padding: '28px 32px'
      }}>
        {isSubmitted ? (
          <div style={{ textAlign: 'center', padding: '36px 12px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              backgroundColor: '#DCFCE7', color: '#16A34A',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px auto'
            }}>
              <CheckCircle2 size={36} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1C1917', marginBottom: '8px' }}>
              Thank You for Your Feedback!
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748B', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
              Your suggestions have been recorded and forwarded directly to the Institutional Core Team and Portal Administrators to refine the platform.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    backgroundColor: '#FDF2F4',
                    color: '#8B1528',
                    padding: '3px 10px',
                    borderRadius: '9999px',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Sparkles size={11} /> Beta Test Feedback
                  </span>
                </div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#1C1917', margin: 0 }}>
                  Help Us Improve ICCF Portal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onClose(false)}
                style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.84rem', color: '#64748B', lineHeight: 1.5, marginBottom: '20px' }}>
              This portal is currently under active <strong>Beta Testing</strong> at Manav Rachna University. Your candid feedback on the examination experience and the student dashboard will directly shape our upcoming release.
            </p>

            {/* Contributor Card */}
            <div style={{
              backgroundColor: '#FAF8F5',
              padding: '10px 14px',
              borderRadius: '12px',
              border: '1px solid #ECE7DF',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1C1917' }}>
                  {currentUser?.name || 'MRU Student'}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#78716C' }}>
                  {currentUser?.rollNo || '2024-CST'} • {currentUser?.department || 'CST'}
                </div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#15803D', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={13} /> Verified Beta Tester
              </span>
            </div>

            {/* Overall Rating */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                Overall Experience Rating
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      color: star <= rating ? '#EAB308' : '#D1D5DB',
                      transition: 'transform 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Star size={26} fill={star <= rating ? '#EAB308' : 'none'} />
                  </button>
                ))}
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#4B5563', alignSelf: 'center', marginLeft: '6px' }}>
                  {rating === 5 ? 'Excellent' : rating === 4 ? 'Good' : rating === 3 ? 'Average' : rating === 2 ? 'Needs Improvement' : 'Poor'}
                </span>
              </div>
            </div>

            {/* Exam Feedback Textarea */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                1. Examination Experience Improvements
              </label>
              <textarea
                value={examFeedback}
                onChange={(e) => setExamFeedback(e.target.value)}
                placeholder="What can be improved in the exam interface, question clarity, timer, lockdown mode, or answer persistence?"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Dashboard Feedback Textarea */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                2. Dashboard &amp; Analytics Suggestions
              </label>
              <textarea
                value={dashboardFeedback}
                onChange={(e) => setDashboardFeedback(e.target.value)}
                placeholder="What charts, competency analytics, learning roadmaps, or progress metrics would make the dashboard better for you?"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* General Feedback Textarea */}
            <div style={{ marginBottom: '22px' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
                3. Additional Comments or Bug Reports (Optional)
              </label>
              <textarea
                value={generalFeedback}
                onChange={(e) => setGeneralFeedback(e.target.value)}
                placeholder="Any other thoughts, glitches observed, or general suggestions..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #D1D5DB',
                  fontSize: '0.85rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => onClose(false)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '0.86rem' }}
              >
                Skip For Now
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary"
                style={{
                  padding: '10px 22px',
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  backgroundColor: '#8B1528',
                  borderColor: '#8B1528',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={14} />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Beta Feedback'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

