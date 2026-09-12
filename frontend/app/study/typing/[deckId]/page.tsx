'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCards, startSession, endSession, submitReview, getDeck } from '@/lib/api';
import { ArrowLeft, RotateCcw, Keyboard, CheckCircle2, XCircle, Volume2, ArrowRight, CornerDownLeft } from 'lucide-react';
import Confetti from '@/components/Confetti';

interface CharComparison {
  char: string;
  expectedChar: string;
  isMatch: boolean;
}

// Clean term: Filter out "(type of word)" e.g., (v.), (n.), (adj.), (adv.), (phr.), (prep.) and trim whitespace from both ends
function cleanWordTerm(rawTerm: string): string {
  if (!rawTerm) return '';
  // Remove parenthetical annotations like (v.), (n.), (adj.), (adv.), (phrase), (prep.), (v), (n), etc.
  let cleaned = rawTerm.replace(/\s*\([^)]*\)/g, '');
  cleaned = cleaned.trim();
  return cleaned || rawTerm.trim();
}

export default function TypingPracticePage() {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useRouter();

  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState<'typing' | 'checked'>('typing');
  
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize deck and cards
  useEffect(() => {
    Promise.all([getDeck(deckId), getCards(deckId)])
      .then(async ([d, c]) => {
        setDeck(d);
        if (c && c.length > 0) {
          // Shuffle cards for random practice order
          const shuffled = [...c].sort(() => Math.random() - 0.5);
          setCards(shuffled);
          try {
            startSession(deckId, 'typing').then(setSession).catch(console.error);
          } catch (e) {}
        }
      })
      .finally(() => setLoading(false));
  }, [deckId]);

  // Focus input INSTANTLY whenever index or phase changes to 'typing'
  useEffect(() => {
    if (phase === 'typing' && inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [index, phase]);

  const currentCard = cards[index];
  const targetTerm = currentCard ? cleanWordTerm(currentCard.term) : '';

  // TTS audio playback
  const speakWord = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
  };

  // Compare user input character by character with target word (case-insensitive & trimmed)
  const getCharComparison = (target: string, input: string): { comparisons: CharComparison[]; isExact: boolean } => {
    const cleanTarget = cleanWordTerm(target);
    const cleanInput = input.trim();

    const isExact = cleanTarget.toLowerCase() === cleanInput.toLowerCase();
    const maxLength = Math.max(cleanTarget.length, cleanInput.length);
    const comparisons: CharComparison[] = [];

    for (let i = 0; i < maxLength; i++) {
      const expectedChar = cleanTarget[i] || '';
      const inputChar = cleanInput[i] || '';
      
      const isMatch = expectedChar.toLowerCase() === inputChar.toLowerCase();
      comparisons.push({
        char: inputChar,
        expectedChar,
        isMatch,
      });
    }

    return { comparisons, isExact };
  };

  // INSTANT CHECK: Update state immediately (0ms delay), trigger review submit asynchronously in background
  const handleCheck = useCallback(() => {
    if (!currentCard || !userInput.trim()) return;

    const { isExact } = getCharComparison(currentCard.term, userInput);

    // Update UI state INSTANTLY
    if (isExact) {
      setCorrect(c => c + 1);
    } else {
      setWrong(w => w + 1);
      // Non-blocking background API submission for Spaced Repetition queue
      if (currentCard.id) {
        submitReview({ cardId: currentCard.id, quality: 0, sessionId: session?.id }).catch(err => {
          console.error('Failed to submit card review asynchronously:', err);
        });
      }
    }

    setPhase('checked');
    speakWord(targetTerm);
  }, [currentCard, userInput, session, targetTerm]);

  // INSTANT NEXT: Advance to next question immediately without waiting for API calls
  const handleNext = useCallback(() => {
    if (index + 1 >= cards.length) {
      if (session) {
        endSession(session.id, correct, wrong).catch(console.error);
      }
      setDone(true);
    } else {
      // Instant switch
      setIndex(i => i + 1);
      setUserInput('');
      setPhase('typing');
    }
  }, [index, cards.length, session, correct, wrong]);

  // Keyboard handler for Enter key press logic
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (phase === 'typing') {
        if (userInput.trim()) {
          handleCheck();
        }
      } else if (phase === 'checked') {
        handleNext();
      }
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-primary)' }}>
        <div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(79,70,229,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="card text-center" style={{ maxWidth: 450, padding: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Bộ từ vựng trống</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Bạn cần thêm từ vào bộ từ trước khi thực hiện luyện gõ!</p>
          <Link href={`/decks/${deckId}`} className="btn btn-primary">
            <ArrowLeft size={16} /> Quay lại chi tiết bộ từ
          </Link>
        </div>
      </div>
    );
  }

  // Done screen
  if (done) {
    const total = cards.length;
    const accuracy = Math.round((correct / total) * 100);

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', padding: 20, position: 'relative' }}>
        <Confetti />
        <div className="card animate-up" style={{ maxWidth: 480, width: '100%', textAlign: 'center', padding: 36, zIndex: 10 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>{accuracy >= 80 ? '🎯' : '💪'}</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Hoàn thành Luyện Gõ!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
            Bộ từ: <strong style={{ color: 'var(--text-primary)' }}>{deck?.name || 'Từ vựng'}</strong>
          </p>

          <div style={{
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius)',
            padding: '20px 16px',
            marginBottom: 24,
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-around'
          }}>
            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: accuracy >= 80 ? 'var(--green)' : 'var(--amber)' }}>
                {accuracy}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Tỷ lệ đúng</div>
            </div>

            <div style={{ width: 1, height: 40, background: 'var(--border)' }} />

            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--green)' }}>{correct}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Từ đúng</div>
            </div>

            <div style={{ width: 1, height: 40, background: 'var(--border)' }} />

            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--rose)' }}>{wrong}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Từ sai</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className="btn btn-secondary"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => {
                const shuffled = [...cards].sort(() => Math.random() - 0.5);
                setCards(shuffled);
                setIndex(0);
                setUserInput('');
                setPhase('typing');
                setCorrect(0);
                setWrong(0);
                setDone(false);
              }}
            >
              <RotateCcw size={16} /> Làm lại
            </button>

            <Link href={`/decks/${deckId}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <ArrowLeft size={16} /> Bộ từ vựng
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { comparisons, isExact } = getCharComparison(currentCard.term, userInput);
  const progressPct = Math.round(((index + 1) / cards.length) * 100);

  // Mask example sentence with blank line
  const formattedExample = currentCard.exampleSentence
    ? currentCard.exampleSentence
        .replace(new RegExp(currentCard.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '___________')
        .replace(new RegExp(targetTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '___________')
    : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Header Bar */}
      <header style={{
        padding: '16px 32px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href={`/decks/${deckId}`} className="btn btn-ghost btn-sm btn-icon" title="Trở về">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Keyboard size={16} color="var(--accent)" /> Luyện Gõ Từ
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{deck?.name}</div>
          </div>
        </div>

        {/* Progress pill & scores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✓ {correct}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--rose)', display: 'flex', alignItems: 'center', gap: 4 }}>
              ✗ {wrong}
            </span>
          </div>

          <div style={{ width: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Tiến độ</span>
              <span>{index + 1}/{cards.length}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--purple))', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Practice Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 640 }}>
          <div className="card animate-up" style={{ padding: 32, position: 'relative' }}>
            
            {/* Top Info Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {currentCard.partOfSpeech && (
                  <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>
                    {currentCard.partOfSpeech}
                  </span>
                )}
                <span className="badge tag">
                  {targetTerm.length} chữ cái
                </span>
              </div>

              <button
                className="btn btn-ghost btn-sm btn-icon"
                title="Nghe phát âm"
                onClick={() => speakWord(targetTerm)}
                style={{ color: 'var(--accent)' }}
              >
                <Volume2 size={20} />
              </button>
            </div>

            {/* Prompt Definition */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                Nghĩa của từ
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                {currentCard.definition}
              </h2>
              {currentCard.phonetic && (
                <div style={{ fontSize: 15, color: 'var(--accent)', fontWeight: 500, marginTop: 6 }}>
                  {currentCard.phonetic}
                </div>
              )}
              {formattedExample && (
                <div style={{
                  marginTop: 16,
                  padding: '10px 16px',
                  background: 'var(--bg-primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                  border: '1px dashed var(--border)'
                }}>
                  "{formattedExample}"
                </div>
              )}
            </div>

            {/* Input & Highlight Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {phase === 'typing' ? (
                <div>
                  <div style={{ position: 'relative' }}>
                    <input
                      ref={inputRef}
                      type="text"
                      className="input"
                      style={{
                        fontSize: 20,
                        fontWeight: 600,
                        textAlign: 'center',
                        letterSpacing: 1,
                        padding: '16px 20px',
                        borderColor: userInput ? 'var(--accent)' : 'var(--border)',
                        boxShadow: userInput ? 'var(--shadow-glow)' : 'none',
                        transition: 'all 0.2s ease',
                      }}
                      placeholder="Gõ từ vựng tiếng Anh..."
                      value={userInput}
                      onChange={e => setUserInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                    <div style={{
                      position: 'absolute',
                      right: 14,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      background: 'var(--bg-primary)',
                      padding: '4px 8px',
                      borderRadius: 6,
                      border: '1px solid var(--border)'
                    }}>
                      Enter <CornerDownLeft size={12} />
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--text-muted)' }}>
                    Nhập từ và bấm <strong style={{ color: 'var(--text-primary)' }}>Enter</strong> để kiểm tra
                  </div>
                </div>
              ) : (
                /* CHECKED PHASE: Character Highlight Comparison */
                <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Status Result Banner */}
                  <div style={{
                    padding: '12px 18px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    fontWeight: 700,
                    fontSize: 15,
                    background: isExact ? 'rgba(5, 150, 105, 0.12)' : 'rgba(225, 29, 72, 0.12)',
                    color: isExact ? 'var(--green)' : 'var(--rose)',
                    border: `1px solid ${isExact ? 'rgba(5, 150, 105, 0.3)' : 'rgba(225, 29, 72, 0.3)'}`
                  }}>
                    {isExact ? (
                      <>
                        <CheckCircle2 size={20} /> Chính xác! Bạn đã gõ rất chuẩn.
                      </>
                    ) : (
                      <>
                        <XCircle size={20} /> Chưa chính xác. Hãy so sánh kết quả bên dưới:
                      </>
                    )}
                  </div>

                  {/* Character Highlight Row */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase' }}>
                      Kết quả đối chiếu từng chữ cái:
                    </div>
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 8,
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: 16,
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)'
                    }}>
                      {comparisons.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            minWidth: 38,
                            height: 44,
                            padding: '0 6px',
                            borderRadius: 8,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: 20,
                            color: '#ffffff',
                            background: item.isMatch ? '#059669' : '#e11d48',
                            boxShadow: item.isMatch
                              ? '0 2px 8px rgba(5, 150, 105, 0.3)'
                              : '0 2px 8px rgba(225, 29, 72, 0.3)',
                            position: 'relative'
                          }}
                        >
                          <span>{item.char || '_'}</span>
                          {!item.isMatch && item.expectedChar && (
                            <span style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: 'rgba(255,255,255,0.85)',
                              marginTop: -2
                            }}>
                              ({item.expectedChar})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Correct Answer Reference */}
                  {!isExact && (
                    <div style={{
                      textAlign: 'center',
                      padding: '12px 16px',
                      background: 'var(--accent-glow)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(79,70,229,0.2)'
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 2 }}>
                        Từ đúng chuẩn:
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--accent)' }}>
                        {targetTerm}
                      </div>
                    </div>
                  )}

                  {/* Next Step Instruction */}
                  <div style={{ textAlign: 'center', marginTop: 4 }}>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={handleNext}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        boxShadow: '0 4px 20px var(--accent-glow)',
                      }}
                    >
                      Bấm Enter ↵ để sang từ tiếp theo <ArrowRight size={18} />
                    </button>
                    {/* Hidden focus input for Enter key listener in checked phase */}
                    <input
                      ref={inputRef}
                      type="text"
                      style={{ opacity: 0, position: 'absolute', pointerEvents: 'none' }}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
