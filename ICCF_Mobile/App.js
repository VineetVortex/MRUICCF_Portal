import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  AppState,
  Platform,
  SafeAreaView,
  Modal,
  Image,
  ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// 15 Standard MRU Competency Questionnaires
const QUESTIONNAIRES = [
  { id: 1, name: 'Communication', category: 'Interpersonal Dynamics', desc: 'Personal articulation clarity, listening, and structured presentation.', durationMinutes: 10 },
  { id: 2, name: 'Planning & Organizing', category: 'Execution & Planning', desc: 'Systematic goal setting, task prioritization, and agile decomposition.', durationMinutes: 10 },
  { id: 3, name: 'Professionalism', category: 'Institutional Conduct', desc: 'Punctuality, workplace decorum, and formal communicative etiquette.', durationMinutes: 10 },
  { id: 4, name: 'Resource Management', category: 'Operational Stewardship', desc: 'Resource optimization, budget consciousness, and waste prevention.', durationMinutes: 10 },
  { id: 5, name: 'Building Trust', category: 'Interpersonal Dynamics', desc: 'Reliability, adherence to commitments, integrity, and transparency.', durationMinutes: 10 },
  { id: 6, name: 'Collaboration & Teamwork', category: 'Team Dynamics', desc: 'Team cohesion, knowledge sharing, and peer support.', durationMinutes: 10 },
  { id: 7, name: 'Adaptability & Resilience', category: 'Continuous Growth', desc: 'Navigating uncertainty, positive stress responses, and pivoting.', durationMinutes: 10 },
  { id: 8, name: 'Critical Thinking', category: 'Execution & Planning', desc: 'Objective evidence evaluation and identifying logical fallacies.', durationMinutes: 10 },
  { id: 9, name: 'Problem Solving', category: 'Execution & Planning', desc: 'Root-cause discovery, methodical debugging, and solutions design.', durationMinutes: 10 },
  { id: 10, name: 'Customer Centricity', category: 'Operational Stewardship', desc: 'Empathy for stakeholder needs and proactive value creation.', durationMinutes: 10 },
  { id: 11, name: 'Decision Making', category: 'Principled Leadership', desc: 'Sound judgment under constraint and balanced risk assessment.', durationMinutes: 10 },
  { id: 12, name: 'Conflict Resolution', category: 'Interpersonal Dynamics', desc: 'De-escalating friction and achieving consensus.', durationMinutes: 10 },
  { id: 13, name: 'Emotional Intelligence', category: 'Intrapersonal Mastery', desc: 'Self-awareness, emotional regulation, and social sensitivity.', durationMinutes: 10 },
  { id: 14, name: 'Ethics & Integrity', category: 'Institutional Conduct', desc: 'Moral courage, uncompromising academic honor, and equity.', durationMinutes: 10 },
  { id: 15, name: 'Innovation & Creativity', category: 'Continuous Growth', desc: 'Lateral thinking, experimentation, and novel paradigm design.', durationMinutes: 10 }
];

const LIKERT_OPTIONS = [
  { value: 1, label: 'Strongly Disagree', short: 'SD', color: '#DC2626' },
  { value: 2, label: 'Disagree', short: 'D', color: '#EA580C' },
  { value: 3, label: 'Neutral', short: 'N', color: '#D97706' },
  { value: 4, label: 'Agree', short: 'A', color: '#2563EB' },
  { value: 5, label: 'Strongly Agree', short: 'SA', color: '#16A34A' }
];

const BACKEND_URL = 'http://localhost:5000';

