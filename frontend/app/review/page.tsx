'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { getDueCards, submitReview, startSession, endSession } from '@/lib/api';
import { ArrowLeft, Brain, CheckCircle, RotateCcw } from 'lucide-react';

const RATING_BUTTONS = [
  { label: 'Again', key: 'again', quality: 0, className: 'rating-again', days: 'lại ngay' },
  { label: 'Hard',  key: 'hard',  quality: 2, className: 'rating-hard',  days: '~1 ngày' },
  { label: 'Good',  key: 'good',  quality: 4, className: 'rating-good',  days: '~6 ngày' },
  { label: 'Easy',  key: 'easy',  quality: 5, className: 'rating-easy',  days: '~15+ ngày' },
];

function ReviewContent() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deckId') || undefined;

  const [cards, setCards] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());

  useEffect(() => {
    getDueCards(deckId)
      .then(async (due) => {
        setCards(due || []);
        if (due && due.length > 0) {
          try {
            const s = await startSession(deckId || '', 'spaced_review');
            setSession(s);
          } catch (err) {
            console.error('Failed to start session:', err);
          }
        }
      })
      .catch(console.error)
      .finally(() => {
        setLoading(false);
        setStartTime(Date.now());
      });
  }, [deckId]);

  const currentItem = cards[index];
  const currentCard = currentItem?.card;

  const handleRate = async (quality: number) => {
    if (!currentCard) return;
    await submitReview({
      cardId: currentCard.id,
      quality,
      responseTimeMs: Date.now() - startTime,
      sessionId: session?.id,
    });
    const isCorrect = quality >= 3;
    const newCorrect = correct + (isCorrect ? 1 : 0);
    const newWrong = wrong + (isCorrect ? 0 : 1);
    setCorrect(newCorrect);
    setWrong(newWrong);

    // If rated 'Again' (quality < 3), re-queue the card to show up again at the end of this session!
    if (!isCorrect && currentItem) {
      setCards(prev => [...prev, currentItem]);
    }

    if (index + 1 >= (isCorrect ? cards.length : cards.length + 1)) {
      if (session) await endSession(session.id, newCorrect, newWrong);
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setFlipped(false);
      setStartTime(Date.now());
    }
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
      </main>
    </div>
  );

  if (cards.length === 0) return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div style={{ fontSize: 72 }}>🎊</div>
          <div className="empty-title" style={{ fontSize: 24, color: 'var(--green)' }}>Xuất sắc!</div>
          <div className="empty-desc" style={{ maxWidth: 440, fontSize: 15, lineHeight: 1.6 }}>
            Không có từ nào đến hạn ôn hôm nay. Thuật toán SM-2 đã tự động sắp xếp lịch nhắc lại từ vựng cho bạn vào những ngày tiếp theo!
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <Link href="/dashboard" className="btn btn-primary btn-lg">Về Dashboard</Link>
            <Link href="/decks" className="btn btn-secondary btn-lg">Luyện tập Flashcard tự do</Link>
          </div>
        </div>
      </main>
    </div>
  );

  if (done) return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card animate-up" style={{ maxWidth: 420, width: '100%', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Phiên ôn tập hoàn thành!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Bạn đã ôn {cards.length} từ theo lịch trình SM-2
          </p>
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Nhớ tốt</span>
              <span className="stat-value" style={{ color: 'var(--green)', fontSize: 36 }}>{correct}</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Cần ôn thêm</span>
              <span className="stat-value" style={{ color: 'var(--rose)', fontSize: 36 }}>{wrong}</span>
            </div>
          </div>
          <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, padding: 16, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            💡 SM-2 đã cập nhật lịch nhắc lại cho tất cả các từ. Từ bị sai sẽ xuất hiện lại sớm hơn!
          </div>
          <Link href="/dashboard" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
            Về Dashboard
          </Link>
        </div>
      </main>
    </div>
  );

  const progress = (index / cards.length) * 100;

  return (
    <div className="app-layout">
      <Sidebar dueCount={cards.length - index} />
      <main className="main-content animate-fade">
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <Link href="/dashboard" className="btn btn-ghost btn-sm btn-icon">
              <ArrowLeft size={18} />
            </Link>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Brain size={18} color="var(--accent-light)" />
                <span style={{ fontWeight: 700 }}>Ôn tập Spaced Repetition</span>
                <span className="badge badge-accent">{index + 1}/{cards.length}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>✓ {correct}</span>
              <span style={{ fontSize: 13, color: 'var(--rose)', fontWeight: 600 }}>✗ {wrong}</span>
            </div>
          </div>

          {/* Context */}
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, textAlign: 'center' }}>
            📅 Đến hạn: {currentItem?.interval === 0 ? 'Từ mới' : `Interval ${currentItem?.interval} ngày`}
            {' · '}Ôn {currentItem?.repetitions} lần
          </div>

          {/* Flashcard */}
          <div className="flashcard-scene" onClick={() => setFlipped(f => !f)} style={{ marginBottom: 28 }}>
            <div className={`flashcard ${flipped ? 'flipped' : ''}`}>
              <div className="flashcard-face flashcard-front">
                {currentCard?.partOfSpeech && (
                  <span className="badge badge-purple" style={{ marginBottom: 20 }}>{currentCard.partOfSpeech}</span>
                )}
                <div className="flashcard-term">{currentCard?.term}</div>
                {currentCard?.phonetic && <div className="flashcard-phonetic">{currentCard.phonetic}</div>}
                <div className="flashcard-hint" style={{ marginTop: 40 }}>Click để xem nghĩa</div>
              </div>
              <div className="flashcard-face flashcard-back">
                <div className="flashcard-term" style={{ fontSize: 26, marginBottom: 16 }}>{currentCard?.term}</div>
                <div className="flashcard-definition">{currentCard?.definition}</div>
                {currentCard?.exampleSentence && (
                  <div className="flashcard-example">"{currentCard.exampleSentence}"</div>
                )}
              </div>
            </div>
          </div>

          {/* Rating */}
          {flipped ? (
            <div>
              <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                Bạn nhớ từ này ở mức nào?
              </p>
              <div className="rating-buttons">
                {RATING_BUTTONS.map(r => (
                  <button key={r.key} id={`rate-${r.key}`} className={`rating-btn ${r.className}`} onClick={() => handleRate(r.quality)}>
                    {r.label}
                    <span className="days">{r.days}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
              Nhấn vào thẻ để xem nghĩa, sau đó đánh giá
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="app-layout">
        <Sidebar />
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
        </main>
      </div>
    }>
      <ReviewContent />
    </Suspense>
  );
}
