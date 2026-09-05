'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuestions, generateQuestions, startSession, endSession, submitReview } from '@/lib/api';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, Clock, Zap, AlertTriangle } from 'lucide-react';
import Confetti from '@/components/Confetti';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

const QUESTION_TIME_LIMIT = 15; // 15 seconds per question

export default function TimedTestPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useRouter();
  const [questions, setQuestions] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [options, setOptions] = useState<string[]>([]);
  
  // Timer state (in milliseconds for smooth bar animation)
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

  // Start question timer tick
  const handleTimeOut = useCallback(async () => {
    if (isTransitioningRef.current || done) return;
    isTransitioningRef.current = true;
    setSelected('__TIMEOUT__');

    const currentQ = questions[index];
    const newWrong = wrong + 1;
    setWrong(newWrong);

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
    }, 1200);
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

    if (!isCorrect && currentQ?.cardId) {
      try {
        await submitReview({ cardId: currentQ.cardId, quality: 0, sessionId: session?.id });
      } catch (err) {}
    }

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
    }, 1000);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
    </div>
  );

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      <Confetti />
      <div className="card animate-up" style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: 40, zIndex: 10 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>
          {correct / questions.length >= 0.8 ? '🏆' : correct / questions.length >= 0.5 ? '⚡' : '💪'}
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Kết quả Bài Test Đếm Ngược</h2>
        <div style={{ fontSize: 52, fontWeight: 900, color: correct / questions.length >= 0.7 ? 'var(--green)' : 'var(--amber)', marginBottom: 8 }}>
          {Math.round((correct / (questions.length || 1)) * 100)}%
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          {correct}/{questions.length} câu trả lời đúng
        </p>

        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Đúng</span>
            <span className="stat-value" style={{ color: 'var(--green)', fontSize: 32 }}>{correct}</span>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Sai / Trễ</span>
            <span className="stat-value" style={{ color: 'var(--rose)', fontSize: 32 }}>{wrong}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => {
              setIndex(0);
              setSelected(null);
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
          <Link href={`/public-decks`} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
            Về Mẫu bộ từ
          </Link>
        </div>
      </div>
    </div>
  );

  const q = questions[index];
  const progress = (index / questions.length) * 100;
  const timeSeconds = (timeLeftMs / 1000).toFixed(1);
  const timeRatio = timeLeftMs / (QUESTION_TIME_LIMIT * 1000);

  // Timer Bar Color based on remaining time
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
        <div style={{ display: 'flex', gap: 12, fontSize: 14, fontWeight: 700 }}>
          <span style={{ color: 'var(--green)' }}>✓ {correct}</span>
          <span style={{ color: 'var(--rose)' }}>✗ {wrong}</span>
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
              Câu hỏi {index + 1}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.5, color: 'var(--text-primary)' }}>
              {q?.questionText}
            </div>
          </div>

          {/* 4 Choices */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {options.map((opt, i) => {
              let cls = 'quiz-option';
              if (selected !== null) {
                if (opt === q?.correctAnswer) cls += ' correct';
                else if (opt === selected) cls += ' wrong';
              }
              return (
                <button
                  key={i}
                  id={`test-option-${i}`}
                  className={cls}
                  onClick={() => handleSelect(opt)}
                  disabled={selected !== null}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <span>
                      <strong style={{ marginRight: 10, opacity: 0.5 }}>{String.fromCharCode(65 + i)}.</strong>
                      {opt}
                    </span>
                    {selected !== null && opt === q?.correctAnswer && (
                      <CheckCircle size={18} color="var(--green)" />
                    )}
                    {selected !== null && opt === selected && opt !== q?.correctAnswer && (
                      <XCircle size={18} color="var(--rose)" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {selected === '__TIMEOUT__' && (
            <div className="card animate-up" style={{ marginTop: 16, padding: 14, background: 'rgba(225,29,72,0.08)', border: '1px solid rgba(225,29,72,0.25)', color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600 }}>
              <AlertTriangle size={18} />
              <span>Hết thời gian! Đáp án đúng là: <strong>"{q?.correctAnswer}"</strong></span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
