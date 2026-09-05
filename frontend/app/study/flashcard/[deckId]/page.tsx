'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCards, startSession, endSession, submitReview } from '@/lib/api';
import { ArrowLeft, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import Confetti from '@/components/Confetti';

const RATING_BUTTONS = [
  { label: 'Again', key: 'again', quality: 0, className: 'rating-again', days: 'lại ngay' },
  { label: 'Hard',  key: 'hard',  quality: 2, className: 'rating-hard',  days: '~1 ngày' },
  { label: 'Good',  key: 'good',  quality: 4, className: 'rating-good',  days: '~6 ngày' },
  { label: 'Easy',  key: 'easy',  quality: 5, className: 'rating-easy',  days: '~15+ ngày' },
];

export default function FlashcardPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useRouter();
  const [cards, setCards] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  useEffect(() => {
    getCards(deckId).then(async c => {
      const shuffled = [...c].sort(() => Math.random() - 0.5);
      setCards(shuffled);
      const s = await startSession(deckId, 'flashcard');
      setSession(s);
      setLoading(false);
      setStartTime(Date.now());
    });
  }, [deckId]);

  const currentCard = cards[index];

  const handleRate = useCallback(async (quality: number) => {
    if (!currentCard) return;
    await submitReview({
      cardId: currentCard.id,
      quality,
      responseTimeMs: Date.now() - startTime,
      sessionId: session?.id,
    });
    if (quality >= 3) setCorrect(c => c + 1);
    else setWrong(w => w + 1);

    if (index + 1 >= cards.length) {
      await endSession(session.id, quality >= 3 ? correct + 1 : correct, quality < 3 ? wrong + 1 : wrong);
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setFlipped(false);
      setStartTime(Date.now());
    }
  }, [currentCard, index, cards, session, correct, wrong, startTime]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); setFlipped(f => !f); }
      if (flipped) {
        if (e.code === 'Digit1') handleRate(0);
        if (e.code === 'Digit2') handleRate(2);
        if (e.code === 'Digit3') handleRate(4);
        if (e.code === 'Digit4') handleRate(5);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [flipped, handleRate]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
      <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
    </div>
  );

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)', position: 'relative' }}>
      <Confetti />
      <div className="card animate-up" style={{ maxWidth: 400, width: '100%', textAlign: 'center', padding: 40, zIndex: 10 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Hoàn thành!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>Bạn đã học xong {cards.length} từ</p>
        <div className="grid-2" style={{ marginBottom: 24 }}>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Đúng</span>
            <span className="stat-value" style={{ color: 'var(--green)', fontSize: 40 }}>{correct}</span>
          </div>
          <div className="stat-card" style={{ textAlign: 'center' }}>
            <span className="stat-label">Sai</span>
            <span className="stat-value" style={{ color: 'var(--rose)', fontSize: 40 }}>{wrong}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
          <button className="btn btn-primary btn-lg" onClick={() => { setIndex(0); setFlipped(false); setCorrect(0); setWrong(0); setDone(false); }}>
            <RotateCcw size={18} /> Học lại
          </button>
          <Link href={`/decks/${deckId}`} className="btn btn-secondary" style={{ justifyContent: 'center' }}>
            Về bộ từ
          </Link>
        </div>
      </div>
    </div>
  );

  const progress = ((index) / cards.length) * 100;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
        <Link href={`/decks/${deckId}`} className="btn btn-ghost btn-sm btn-icon">
          <ArrowLeft size={18} />
        </Link>
        <div style={{ flex: 1 }}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0 }}>
          {index + 1} / {cards.length}
        </span>
        <div style={{ display: 'flex', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✓ {correct}</span>
          <span style={{ fontSize: 13, color: 'var(--rose)', fontWeight: 600 }}>✗ {wrong}</span>
        </div>
      </div>

      {/* Card Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          <div className="flashcard-scene" onClick={() => setFlipped(f => !f)}>
            <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
              {/* Front */}
              <div className="flashcard-face flashcard-front">
                <div style={{ marginBottom: 12 }}>
                  {currentCard?.partOfSpeech && (
                    <span className="badge badge-purple" style={{ marginBottom: 16, display: 'inline-block' }}>
                      {currentCard.partOfSpeech}
                    </span>
                  )}
                </div>
                <div className="flashcard-term">{currentCard?.term}</div>
                {currentCard?.phonetic && <div className="flashcard-phonetic">{currentCard.phonetic}</div>}
                <div className="flashcard-hint" style={{ marginTop: 32 }}>
                  Click hoặc nhấn Space để xem nghĩa
                </div>
              </div>

              {/* Back */}
              <div className="flashcard-face flashcard-back">
                <div className="flashcard-term" style={{ fontSize: 28, marginBottom: 16 }}>{currentCard?.term}</div>
                <div className="flashcard-definition">{currentCard?.definition}</div>
                {currentCard?.exampleSentence && (
                  <div className="flashcard-example">"{currentCard.exampleSentence}"</div>
                )}
              </div>
            </div>
          </div>

          {/* Rating Buttons */}
          <div style={{ marginTop: 32 }}>
            {!flipped ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Nhấn vào thẻ để xem nghĩa, rồi đánh giá mức độ nhớ
              </div>
            ) : (
              <div className="rating-buttons">
                {RATING_BUTTONS.map(r => (
                  <button
                    key={r.key}
                    id={`rate-${r.key}`}
                    className={`rating-btn ${r.className}`}
                    onClick={() => handleRate(r.quality)}
                  >
                    {r.label}
                    <span className="days">{r.days}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {flipped && (
            <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
              Phím tắt: 1=Again  2=Hard  3=Good  4=Easy
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
