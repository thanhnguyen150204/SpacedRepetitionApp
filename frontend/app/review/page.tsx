'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { getDueCards, submitReview, startSession, endSession } from '@/lib/api';
import { ArrowLeft, Brain, CheckCircle, XCircle, ChevronRight, RotateCcw, Volume2, Sparkles } from 'lucide-react';

function ReviewContent() {
  const searchParams = useSearchParams();
  const deckId = searchParams.get('deckId') || undefined;

  const [cards, setCards] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [session, setSession] = useState<any>(null);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);

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
  const options = currentItem?.options || [];

  const handleSelectOption = useCallback(async (option: string) => {
    if (isAnswered || !currentCard) return;

    setSelectedOpt(option);
    setIsAnswered(true);

    const isRight = option === currentCard.definition;
    const responseTimeMs = Date.now() - startTime;

    if (isRight) {
      const newCorrect = correct + 1;
      setCorrect(newCorrect);
      
      // Quality logic: Good (4) for early stages, Easy (5) if already repeated
      const quality = currentItem.repetitions >= 2 ? 5 : 4;
      
      await submitReview({
        cardId: currentCard.id,
        quality,
        responseTimeMs,
        sessionId: session?.id,
      });

      // Auto advance on correct answer
      setTimeout(async () => {
        if (index + 1 >= cards.length) {
          if (session) await endSession(session.id, newCorrect, wrong);
          setDone(true);
        } else {
          setIndex(i => i + 1);
          setSelectedOpt(null);
          setIsAnswered(false);
          setStartTime(Date.now());
        }
      }, 900);
    } else {
      const newWrong = wrong + 1;
      setWrong(newWrong);

      // Quality 0 (Again): Scheduled for 1 day, and re-queued in current session
      await submitReview({
        cardId: currentCard.id,
        quality: 0,
        responseTimeMs,
        sessionId: session?.id,
      });

      // Re-queue card to end of today's session
      setCards(prev => [...prev, currentItem]);
    }
  }, [isAnswered, currentCard, startTime, correct, wrong, currentItem, session, index, cards.length]);

  const handleNextAfterWrong = async () => {
    if (index + 1 >= cards.length) {
      if (session) await endSession(session.id, correct, wrong);
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setSelectedOpt(null);
      setIsAnswered(false);
      setStartTime(Date.now());
    }
  };

  // Keyboard shortcuts (1, 2, 3, 4)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isAnswered) {
        if (e.code === 'Enter' || e.code === 'Space') {
          if (selectedOpt !== currentCard?.definition) {
            handleNextAfterWrong();
          }
        }
        return;
      }
      if (options.length >= 4) {
        if (e.code === 'Digit1' || e.code === 'Numpad1') handleSelectOption(options[0]);
        if (e.code === 'Digit2' || e.code === 'Numpad2') handleSelectOption(options[1]);
        if (e.code === 'Digit3' || e.code === 'Numpad3') handleSelectOption(options[2]);
        if (e.code === 'Digit4' || e.code === 'Numpad4') handleSelectOption(options[3]);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isAnswered, options, selectedOpt, currentCard, handleSelectOption]);

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
      <Sidebar dueCount={0} />
      <main className="main-content">
        <div className="empty-state" style={{ marginTop: 60 }}>
          <div style={{ fontSize: 72 }}>🎊</div>
          <div className="empty-title" style={{ fontSize: 24, color: 'var(--green)' }}>Xuất sắc!</div>
          <div className="empty-desc" style={{ maxWidth: 440, fontSize: 15, lineHeight: 1.6 }}>
            Hiện tại không có từ nào đến hạn ôn tập cho tài khoản của bạn.
            Hãy tiếp tục học từ mới hoặc đánh dấu thêm từ để nhắc lại theo chu trình Spaced Repetition!
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <Link href="/dashboard" className="btn btn-primary btn-lg">Về Dashboard</Link>
            <Link href="/decks" className="btn btn-secondary btn-lg">Xem bộ từ vựng</Link>
          </div>
        </div>
      </main>
    </div>
  );

  if (done) return (
    <div className="app-layout">
      <Sidebar dueCount={0} />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="card animate-up" style={{ maxWidth: 460, width: '100%', textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Hoàn thành lượt ôn tập!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24 }}>
            Bạn đã xuất sắc hoàn thành lượt ôn tập theo thuật toán Spaced Repetition (SM-2)
          </p>
          <div className="grid-2" style={{ marginBottom: 24 }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Trả lời Đúng</span>
              <span className="stat-value" style={{ color: 'var(--green)', fontSize: 36 }}>{correct}</span>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <span className="stat-label">Cần xem lại</span>
              <span className="stat-value" style={{ color: 'var(--rose)', fontSize: 36 }}>{wrong}</span>
            </div>
          </div>
          <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 12, padding: 16, marginBottom: 24, fontSize: 13, color: 'var(--text-secondary)' }}>
            💡 Các từ trả lời đúng đã được tăng interval hẹn ngày nhắc lại. Các từ trả lời sai sẽ được nhắc lại sau 1 ngày!
          </div>
          <Link href="/dashboard" className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
            Về Dashboard
          </Link>
        </div>
      </main>
    </div>
  );

  const progress = Math.min(100, ((index) / cards.length) * 100);

  return (
    <div className="app-layout">
      <Sidebar dueCount={cards.length - index} />
      <main className="main-content animate-fade">
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          {/* Top Header Navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24 }}>
            <Link href="/dashboard" className="btn btn-ghost btn-sm btn-icon">
              <ArrowLeft size={18} />
            </Link>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Brain size={18} color="var(--accent-light)" />
                <span style={{ fontWeight: 700 }}>Ôn tập 4 Đáp án (Spaced Repetition)</span>
                <span className="badge badge-accent">{index + 1} / {cards.length}</span>
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

          {/* Question Card */}
          <div className="card" style={{ marginBottom: 24, padding: 36, textAlign: 'center', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
              {currentCard?.partOfSpeech && (
                <span className="badge badge-purple">{currentCard.partOfSpeech}</span>
              )}
              {currentCard?.phonetic && (
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{currentCard.phonetic}</span>
              )}
            </div>

            <h1 style={{ fontSize: 36, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              {currentCard?.term}
            </h1>

            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
              Hãy chọn đáp án mang nghĩa chính xác của từ vựng này:
            </p>
          </div>

          {/* 4 Choices Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
            {options.map((opt: string, i: number) => {
              let btnStyle = {
                width: '100%',
                padding: '16px 20px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                fontSize: '15px',
                fontWeight: 500,
                cursor: isAnswered ? 'default' : 'pointer',
                textAlign: 'left' as const,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(15,23,42,0.03)',
              };

              if (isAnswered) {
                if (opt === currentCard?.definition) {
                  btnStyle.border = '1.5px solid var(--green)';
                  btnStyle.background = 'rgba(5,150,105,0.1)';
                  btnStyle.color = 'var(--green)';
                  btnStyle.fontWeight = 700;
                } else if (opt === selectedOpt) {
                  btnStyle.border = '1.5px solid var(--rose)';
                  btnStyle.background = 'rgba(225,29,72,0.1)';
                  btnStyle.color = 'var(--rose)';
                  btnStyle.fontWeight = 700;
                }
              }

              return (
                <button
                  key={i}
                  id={`review-option-${i}`}
                  style={btnStyle}
                  className={!isAnswered ? 'quiz-option' : ''}
                  onClick={() => handleSelectOption(opt)}
                  disabled={isAnswered}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: isAnswered && opt === currentCard?.definition
                        ? 'var(--green)' : isAnswered && opt === selectedOpt
                        ? 'var(--rose)' : 'var(--bg-card-hover)',
                      color: isAnswered && (opt === currentCard?.definition || opt === selectedOpt) ? '#fff' : 'var(--text-muted)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </div>

                  {isAnswered && opt === currentCard?.definition && (
                    <CheckCircle size={20} color="var(--green)" />
                  )}
                  {isAnswered && opt === selectedOpt && opt !== currentCard?.definition && (
                    <XCircle size={20} color="var(--rose)" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback & Advance Banner when wrong */}
          {isAnswered && selectedOpt !== currentCard?.definition && (
            <div className="card animate-up" style={{
              padding: 20,
              background: 'rgba(225,29,72,0.06)',
              border: '1px solid rgba(225,29,72,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
            }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--rose)', fontSize: 15, marginBottom: 4 }}>
                  ✗ Chưa chính xác!
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Từ <strong>"{currentCard?.term}"</strong> nghĩa là: <strong style={{ color: 'var(--green)' }}>"{currentCard?.definition}"</strong>.
                  <br />
                  Từ này đã được đánh dấu lại ngay sau 1 ngày và sẽ xuất hiện lại ở cuối phiên hôm nay.
                </div>
              </div>
              <button className="btn btn-primary" onClick={handleNextAfterWrong}>
                Tiếp tục <ChevronRight size={16} />
              </button>
            </div>
          )}

          {!isAnswered && (
            <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
              💡 Phím tắt nhanh: Dùng <strong>1, 2, 3, 4</strong> trên bàn phím để chọn đáp án A, B, C, D
            </div>
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
