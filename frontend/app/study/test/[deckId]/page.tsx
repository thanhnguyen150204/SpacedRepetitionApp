'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuestions, generateQuestions, startSession, endSession, submitReview } from '@/lib/api';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Clock, Zap, AlertTriangle, FileText } from 'lucide-react';
import Confetti from '@/components/Confetti';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const QUESTION_TIME_LIMIT = 15; // 15 seconds per question

interface TestAnswerRecord {
  questionText: string;
  selectedOpt: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  isTimeout: boolean;
}

export default function TimedTestPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [userAnswers, setUserAnswers] = useState<TestAnswerRecord[]>([]);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [options, setOptions] = useState<string[]>([]);
  
  // Timer state
  const [timeLeftMs, setTimeLeftMs] = useState(QUESTION_TIME_LIMIT * 1000);
  const timerRef = useRef<any>(null);
  const isTransitioningRef = useRef(false);

  const buildOptions = useCallback((qs: any[], i: number) => {
    if (!qs[i]) return;
    const q = qs[i];
    const opts = shuffle([q.correctAnswer, ...(q.distractors || [])]);
    setOptions(opts);
  }, []);

  useEffect(() => {
    getQuestions(deckId, 20).then(async (q) => {
      let finalQuestions = q;
      if (q.length === 0) {
        await generateQuestions(deckId);
        finalQuestions = await getQuestions(deckId, 20);
      }
      setQuestions(finalQuestions);
      buildOptions(finalQuestions, 0);
      try {
        const s = await startSession(deckId, 'quiz');
        setSession(s);
      } catch (e) {}
      setLoading(false);
    });
  }, [deckId, buildOptions]);

  // Handle timeout for a question during exam
  const handleTimeOut = useCallback(async () => {
    if (isTransitioningRef.current || done) return;
    isTransitioningRef.current = true;
    setSelected('__TIMEOUT__');

    const currentQ = questions[index];
    const newWrong = wrong + 1;
    setWrong(newWrong);

    setUserAnswers(prev => [
      ...prev,
      {
        questionText: currentQ?.questionText || '',
        selectedOpt: null,
        correctAnswer: currentQ?.correctAnswer || '',
        isCorrect: false,
        isTimeout: true,
      }
    ]);

    // Auto-enroll wrong answer into Spaced Repetition queue
    if (currentQ?.cardId) {
      try {
        await submitReview({ cardId: currentQ.cardId, quality: 0, sessionId: session?.id });
      } catch (err) {}
    }

    setTimeout(async () => {
      if (index + 1 >= questions.length) {
        if (session) await endSession(session.id, correct, newWrong);
        setDone(true);
      } else {
        setIndex(i => i + 1);
        setSelected(null);
        buildOptions(questions, index + 1);
        setTimeLeftMs(QUESTION_TIME_LIMIT * 1000);
        isTransitioningRef.current = false;
      }
    }, 200);
  }, [done, questions, index, wrong, correct, session, buildOptions]);

  useEffect(() => {
    if (loading || done || selected !== null) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    setTimeLeftMs(QUESTION_TIME_LIMIT * 1000);
    const intervalMs = 50;

    timerRef.current = setInterval(() => {
      setTimeLeftMs(prev => {
        if (prev <= intervalMs) {
          clearInterval(timerRef.current);
          handleTimeOut();
          return 0;
        }
        return prev - intervalMs;
      });
    }, intervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [index, loading, done, selected, handleTimeOut]);

  const handleSelect = async (opt: string) => {
    if (selected !== null || isTransitioningRef.current) return;
    isTransitioningRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    setSelected(opt);
    const currentQ = questions[index];
    const isCorrect = opt === currentQ.correctAnswer;
    const newCorrect = correct + (isCorrect ? 1 : 0);
    const newWrong = wrong + (isCorrect ? 0 : 1);
    setCorrect(newCorrect);
    setWrong(newWrong);

    setUserAnswers(prev => [
      ...prev,
      {
        questionText: currentQ?.questionText || '',
        selectedOpt: opt,
        correctAnswer: currentQ?.correctAnswer || '',
        isCorrect,
        isTimeout: false,
      }
    ]);

    if (!isCorrect && currentQ?.cardId) {
      try {
        await submitReview({ cardId: currentQ.cardId, quality: 0, sessionId: session?.id });
      } catch (err) {}
    }

    // Quick transition without revealing correct/wrong during the test!
    setTimeout(async () => {
      if (index + 1 >= questions.length) {
        if (session) await endSession(session.id, newCorrect, newWrong);
        setDone(true);
      } else {
        setIndex(i => i + 1);
        setSelected(null);
        buildOptions(questions, index + 1);
        setTimeLeftMs(QUESTION_TIME_LIMIT * 1000);
        isTransitioningRef.current = false;
      }
    }, 250);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
    </div>
  );

  if (done) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '40px 20px', position: 'relative' }}>
      <Confetti />
      <div style={{ maxWidth: 680, margin: '0 auto', zIndex: 10, position: 'relative' }}>
        
        {/* Summary Card */}
        <div className="card animate-up" style={{ textAlign: 'center', padding: 40, marginBottom: 28 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>
            {correct / (questions.length || 1) >= 0.8 ? '🏆' : correct / (questions.length || 1) >= 0.5 ? '⚡' : '💪'}
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Kết quả Bài Test Đếm Ngược</h2>
          <div style={{ fontSize: 52, fontWeight: 900, color: correct / (questions.length || 1) >= 0.7 ? 'var(--green)' : 'var(--amber)', marginBottom: 8 }}>
            {Math.round((correct / (questions.length || 1)) * 100)}%
          </div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Đã hoàn thành tất cả {questions.length} câu hỏi trong bài test
          </p>

          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Trả lời Đúng</span>
              <span className="stat-value" style={{ color: 'var(--green)', fontSize: 32 }}>{correct}</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Sai / Hết giờ</span>
              <span className="stat-value" style={{ color: 'var(--rose)', fontSize: 32 }}>{wrong}</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => {
                setIndex(0);
                setSelected(null);
                setUserAnswers([]);
                setCorrect(0);
                setWrong(0);
                setDone(false);
                setTimeLeftMs(QUESTION_TIME_LIMIT * 1000);
                isTransitioningRef.current = false;
                buildOptions(questions, 0);
              }}
            >
              <RotateCcw size={18} /> Thử thách lại
            </button>
            <Link href={`/public-decks`} className="btn btn-secondary btn-lg" style={{ flex: 1, justifyContent: 'center' }}>
              Về Mẫu bộ từ
            </Link>
          </div>
        </div>

        {/* Detailed Answer Key Breakdown */}
        <div className="card animate-up" style={{ padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
            <FileText size={20} color="var(--accent)" />
            <h3 style={{ fontSize: 18, fontWeight: 800 }}>Chi tiết kết quả bài Test</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {userAnswers.map((ans, idx) => (
              <div
                key={idx}
                style={{
                  padding: 16,
                  borderRadius: 'var(--radius-sm)',
                  border: `1.5px solid ${ans.isCorrect ? 'rgba(5,150,105,0.3)' : 'rgba(225,29,72,0.3)'}`,
                  background: ans.isCorrect ? 'rgba(5,150,105,0.04)' : 'rgba(225,29,72,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: 8 }}>Câu {idx + 1}:</span>
                    {ans.questionText}
                  </div>
                  {ans.isCorrect ? (
                    <span className="badge badge-green" style={{ gap: 4 }}>
                      <CheckCircle size={12} /> Đúng
                    </span>
                  ) : ans.isTimeout ? (
                    <span className="badge badge-rose" style={{ gap: 4 }}>
                      <Clock size={12} /> Hết giờ
                    </span>
                  ) : (
                    <span className="badge badge-rose" style={{ gap: 4 }}>
                      <XCircle size={12} /> Sai
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {!ans.isCorrect && (
                    <div style={{ color: 'var(--rose)', fontWeight: 600 }}>
                      ❌ Bạn chọn: {ans.selectedOpt || 'Không chọn (Hết thời gian)'}
                    </div>
                  )}
                  <div style={{ color: 'var(--green)', fontWeight: 700 }}>
                    🟢 Đáp án đúng: {ans.correctAnswer}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );

  const q = questions[index];
  const progress = (index / questions.length) * 100;
  const timeSeconds = (timeLeftMs / 1000).toFixed(1);
  const timeRatio = timeLeftMs / (QUESTION_TIME_LIMIT * 1000);

  let timerColor = 'var(--accent)';
  if (timeRatio < 0.4) timerColor = 'var(--amber)';
  if (timeRatio < 0.2) timerColor = 'var(--rose)';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href={`/public-decks`} className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Zap size={16} color="var(--amber)" />
            <span style={{ fontSize: 13, fontWeight: 700 }}>Bài Test Đếm Ngược ({QUESTION_TIME_LIMIT}s/câu)</span>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{index + 1}/{questions.length}</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
          <span>Đang làm bài test (kết quả công bố khi hoàn thành)</span>
        </div>
      </div>

      {/* Main Question Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px' }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          
          {/* Animated Decreasing Countdown Bar */}
          <div className="card" style={{ marginBottom: 20, padding: '16px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: timerColor }}>
                <Clock size={16} className={timeRatio < 0.2 ? 'animate-pulse' : ''} />
                <span>Thời gian còn lại: {timeSeconds}s</span>
              </div>
              <span className="badge badge-accent" style={{ background: timeRatio < 0.2 ? 'rgba(225,29,72,0.1)' : undefined, color: timerColor }}>
                {Math.round(timeRatio * 100)}%
              </span>
            </div>

            {/* Smooth Shrinking Progress Bar */}
            <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${timeRatio * 100}%`,
                  background: timerColor,
                  borderRadius: 4,
                  transition: 'width 0.05s linear, background-color 0.3s ease',
                  boxShadow: timeRatio < 0.2 ? '0 0 10px rgba(225,29,72,0.5)' : undefined,
                }}
              />
            </div>
          </div>

          {/* Question Box */}
          <div className="card" style={{ marginBottom: 20, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              Câu hỏi {index + 1} / {questions.length}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.5, color: 'var(--text-primary)' }}>
              {q?.questionText}
            </div>
          </div>

          {/* 4 Choices */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {options.map((opt, i) => {
              const isSelectedOpt = selected === opt;
              return (
                <button
                  key={i}
                  id={`test-option-${i}`}
                  className="quiz-option"
                  style={{
                    border: isSelectedOpt ? '1.5px solid var(--accent)' : undefined,
                    background: isSelectedOpt ? 'var(--accent-glow)' : undefined,
                  }}
                  onClick={() => handleSelect(opt)}
                  disabled={selected !== null}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>
                      <strong style={{ marginRight: 10, opacity: 0.5 }}>{String.fromCharCode(65 + i)}.</strong>
                      {opt}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