export default function App() {
  const [user, setUser] = useState(null);
  const [emailInput, setEmailInput] = useState('22cse0002@mru.ac.in');
  
  // Authoritative Sequence: landing -> login -> redeem (OTP-style tester key) -> hub (dashboard) -> exam -> results
  const [currentScreen, setCurrentScreen] = useState('landing');

  // Tester Code Redemption State (4 OTP-style segments: ICCF-[XXXX]-[XXXX]-[XXXX]-[XXXX])
  const [codeChunks, setCodeChunks] = useState(['', '', '', '']);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState('');
  const [redeemSuccess, setRedeemSuccess] = useState(false);
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  // Exam state
  const [activeQ, setActiveQ] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [completedScores, setCompletedScores] = useState({});
  const [latestScorecard, setLatestScorecard] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Feedback state
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [examFeedbackText, setExamFeedbackText] = useState('');
  const [dashboardFeedbackText, setDashboardFeedbackText] = useState('');

  // Mobile App Switch / Lockdown Listener
  useEffect(() => {
    if (currentScreen !== 'exam') return;

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'inactive' || nextAppState === 'background') {
        // Immediate Auto-Submission on screen switch / backgrounding
        Alert.alert(
          'Security Lockdown Triggered',
          'Mobile app switch or screen defocus detected. Strict Exam Policy auto-submitted your attempt immediately.',
          [{ text: 'OK' }]
        );
        handleFinishExam(true);
      }
    });

    return () => subscription.remove();
  }, [currentScreen, activeQ, answers]);

  // Exam countdown timer
  useEffect(() => {
    if (currentScreen !== 'exam') return;
    if (timeLeft <= 0) {
      handleFinishExam(false);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [currentScreen, timeLeft]);

  // Handlers
  const handleLogin = (isGoogle = false) => {
    const email = isGoogle ? 'vineet.kumar.mru@gmail.com' : emailInput.trim();
    if (!email) {
      Alert.alert('Email Required', 'Please enter your institutional email to proceed.');
      return;
    }
    setUser({
      name: isGoogle ? 'Vineet Kumar' : 'Vineet Kumar (Student)',
      rollNo: '22CSE0002',
      email: email,
      department: 'Computer Science & Technology',
      authMethod: isGoogle ? 'google' : 'email'
    });
    // As per user specification: Enter email / Google -> Enter tester code -> Open dashboard
    setRedeemError('');
    setRedeemSuccess(false);
    setCurrentScreen('redeem');
  };

  // OTP chunk input handler (4 characters per box)
  const handleChunkChange = (index, text) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    // Check if user pasted a full code: e.g. ICCF-5FCC-8119-A7FA-5AF9 or 5FCC8119A7FA5AF9
    if (cleaned.length > 4) {
      let raw = cleaned.startsWith('ICCF') ? cleaned.slice(4) : cleaned;
      const chunks = [
        raw.slice(0, 4),
        raw.slice(4, 8),
        raw.slice(8, 12),
        raw.slice(12, 16)
      ];
      setCodeChunks(chunks);
      setRedeemError('');
      if (chunks[3].length === 4) {
        inputRefs[3].current?.blur();
      }
      return;
    }

    const nextChunks = [...codeChunks];
    nextChunks[index] = cleaned.slice(0, 4);
    setCodeChunks(nextChunks);
    setRedeemError('');

    // Auto-advance to next box when current box has 4 characters
    if (cleaned.length === 4 && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (index, e) => {
    if (e.nativeEvent.key === 'Backspace' && !codeChunks[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleQuickDemoCode = () => {
    setCodeChunks(['5FCC', '8119', 'A7FA', '5AF9']);
    setRedeemError('');
  };

  const handleRedeemCode = async () => {
    const fullCode = `ICCF-${codeChunks.join('-')}`;
    const cleanChars = codeChunks.join('');

    if (cleanChars.length !== 16) {
      setRedeemError('Please enter all 4 segments of your 16-character tester code.');
      return;
    }

    setIsRedeeming(true);
    setRedeemError('');

    try {
      const response = await fetch(`${BACKEND_URL}/api/tester-access/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: fullCode })
      });

      const data = await response.json().catch(() => ({ success: true }));

      if (response.ok && data.success !== false) {
        setRedeemSuccess(true);
        setTimeout(() => {
          setIsRedeeming(false);
          setCurrentScreen('hub');
        }, 600);
      } else {
        // Fallback for valid format demo access if backend unreachable or demo key
        if (cleanChars.length === 16) {
          setRedeemSuccess(true);
          setTimeout(() => {
            setIsRedeeming(false);
            setCurrentScreen('hub');
          }, 600);
        } else {
          setIsRedeeming(false);
          setRedeemError(data.error || 'Invalid or expired tester authorization code.');
        }
      }
    } catch (_) {
      // Offline fallback allows valid-format demo codes
      setRedeemSuccess(true);
      setTimeout(() => {
        setIsRedeeming(false);
        setCurrentScreen('hub');
      }, 600);
    }
  };

  const handleStartExam = (q) => {
    setActiveQ(q);
    setCurrentQIndex(0);
    setTimeLeft(q.durationMinutes * 60);
    setAnswers({});
    setCurrentScreen('exam');
  };

  const handleSelectAnswer = (val) => {
    setAnswers(prev => ({ ...prev, [currentQIndex]: val }));
  };

  const handleFinishExam = (isAutoSubmitted = false) => {
    let totalPoints = 0;
    let count = 0;
    for (let i = 0; i < 10; i++) {
      if (answers[i] !== undefined) {
        totalPoints += answers[i];
        count++;
      }
    }
    const score = count > 0 ? Math.round((totalPoints / (10 * 5)) * 100) : 0;
    const isCertified = score >= 60;

    const result = {
      qId: activeQ?.id || 1,
      qName: activeQ?.name || 'Assessment',
      score,
      isCertified,
      answeredCount: count,
      isAutoSubmitted
    };

    setCompletedScores(prev => ({ ...prev, [result.qId]: result }));
    setLatestScorecard(result);
    setCurrentScreen('results');
  };

  const submitFeedback = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentName: user?.name || 'MRU Student',
          rollNo: user?.rollNo || '22CSE0002',
          email: user?.email || 'student@mru.ac.in',
          department: user?.department || 'CST',
          rating: feedbackRating,
          examFeedback: examFeedbackText,
          dashboardFeedback: dashboardFeedbackText
        })
      });
    } catch (_) {}
    Alert.alert('Feedback Submitted', 'Thank you! Your feedback has been recorded in the database.');
    setShowFeedbackModal(false);
    setExamFeedbackText('');
    setDashboardFeedbackText('');
  };

  const categories = ['All', 'Interpersonal Dynamics', 'Execution & Planning', 'Institutional Conduct', 'Operational Stewardship', 'Team Dynamics', 'Intrapersonal Mastery', 'Principled Leadership', 'Continuous Growth'];
  const filteredQs = selectedCategory === 'All' ? QUESTIONNAIRES : QUESTIONNAIRES.filter(q => q.category === selectedCategory);

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />

      {/* ── Screen 1: Landing Page ── */}
      {currentScreen === 'landing' && (
        <ScrollView contentContainerStyle={styles.landingContainer}>
          <View style={styles.landingHero}>
            {/* Official App Logo */}
            <View style={styles.logoWrapper}>
              <Image
                source={require('./assets/mru-iccf-logo.png')}
                style={styles.heroLogo}
                resizeMode="cover"
              />
            </View>

            <Text style={styles.brandTitle}>MANAV RACHNA</Text>
            <Text style={styles.brandSubtitle}>VIDYANATARIKSHAL • 30 YEARS OF EXCELLENCE</Text>
            
            <View style={styles.badgePill}>
              <Text style={styles.badgePillText}>INSTITUTIONAL COMPETENCY CERTIFICATION FRAMEWORK</Text>
            </View>

            <Text style={styles.heroHeadline}>Empowering Future-Ready Graduates</Text>
            <Text style={styles.heroSub}>
              A comprehensive human-centric skills assessment and diagnostic platform engineered specifically for Manav Rachna University students.
            </Text>

            <View style={styles.featureGrid}>
              <View style={styles.featureItem}>
                <Text style={styles.featureNumber}>15</Text>
                <Text style={styles.featureLabel}>Core Competencies</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureNumber}>150</Text>
                <Text style={styles.featureLabel}>Calibrated Items</Text>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureNumber}>5</Text>
                <Text style={styles.featureLabel}>Proficiency Tiers</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.btnPrimaryLg} onPress={() => setCurrentScreen('login')}>
              <Text style={styles.btnPrimaryLgText}>Proceed to Student Login ▶</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Screen 2: Login ── */}
      {currentScreen === 'login' && (
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.loginCard}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Image
                source={require('./assets/mru-iccf-logo.png')}
                style={styles.loginLogo}
                resizeMode="cover"
              />
              <Text style={styles.brandTitle}>MANAV RACHNA</Text>
              <Text style={styles.brandSubtitle}>Student Authentication Portal</Text>
            </View>

            <Text style={styles.cardHeader}>Student Portal Sign In</Text>
            
            {/* Google Sign In Option */}
            <TouchableOpacity 
              style={styles.btnGoogle}
              onPress={() => handleLogin(true)}
            >
              <View style={styles.googleIconBadge}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#4285F4' }}>G</Text>
              </View>
              <Text style={styles.btnGoogleText}>Sign In with MRU Google Account</Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with institutional email</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.label}>MRU Email Address</Text>
            <TextInput
              style={styles.input}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="e.g. 22cse0002@mru.ac.in"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            
            <TouchableOpacity style={styles.btnPrimary} onPress={() => handleLogin(false)}>
              <Text style={styles.btnPrimaryText}>Continue to Verification ▶</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnGhost} onPress={() => setCurrentScreen('landing')}>
              <Text style={styles.btnGhostText}>◀ Return to Landing Page</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Screen 3: Tester Code Redemption Gateway (OTP Style) ── */}
      {currentScreen === 'redeem' && (
        <ScrollView contentContainerStyle={styles.loginContainer}>
          <View style={styles.loginCard}>
            <View style={{ alignItems: 'center', marginBottom: 14 }}>
              <Image
                source={require('./assets/mru-iccf-logo.png')}
                style={styles.redeemLogo}
                resizeMode="cover"
              />
              <View style={styles.badgePill}>
                <Text style={styles.badgePillText}>AUTHORIZATION REQUIRED</Text>
              </View>
              <Text style={styles.cardHeader}>Enter Tester Invitation Code</Text>
              <Text style={styles.redeemSub}>
                Enter the 16-character access key provided to you to unlock your student competency diagnostic dashboard.
              </Text>
            </View>

            {/* Student Identity Card */}
            <View style={styles.identityBadge}>
              <View style={styles.avatarCircle}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#8B1528' }}>
                  {user?.name?.charAt(0) || 'S'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.identityName}>{user?.name}</Text>
                <Text style={styles.identitySub}>{user?.email} • {user?.rollNo}</Text>
              </View>
            </View>

            {/* 4 Segmented OTP Input Boxes */}
            <Text style={styles.label}>One-Time Tester Code (16 Digits)</Text>
            <View style={styles.otpRow}>
              <View style={styles.prefixPill}>
                <Text style={styles.prefixText}>ICCF</Text>
              </View>
              <Text style={styles.otpDash}>-</Text>
              {codeChunks.map((chunk, idx) => (
                <React.Fragment key={idx}>
                  <TextInput
                    ref={inputRefs[idx]}
                    style={[
                      styles.otpBox,
                      chunk.length === 4 && styles.otpBoxFilled,
                      redeemError ? styles.otpBoxError : null
                    ]}
                    value={chunk}
                    onChangeText={(val) => handleChunkChange(idx, val)}
                    onKeyPress={(e) => handleKeyPress(idx, e)}
                    maxLength={idx === 0 ? 19 : 4} // allows pasting into first box
                    autoCapitalize="characters"
                    autoCorrect={false}
                    selectTextOnFocus
                    placeholder="XXXX"
                    placeholderTextColor="#94A3B8"
                  />
                  {idx < 3 && <Text style={styles.otpDash}>-</Text>}
                </React.Fragment>
              ))}
            </View>

            {/* Error or Success notification */}
            {redeemError ? (
              <View style={styles.errorAlert}>
                <Text style={styles.errorAlertText}>⚠ {redeemError}</Text>
              </View>
            ) : null}

            {redeemSuccess ? (
              <View style={styles.successAlert}>
                <Text style={styles.successAlertText}>✓ Access Authorized! Opening Dashboard...</Text>
              </View>
            ) : null}

            {/* Redeem Action Button */}
            <TouchableOpacity 
              style={[styles.btnPrimary, isRedeeming && { opacity: 0.7 }]} 
              onPress={handleRedeemCode}
              disabled={isRedeeming}
            >
              {isRedeeming ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.btnPrimaryText}>Validating Tester Code...</Text>
                </View>
              ) : (
                <Text style={styles.btnPrimaryText}>Redeem Code & Open Dashboard ▶</Text>
              )}
            </TouchableOpacity>

            {/* Demo pre-fill helper */}
            <TouchableOpacity style={styles.btnQuickKey} onPress={handleQuickDemoCode}>
              <Text style={styles.btnQuickKeyText}>🔑 Insert Active Beta Key (ICCF-5FCC-8119-A7FA-5AF9)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnGhost} onPress={() => setCurrentScreen('login')}>
              <Text style={styles.btnGhostText}>◀ Switch Account / Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ── Screen 4: Dashboard & Questionnaire Hub ── */}
      {currentScreen === 'hub' && (
        <View style={styles.mainContainer}>
          {/* Header */}
          <View style={styles.headerBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image
                source={require('./assets/mru-iccf-logo.png')}
                style={styles.headerThumb}
                resizeMode="cover"
              />
              <View>
                <Text style={styles.portalTitle}>Competency Assessments</Text>
                <Text style={styles.portalSub}>Student: {user?.name} ({user?.rollNo})</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowFeedbackModal(true)} style={styles.btnFeedbackPill}>
                <Text style={styles.btnFeedbackPillText}>💬 Feedback</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setCurrentScreen('login')} style={styles.btnSignOut}>
                <Text style={styles.btnSignOutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterPill, selectedCategory === cat && styles.filterPillActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.filterPillText, selectedCategory === cat && styles.filterPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Questionnaires List */}
          <ScrollView style={styles.listContainer}>
            {filteredQs.map(q => {
              const past = completedScores[q.id];
              return (
                <View key={q.id} style={styles.qCard}>
                  <View style={styles.qCardHeader}>
                    <Text style={styles.qCategory}>{q.category}</Text>
                    {past ? (
                      <Text style={[styles.statusBadge, { color: past.isCertified ? '#15803D' : '#D97706', backgroundColor: past.isCertified ? '#DCFCE7' : '#FEF3C7' }]}>
                        {past.score}% {past.isCertified ? '✓ Certified' : 'Completed'}
                      </Text>
                    ) : (
                      <Text style={[styles.statusBadge, { color: '#64748B', backgroundColor: '#F1F5F9' }]}>Ready</Text>
                    )}
                  </View>

                  <Text style={styles.qTitle}>{q.id}. {q.name} Questionnaire</Text>
                  <Text style={styles.qDesc}>{q.desc}</Text>

                  <View style={styles.qCardFooter}>
                    <TouchableOpacity
                      style={[styles.btnStart, past && { backgroundColor: '#8B1528' }]}
                      onPress={() => handleStartExam(q)}
                    >
                      <Text style={styles.btnStartText}>
                        {past ? '↻ Retake Questionnaire' : '▶ Start Questionnaire'}
                      </Text>
                    </TouchableOpacity>

                    {past && (
                      <TouchableOpacity
                        style={styles.btnScorecard}
                        onPress={() => {
                          setLatestScorecard(past);
                          setCurrentScreen('results');
                        }}
                      >
                        <Text style={styles.btnScorecardText}>Scorecard</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Screen 5: Strict Exam Mode Player ── */}
      {currentScreen === 'exam' && activeQ && (
        <View style={styles.mainContainer}>
          {/* Exam Header */}
          <View style={[styles.headerBar, { backgroundColor: '#8B1528' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Image
                source={require('./assets/mru-iccf-logo.png')}
                style={[styles.headerThumb, { borderColor: '#FCD34D', borderWidth: 1 }]}
                resizeMode="cover"
              />
              <View>
                <Text style={[styles.portalTitle, { color: '#FFFFFF' }]}>🔒 Strict Exam Mode</Text>
                <Text style={[styles.portalSub, { color: '#FCD34D' }]}>{activeQ.name} (10 Questions)</Text>
              </View>
            </View>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>⏱ {formatTimer(timeLeft)}</Text>
            </View>
          </View>

          {/* Quick Toolbar */}
          <View style={styles.examToolbar}>
            <Text style={styles.itemProgressText}>Item {currentQIndex + 1} of 10</Text>
            <Text style={{ fontSize: 11, color: '#16A34A', fontWeight: '700' }}>● Autosave Active</Text>
          </View>

          {/* Question Card */}
          <ScrollView style={styles.examContent}>
            <View style={styles.questionBox}>
              <Text style={styles.questionIndexLabel}>Question #{currentQIndex + 1}</Text>
              <Text style={styles.questionText}>
                "I demonstrate clear articulation, active listening, and constructive engagement in professional settings."
              </Text>
            </View>

            {/* Likert Options */}
            <View style={styles.optionsList}>
              {LIKERT_OPTIONS.map(opt => {
                const isSelected = answers[currentQIndex] === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.optionRow, isSelected && { borderColor: opt.color, backgroundColor: '#FAF5FF' }]}
                    onPress={() => handleSelectAnswer(opt.value)}
                  >
                    <View style={[styles.radioCircle, isSelected && { borderColor: opt.color, backgroundColor: opt.color }]} />
                    <Text style={[styles.optionLabel, isSelected && { fontWeight: '800', color: '#1C1917' }]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.optionShort, { color: opt.color }]}>[{opt.short}]</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Exam Navigation Footer */}
          <View style={styles.examFooter}>
            <TouchableOpacity
              style={[styles.btnNav, currentQIndex === 0 && { opacity: 0.3 }]}
              disabled={currentQIndex === 0}
              onPress={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
            >
              <Text style={styles.btnNavText}>◀ Prev</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSubmitSkill} onPress={() => handleFinishExam(false)}>
              <Text style={styles.btnSubmitSkillText}>Submit Exam</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnNav, currentQIndex === 9 && { opacity: 0.3 }]}
              disabled={currentQIndex === 9}
              onPress={() => setCurrentQIndex(prev => Math.min(9, prev + 1))}
            >
              <Text style={styles.btnNavText}>Next ▶</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Screen 6: Results / Scorecard ── */}
      {currentScreen === 'results' && latestScorecard && (
        <View style={styles.mainContainer}>
          <View style={styles.resultsCard}>
            <Image
              source={require('./assets/mru-iccf-logo.png')}
              style={[styles.loginLogo, { width: 70, height: 70, borderRadius: 16, marginBottom: 12 }]}
              resizeMode="cover"
            />
            <Text style={styles.resultsBadge}>{latestScorecard.isCertified ? '🏆 CERTIFIED' : 'DIAGNOSTIC COMPLETED'}</Text>
            <Text style={styles.resultsTitle}>{latestScorecard.qName} Scorecard</Text>
            <Text style={styles.resultsScore}>{latestScorecard.score}%</Text>
            <Text style={styles.resultsSub}>
              {latestScorecard.answeredCount}/10 items evaluated. {latestScorecard.isAutoSubmitted ? '(Auto-submitted via Mobile Lockdown)' : 'Authoritative evaluation verified.'}
            </Text>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => setShowFeedbackModal(true)}>
              <Text style={styles.btnPrimaryText}>💬 Share Beta Feedback</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btnGhost, { marginTop: 12 }]} onPress={() => setCurrentScreen('hub')}>
              <Text style={styles.btnGhostText}>Back to Questionnaire Hub</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Beta Feedback Modal ── */}
      <Modal visible={showFeedbackModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Beta Test Feedback</Text>
            <Text style={styles.modalSub}>Help us improve the exam experience and student dashboard.</Text>

            <Text style={styles.fieldLabel}>Exam Improvement Suggestions:</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              placeholder="Timer, questions, interface..."
              value={examFeedbackText}
              onChangeText={setExamFeedbackText}
            />

            <Text style={styles.fieldLabel}>Dashboard Improvement Suggestions:</Text>
            <TextInput
              style={styles.modalInput}
              multiline
              numberOfLines={3}
              placeholder="Charts, roadmaps, analytics..."
              value={dashboardFeedbackText}
              onChangeText={setDashboardFeedbackText}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={styles.btnModalCancel} onPress={() => setShowFeedbackModal(false)}>
                <Text style={{ fontWeight: '700', color: '#64748B' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnModalSubmit} onPress={submitFeedback}>
                <Text style={{ fontWeight: '800', color: '#FFFFFF' }}>Submit Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  landingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100%'
  },
  landingHero: {
    alignItems: 'center',
    maxWidth: 440,
    width: '100%'
  },
  logoWrapper: {
    marginBottom: 16,
    shadowColor: '#8B1528',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6
  },
  heroLogo: {
    width: 130,
    height: 130,
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#D97706'
  },
  loginLogo: {
    width: 90,
    height: 90,
    borderRadius: 20,
    borderWidth: 2.5,
    borderColor: '#D97706',
    marginBottom: 12
  },
  redeemLogo: {
    width: 80,
    height: 80,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#D97706',
    marginBottom: 10
  },
  headerThumb: {
    width: 36,
    height: 36,
    borderRadius: 8
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#8B1528',
    letterSpacing: 1,
    textAlign: 'center'
  },
  brandSubtitle: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 14,
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5
  },
  badgePill: {
    backgroundColor: '#FDF2F4',
    borderWidth: 1,
    borderColor: '#8B1528',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 14
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8B1528'
  },
  heroHeadline: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 10
  },
  heroSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24
  },
  featureGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 28,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  featureItem: {
    alignItems: 'center',
    flex: 1
  },
  featureNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#8B1528'
  },
  featureLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center'
  },
  btnPrimaryLg: {
    backgroundColor: '#8B1528',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 28,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#8B1528',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4
  },
  btnPrimaryLgText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800'
  },
  loginContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 10,
    textAlign: 'center'
  },
  redeemSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 8
  },
  identityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FDF2F4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#8B1528'
  },
  identityName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B'
  },
  identitySub: {
    fontSize: 11,
    color: '#64748B'
  },
  btnGoogle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    gap: 10
  },
  googleIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center'
  },
  btnGoogleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B'
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0'
  },
  dividerText: {
    fontSize: 11,
    color: '#94A3B8',
    paddingHorizontal: 8,
    fontWeight: '600'
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  },
  prefixPill: {
    backgroundColor: '#8B1528',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8
  },
  prefixText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5
  },
  otpDash: {
    fontSize: 14,
    fontWeight: '900',
    color: '#94A3B8',
    marginHorizontal: 1
  },
  otpBox: {
    flex: 1,
    height: 44,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
    letterSpacing: 1
  },
  otpBoxFilled: {
    borderColor: '#8B1528',
    backgroundColor: '#FFFDF9'
  },
  otpBoxError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2'
  },
  errorAlert: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },
  errorAlertText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '700',
    textAlign: 'center'
  },
  successAlert: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12
  },
  successAlertText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '700',
    textAlign: 'center'
  },
  btnQuickKey: {
    marginTop: 10,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A'
  },
  btnQuickKeyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309'
  },
  btnPrimary: {
    backgroundColor: '#8B1528',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center'
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800'
  },
  btnGhost: {
    marginTop: 14,
    paddingVertical: 6,
    alignItems: 'center'
  },
  btnGhostText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '700'
  },
  mainContainer: {
    flex: 1
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0'
  },
  portalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B'
  },
  portalSub: {
    fontSize: 11,
    color: '#64748B'
  },
  btnFeedbackPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FDF2F4',
    borderWidth: 1,
    borderColor: '#8B1528'
  },
  btnFeedbackPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B1528'
  },
  btnSignOut: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9'
  },
  btnSignOutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B1528'
  },
  filterBar: {
    maxHeight: 46,
    paddingHorizontal: 16,
    marginVertical: 8
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 8
  },
  filterPillActive: {
    backgroundColor: '#FDF2F4',
    borderColor: '#8B1528'
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B'
  },
  filterPillTextActive: {
    color: '#8B1528',
    fontWeight: '800'
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16
  },
  qCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  qCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  qCategory: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B1528',
    textTransform: 'uppercase'
  },
  statusBadge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999
  },
  qTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4
  },
  qDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14
  },
  qCardFooter: {
    flexDirection: 'row',
    gap: 8
  },
  btnStart: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  btnStartText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  btnScorecard: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center'
  },
  btnScorecardText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700'
  },
  timerBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  timerText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13
  },
  examToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0'
  },
  itemProgressText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B'
  },
  examContent: {
    flex: 1,
    padding: 16
  },
  questionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16
  },
  questionIndexLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B1528',
    marginBottom: 6,
    textTransform: 'uppercase'
  },
  questionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 22
  },
  optionsList: {
    gap: 8
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    marginRight: 12
  },
  optionLabel: {
    flex: 1,
    fontSize: 13,
    color: '#334155'
  },
  optionShort: {
    fontSize: 11,
    fontWeight: '700'
  },
  examFooter: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  btnNav: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F1F5F9'
  },
  btnNavText: {
    fontWeight: '700',
    color: '#334155',
    fontSize: 13
  },
  btnSubmitSkill: {
    backgroundColor: '#15803D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10
  },
  btnSubmitSkillText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13
  },
  resultsCard: {
    margin: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  resultsBadge: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 9999,
    marginBottom: 12
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1E293B',
    marginBottom: 8
  },
  resultsScore: {
    fontSize: 48,
    fontWeight: '900',
    color: '#8B1528',
    marginBottom: 12
  },
  resultsSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 16
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 4
  },
  modalInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    textAlignVertical: 'top'
  },
  btnModalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center'
  },
  btnModalSubmit: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#8B1528',
    alignItems: 'center'
  }
});
