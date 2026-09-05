'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQuestions, generateQuestions, startSession, endSession, submitReview } from '@/lib/api';
import { ArrowLeft, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function QuizPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const [questions, setQuestions] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    getQuestions(deckId, 20).then(async (q) => {
      if (q.length === 0) {
        await generateQuestions(deckId);
        const q2 = await getQuestions(deckId, 20);
        setQuestions(q2);
        buildOptions(q2, 0);
      } else {
        setQuestions(q);
        buildOptions(q, 0);
      }
      const s = await startSession(deckId, 'quiz');
      setSession(s);
      setLoading(false);
    });
  }, [deckId]);

  const buildOptions = (qs: any[], i: number) => {
    if (!qs[i]) return;
    const q = qs[i];
    const opts = shuffle([q.correctAnswer, ...(q.distractors || [])]);
    setOptions(opts);
  };

  const handleSelect = async (opt: string) => {
    if (selected) return;
    setSelected(opt);
    const currentQ = questions[index];
    const isCorrect = opt === currentQ.correctAnswer;
    const newCorrect = correct + (isCorrect ? 1 : 0);
    const newWrong = wrong + (isCorrect ? 0 : 1);
    setCorrect(newCorrect);
    setWrong(newWrong);

    // If answered WRONG in Quiz, automatically enroll card into Today's Spaced Repetition review queue with 1-day reminder!
    if (!isCorrect && currentQ?.cardId) {
      try {
        await submitReview({ cardId: currentQ.cardId, quality: 0, sessionId: session?.id });
      } catch (err) {
        console.error('Failed to submit wrong quiz item to review queue:', err);
      }
    }

    setTimeout(async () => {
      if (index + 1 >= questions.length) {
        if (session) await endSession(session.id, newCorrect, newWrong);
        setDone(true);
      } else {
        setIndex(i => i + 1);
        setSelected(null);
        buildOptions(questions, index + 1);
      }
    }, 1000);
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
    </div>
  );

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="card animate-up" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: 40 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>{correct / questions.length >= 0.8 ? '🌟' : '📖'}</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Kết quả Quiz</h2>
        <div style={{ fontSize: 48, fontWeight: 900, color: correct / questions.length >= 0.8 ? 'var(--green)' : 'var(--amber)', marginBottom: 8 }}>
          {Math.round((correct / questions.length) * 100)}%
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
          {correct}/{questions.length} câu đúng
        </p>
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button className="btn btn-primary btn-lg" onClick={() => { setIndex(0); setSelected(null); setCorrect(0); setWrong(0); setDone(false); buildOptions(questions, 0); }}>
            <RotateCcw size={18} /> Làm lại
          </button>
          <Link href={`/decks/${deckId}`} className="btn btn-secondary" style={{ justifyContent: 'center' }}>Về bộ từ</Link>
        </div>
      </div>
    </div>
  );

  const q = questions[index];
  const progress = (index / questions.length) * 100;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href={`/decks/${deckId}`} className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>{index + 1}/{questions.length}</span>
        <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✓ {correct}</span>
        <span style={{ fontSize: 13, color: 'var(--rose)', fontWeight: 600 }}>✗ {wrong}</span>
      </div>

      {/* Question */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          <div className="card" style={{ marginBottom: 24, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Câu {index + 1}
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.5, color: 'var(--text-primary)' }}>
              {q?.questionText}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {options.map((opt, i) => {
              let cls = 'quiz-option';
              if (selected) {
                if (opt === q.correctAnswer) cls += ' correct';
                else if (opt === selected) cls += ' wrong';
              }
              return (
                <button key={i} id={`quiz-option-${i}`} className={cls} onClick={() => handleSelect(opt)} disabled={!!selected}>
                  <span style={{ marginRight: 10, opacity: 0.5, fontSize: 12 }}>{String.fromCharCode(65 + i)}.</span>
                  {opt}
                  {selected && opt === q.correctAnswer && <CheckCircle size={18} style={{ float: 'right', color: 'var(--green)' }} />}
                  {selected && opt === selected && opt !== q.correctAnswer && <XCircle size={18} style={{ float: 'right', color: 'var(--rose)' }} />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
