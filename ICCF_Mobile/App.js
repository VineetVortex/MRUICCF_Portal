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
  SafeAreaView
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

export default function App() {
  const [user, setUser] = useState(null);
  const [emailInput, setEmailInput] = useState('22cse0002@mru.ac.in');
  const [currentScreen, setCurrentScreen] = useState('login'); // 'login' | 'hub' | 'exam' | 'results'

  // Exam state
  const [activeQ, setActiveQ] = useState(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(600);
  const [strikes, setStrikes] = useState(0);
  const [completedScores, setCompletedScores] = useState({});
  const [latestScorecard, setLatestScorecard] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');

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
  const handleLogin = () => {
    if (!emailInput.trim()) return;
    setUser({
      name: 'Vineet Kumar',
      rollNo: '22CSE0002',
      email: emailInput.trim(),
      department: 'Computer Science & Technology'
    });
    setCurrentScreen('hub');
  };

  const handleStartExam = (q, randomizeOrder = false) => {
    setActiveQ(q);
    setCurrentQIndex(0);
    setTimeLeft(q.durationMinutes * 60);
    setAnswers({});
    setStrikes(0);
    setCurrentScreen('exam');
  };

  const handleStartRandom = () => {
    const randomPick = QUESTIONNAIRES[Math.floor(Math.random() * QUESTIONNAIRES.length)];
    handleStartExam(randomPick, true);
  };

  const handleJumpToRandomItem = () => {
    const unans = [];
    for (let i = 0; i < 10; i++) {
      if (answers[i] === undefined && i !== currentQIndex) unans.push(i);
    }
    const pool = unans.length > 0 ? unans : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(i => i !== currentQIndex);
    if (pool.length > 0) {
      const rnd = pool[Math.floor(Math.random() * pool.length)];
      setCurrentQIndex(rnd);
    }
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

      {/* ── Screen: Login ── */}
      {currentScreen === 'login' && (
        <View style={styles.loginContainer}>
          <Text style={styles.brandTitle}>MANAV RACHNA</Text>
          <Text style={styles.brandSubtitle}>Institutional Competency Certification Framework</Text>

          <View style={styles.loginCard}>
            <Text style={styles.cardHeader}>Student Portal Sign In</Text>
            <Text style={styles.label}>MRU Email Address</Text>
            <TextInput
              style={styles.input}
              value={emailInput}
              onChangeText={setEmailInput}
              placeholder="e.g. 22cse0002@mru.ac.in"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TouchableOpacity style={styles.btnPrimary} onPress={handleLogin}>
              <Text style={styles.btnPrimaryText}>Enter Diagnostic Portal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── Screen: Questionnaire Hub ── */}
      {currentScreen === 'hub' && (
        <View style={styles.mainContainer}>
          {/* Header */}
          <View style={styles.headerBar}>
            <View>
              <Text style={styles.portalTitle}>Competency Assessments</Text>
              <Text style={styles.portalSub}>Student: {user?.name} ({user?.rollNo})</Text>
            </View>
            <TouchableOpacity onPress={() => setCurrentScreen('login')} style={styles.btnSignOut}>
              <Text style={styles.btnSignOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>

          {/* Random Action Banner */}
          <View style={styles.randomBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.randomBannerTitle}>⚡ Instant Random Assessment</Text>
              <Text style={styles.randomBannerSub}>Take any of the 15 competency questionnaires at random.</Text>
            </View>
            <TouchableOpacity style={styles.btnRandom} onPress={handleStartRandom}>
              <Text style={styles.btnRandomText}>🎲 Start Random</Text>
            </TouchableOpacity>
          </View>

          {/* Category Filter Pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
            <TouchableOpacity style={[styles.filterPill, { backgroundColor: '#8B1528' }]} onPress={handleStartRandom}>
              <Text style={[styles.filterPillText, { color: '#FFFFFF', fontWeight: '800' }]}>🎲 Random</Text>
            </TouchableOpacity>
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
                        {past.score}% {past.isCertified ? '✓ Certified' : 'Pending'}
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

      {/* ── Screen: Exam Lockdown Player ── */}
      {currentScreen === 'exam' && activeQ && (
        <View style={styles.mainContainer}>
          {/* Exam Header */}
          <View style={[styles.headerBar, { backgroundColor: '#8B1528' }]}>
            <View>
              <Text style={[styles.portalTitle, { color: '#FFFFFF' }]}>🔒 Strict Exam Mode</Text>
              <Text style={[styles.portalSub, { color: '#FCD34D' }]}>{activeQ.name} (10 Questions)</Text>
            </View>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>⏱ {formatTimer(timeLeft)}</Text>
            </View>
          </View>

          {/* Quick Toolbar */}
          <View style={styles.examToolbar}>
            <Text style={styles.itemProgressText}>Item {currentQIndex + 1} of 10</Text>
            <TouchableOpacity style={styles.btnRandomJump} onPress={handleJumpToRandomItem}>
              <Text style={styles.btnRandomJumpText}>🎲 Random Item</Text>
            </TouchableOpacity>
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

      {/* ── Screen: Results / Scorecard ── */}
      {currentScreen === 'results' && latestScorecard && (
        <View style={styles.mainContainer}>
          <View style={styles.resultsCard}>
            <Text style={styles.resultsBadge}>{latestScorecard.isCertified ? '🏆 CERTIFIED' : 'DIAGNOSTIC COMPLETED'}</Text>
            <Text style={styles.resultsTitle}>{latestScorecard.qName} Scorecard</Text>
            <Text style={styles.resultsScore}>{latestScorecard.score}%</Text>
            <Text style={styles.resultsSub}>
              {latestScorecard.answeredCount}/10 items evaluated. {latestScorecard.isAutoSubmitted ? '(Auto-submitted via Mobile Lockdown)' : 'Authoritative evaluation verified.'}
            </Text>

            <TouchableOpacity style={styles.btnPrimary} onPress={() => setCurrentScreen('hub')}>
              <Text style={styles.btnPrimaryText}>Back to Questionnaire Hub</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#8B1528',
    letterSpacing: 1
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 28,
    textAlign: 'center'
  },
  loginCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 16
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
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B'
  },
  portalSub: {
    fontSize: 12,
    color: '#64748B'
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
  randomBanner: {
    margin: 16,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  randomBannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E'
  },
  randomBannerSub: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 2
  },
  btnRandom: {
    backgroundColor: '#8B1528',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999
  },
  btnRandomText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800'
  },
  filterBar: {
    maxHeight: 46,
    paddingHorizontal: 16,
    marginBottom: 8
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
  btnRandomJump: {
    backgroundColor: '#FDF2F4',
    borderWidth: 1,
    borderColor: '#8B1528',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8
  },
  btnRandomJumpText: {
    color: '#8B1528',
    fontSize: 11,
    fontWeight: '700'
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
  }
});
