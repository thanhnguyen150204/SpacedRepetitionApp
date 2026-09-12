'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getCards, startSession, endSession, submitReview, getDeck, generateAiSentence, evaluateAiSentence } from '@/lib/api';
import {
  ArrowLeft, RotateCcw, Sparkles, CheckCircle2, XCircle, Volume2,
  ArrowRight, CornerDownLeft, Bot, MessageSquare, BookOpen, Send, Zap
} from 'lucide-react';
import Confetti from '@/components/Confetti';

interface CharComparison {
  char: string;
  expectedChar: string;
  isMatch: boolean;
}

function cleanWordTerm(rawTerm: string): string {
  if (!rawTerm) return '';
  let cleaned = rawTerm.replace(/\s*\([^)]*\)/g, '');
  cleaned = cleaned.trim();
  return cleaned || rawTerm.trim();
}

export default function AiSentencePracticePage() {
  const { deckId } = useParams<{ deckId: string }>();
  const router = useRouter();

  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [index, setIndex] = useState(0);
  
  // Mode selection: 'fill_blank' (Mode 1) or 'custom_writing' (Mode 2)
  const [mode, setMode] = useState<'fill_blank' | 'custom_writing'>('custom_writing');

  // State for Mode 1 (Fill Blank)
  const [userInput, setUserInput] = useState('');
  const [phase, setPhase] = useState<'typing' | 'checked'>('typing');

  // State for Mode 2 (Custom Writing)
  const [customSentence, setCustomSentence] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [aiEvaluation, setAiEvaluation] = useState<any | null>(null);

  // AI generated example state
  const [aiExample, setAiExample] = useState<any | null>(null);
  const [loadingAiExample, setLoadingAiExample] = useState(false);

  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [scores, setScores] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const [session, setSession] = useState<any>(null);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Initialize deck & cards
  useEffect(() => {
    Promise.all([getDeck(deckId), getCards(deckId)])
      .then(async ([d, c]) => {
        setDeck(d);
        if (c && c.length > 0) {
          const shuffled = [...c].sort(() => Math.random() - 0.5);
          setCards(shuffled);
          try {
            startSession(deckId, 'ai_sentence').then(setSession).catch(console.error);
          } catch (e) {}
        }
      })
      .finally(() => setLoading(false));
  }, [deckId]);

  const currentCard = cards[index];
  const targetTerm = currentCard ? cleanWordTerm(currentCard.term) : '';

  // Load AI example sentence whenever card index or mode changes
  const fetchAiExample = useCallback(async (card: any) => {
    if (!card) return;
    setLoadingAiExample(true);
    setAiExample(null);
    try {
      const res = await generateAiSentence({
        term: card.term,
        definition: card.definition,
        partOfSpeech: card.partOfSpeech,
        existingExample: card.exampleSentence,
      });
      setAiExample(res);
    } catch (e) {
      console.error('Error fetching AI sentence:', e);
    } finally {
      setLoadingAiExample(false);
    }
  }, []);

  useEffect(() => {
    if (currentCard) {
      fetchAiExample(currentCard);
      setUserInput('');
      setCustomSentence('');
      setPhase('typing');
      setAiEvaluation(null);
    }
  }, [index, currentCard, fetchAiExample]);

  // Focus input automatically
  useEffect(() => {
    if (phase === 'typing' && inputRef.current) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [index, phase, mode]);

  // Speech TTS
  const speakText = (text: string) => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        window.speechSynthesis.speak(utterance);
      } catch (e) {}
    }
  };

  // Compare user input character by character for Mode 1
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
      comparisons.push({ char: inputChar, expectedChar, isMatch });
    }

    return { comparisons, isExact };
  };

  // Mode 1: Check Mode 1 answer
  const handleCheckFillBlank = useCallback(() => {
    if (!currentCard || !userInput.trim()) return;

    const { isExact } = getCharComparison(currentCard.term, userInput);

    if (isExact) {
      setCorrect(c => c + 1);
    } else {
      setWrong(w => w + 1);
      if (currentCard.id) {
        submitReview({ cardId: currentCard.id, quality: 0, sessionId: session?.id }).catch(console.error);
      }
    }

    setPhase('checked');
    speakText(aiExample?.englishSentence || targetTerm);
  }, [currentCard, userInput, session, aiExample, targetTerm]);

  // Mode 2: Submit custom sentence to Gemini AI
  const handleEvaluateCustomSentence = async () => {
    if (!currentCard || !customSentence.trim() || evaluating) return;
    setEvaluating(true);
    setAiEvaluation(null);

    try {
      const res = await evaluateAiSentence({
        term: currentCard.term,
        definition: currentCard.definition,
        userSentence: customSentence,
      });
      setAiEvaluation(res);
      setScores(prev => [...prev, res.score || 7]);

      if (res.score >= 7) {
        setCorrect(c => c + 1);
      } else {
        setWrong(w => w + 1);
        if (currentCard.id) {
          submitReview({ cardId: currentCard.id, quality: 0, sessionId: session?.id }).catch(console.error);
        }
      }
      setPhase('checked');
      if (res.nativeSuggestion) {
        speakText(res.nativeSuggestion);
      }
    } catch (err) {
      console.error('Failed to evaluate sentence:', err);
    } finally {
      setEvaluating(false);
    }
  };

  // Advance to next card
  const handleNext = useCallback(() => {
    if (index + 1 >= cards.length) {
      if (session) {
        endSession(session.id, correct, wrong).catch(console.error);
      }
      setDone(true);
    } else {
      setIndex(i => i + 1);
      setUserInput('');
      setCustomSentence('');
      setPhase('typing');
      setAiEvaluation(null);
    }
  }, [index, cards.length, session, correct, wrong]);

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || mode === 'fill_blank')) {
      e.preventDefault();
      if (phase === 'typing') {
        if (mode === 'fill_blank' && userInput.trim()) {
          handleCheckFillBlank();
        } else if (mode === 'custom_writing' && customSentence.trim()) {
          handleEvaluateCustomSentence();
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
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Bộ từ vựng trống</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>Bạn cần thêm từ vào bộ từ trước khi thực hiện luyện câu với AI!</p>
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
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const accuracy = Math.round((correct / total) * 100);

    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg-primary)', padding: 20, position: 'relative' }}>
        <Confetti />
        <div className="card animate-up" style={{ maxWidth: 500, width: '100%', textAlign: 'center', padding: 36, zIndex: 10 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>Hoàn thành Luyện Câu AI!</h2>
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
            {avgScore !== null && (
              <>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)' }}>
                    {avgScore}/10
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Điểm AI TB</div>
                </div>
                <div style={{ width: 1, height: 40, background: 'var(--border)' }} />
              </>
            )}

            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: accuracy >= 80 ? 'var(--green)' : 'var(--amber)' }}>
                {accuracy}%
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Tỷ lệ đạt</div>
            </div>

            <div style={{ width: 1, height: 40, background: 'var(--border)' }} />

            <div>
              <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--green)' }}>{correct}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginTop: 2 }}>Thành công</div>
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
                setCustomSentence('');
                setPhase('typing');
                setCorrect(0);
                setWrong(0);
                setScores([]);
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
              <Bot size={18} color="var(--purple)" /> Luyện Câu với Gemini AI
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{deck?.name}</div>
          </div>
        </div>

        {/* Progress & Scores */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green)' }}>✓ {correct}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--rose)' }}>✗ {wrong}</span>
          </div>

          <div style={{ width: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>
              <span>Tiến độ</span>
              <span>{index + 1}/{cards.length}</span>
            </div>
            <div style={{ width: '100%', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: 'linear-gradient(90deg, var(--purple), var(--accent))', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        </div>
      </header>

      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
        <div style={{
          background: 'var(--bg-secondary)',
          padding: 4,
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          display: 'flex',
          gap: 6
        }}>
          <button
            onClick={() => { setMode('custom_writing'); setPhase('typing'); }}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: mode === 'custom_writing' ? 'linear-gradient(135deg, var(--accent), var(--purple))' : 'transparent',
              color: mode === 'custom_writing' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            <Sparkles size={15} /> Mode 1: AI Writing Coach (Tự viết câu)
          </button>

          <button
            onClick={() => { setMode('fill_blank'); setPhase('typing'); }}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              fontSize: 13,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: mode === 'fill_blank' ? 'linear-gradient(135deg, var(--accent), var(--purple))' : 'transparent',
              color: mode === 'fill_blank' ? '#ffffff' : 'var(--text-secondary)',
              transition: 'all 0.2s ease'
            }}
          >
            <BookOpen size={15} /> Mode 2: AI Câu mẫu & Đục lỗ
          </button>
        </div>
      </div>

      {/* Main Practice Content */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 680 }}>
          <div className="card animate-up" style={{ padding: 32, position: 'relative' }}>
            
            {/* Word Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span className="badge badge-purple" style={{ fontSize: 13, fontWeight: 700 }}>
                  {targetTerm}
                </span>
                {currentCard.partOfSpeech && (
                  <span className="badge tag" style={{ textTransform: 'capitalize' }}>
                    {currentCard.partOfSpeech}
                  </span>
                )}
              </div>

              <button
                className="btn btn-ghost btn-sm btn-icon"
                title="Nghe phát âm"
                onClick={() => speakText(targetTerm)}
                style={{ color: 'var(--accent)' }}
              >
                <Volume2 size={20} />
              </button>
            </div>

            {/* Prompt Definition */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                Nghĩa từ vựng
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                {currentCard.definition}
              </h2>
            </div>

            {/* ──────── MODE 1: AI WRITING COACH (CUSTOM SENTENCE) ──────── */}
            {mode === 'custom_writing' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--accent-glow)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(79,70,229,0.2)',
                  fontSize: 14,
                  color: 'var(--text-primary)'
                }}>
                  ✏️ Hãy viết 1 câu tiếng Anh có sử dụng từ <strong style={{ color: 'var(--accent)' }}>"{targetTerm}"</strong>.
                </div>

                {phase === 'typing' ? (
                  <div>
                    <textarea
                      ref={inputRef as any}
                      className="input"
                      rows={3}
                      style={{
                        width: '100%',
                        fontSize: 16,
                        lineHeight: 1.5,
                        padding: 16,
                        borderRadius: 'var(--radius-sm)',
                        resize: 'none',
                      }}
                      placeholder="Viết câu tiếng Anh của bạn tại đây..."
                      value={customSentence}
                      onChange={e => setCustomSentence(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Bấm **Ctrl + Enter** hoặc Click để gửi</span>
                      <button
                        className="btn btn-primary"
                        onClick={handleEvaluateCustomSentence}
                        disabled={evaluating || !customSentence.trim()}
                        style={{ padding: '10px 24px' }}
                      >
                        {evaluating ? (
                          <>
                            <div className="animate-spin" style={{ width: 16, height: 16, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
                            AI đang chấm bài...
                          </>
                        ) : (
                          <>
                            <Sparkles size={16} /> AI Chấm Bài
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* AI Evaluation Result Card */
                  <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {aiEvaluation && (
                      <div style={{
                        background: 'var(--bg-primary)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border)',
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 14
                      }}>
                        {/* Score Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 52,
                              height: 52,
                              borderRadius: 14,
                              background: aiEvaluation.score >= 8 ? '#059669' : aiEvaluation.score >= 5 ? '#d97706' : '#e11d48',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 22,
                              fontWeight: 900
                            }}>
                              {aiEvaluation.score}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 16 }}>
                                {aiEvaluation.score >= 8 ? '🌟 Xuất sắc!' : aiEvaluation.score >= 5 ? '👍 Khá tốt!' : '💪 Cần cố gắng!'}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Thang điểm AI: {aiEvaluation.score}/10</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <span className={`badge ${aiEvaluation.isGrammarCorrect ? 'badge-accent' : 'badge-rose'}`}>
                              {aiEvaluation.isGrammarCorrect ? '✓ Đúng ngữ pháp' : '✗ Sai ngữ pháp'}
                            </span>
                            <span className={`badge ${aiEvaluation.isWordUsedCorrectly ? 'badge-purple' : 'badge-amber'}`}>
                              {aiEvaluation.isWordUsedCorrectly ? '✓ Dùng từ đúng' : '⚠️ Cần sửa dùng từ'}
                            </span>
                          </div>
                        </div>

                        {/* Your Sentence */}
                        <div style={{ fontSize: 14, padding: '10px 14px', background: 'var(--bg-card)', borderRadius: 8, border: '1px solid var(--border)' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-muted)', fontSize: 12, display: 'block', marginBottom: 2 }}>CÂU BẠN ĐÃ ĐẶT:</span>
                          "{customSentence}"
                        </div>

                        {/* AI Feedback */}
                        {aiEvaluation.feedback && (
                          <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent)', fontSize: 12, display: 'block', marginBottom: 2 }}>NHẬN XÉT CHI TIẾT TỪ AI:</span>
                            <div style={{ whiteSpace: 'pre-line' }}>{aiEvaluation.feedback}</div>
                          </div>
                        )}

                        {/* Native Suggestion */}
                        {aiEvaluation.nativeSuggestion && (
                          <div style={{
                            padding: '12px 14px',
                            background: 'rgba(147, 51, 234, 0.08)',
                            borderRadius: 8,
                            border: '1px solid rgba(147, 51, 234, 0.2)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 10
                          }}>
                            <div>
                              <span style={{ fontWeight: 700, color: 'var(--purple)', fontSize: 12, display: 'block', marginBottom: 2 }}>GỢI Ý VIẾT TỰ NHIÊN KIỂU BẢN XỨ:</span>
                              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--purple)' }}>
                                "{aiEvaluation.nativeSuggestion}"
                              </div>
                            </div>
                            <button
                              className="btn btn-ghost btn-sm btn-icon"
                              title="Nghe phát âm gợi ý"
                              onClick={() => speakText(aiEvaluation.nativeSuggestion)}
                              style={{ color: 'var(--purple)' }}
                            >
                              <Volume2 size={18} />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <button
                      className="btn btn-primary btn-lg"
                      onClick={handleNext}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Bấm Enter ↵ để sang từ tiếp theo <ArrowRight size={18} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ──────── MODE 2: AI EXAMPLE & FILL IN THE BLANK ──────── */}
            {mode === 'fill_blank' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {loadingAiExample ? (
                  <div style={{ textAlign: 'center', padding: 30 }}>
                    <div className="animate-spin" style={{ width: 32, height: 32, border: '3px solid var(--accent-glow)', borderTopColor: 'var(--accent)', borderRadius: '50%', margin: '0 auto 12px' }} />
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI Gemini đang tạo câu ví dụ mẫu...</div>
                  </div>
                ) : (
                  <>
                    {/* Blanked Sentence Display */}
                    <div style={{
                      padding: 20,
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                        Câu ví dụ mẫu AI
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 8 }}>
                        "{aiExample?.blankedSentence || `Please fill in the word "${targetTerm}"`}"
                      </div>
                      {aiExample?.vietnameseTranslation && (
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          Bản dịch: {aiExample.vietnameseTranslation}
                        </div>
                      )}
                    </div>

                    {phase === 'typing' ? (
                      <div>
                        <div style={{ position: 'relative' }}>
                          <input
                            ref={inputRef as any}
                            type="text"
                            className="input"
                            style={{
                              fontSize: 18,
                              fontWeight: 600,
                              textAlign: 'center',
                              padding: '14px 18px',
                              borderColor: userInput ? 'var(--accent)' : 'var(--border)',
                            }}
                            placeholder={`Gõ từ vựng (${targetTerm.length} chữ cái)...`}
                            value={userInput}
                            onChange={e => setUserInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            autoFocus
                          />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                          Bấm <strong style={{ color: 'var(--text-primary)' }}>Enter</strong> để kiểm tra
                        </div>
                      </div>
                    ) : (
                      /* Checked Result */
                      <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{
                          padding: '12px 18px',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 10,
                          fontWeight: 700,
                          background: isExact ? 'rgba(5, 150, 105, 0.12)' : 'rgba(225, 29, 72, 0.12)',
                          color: isExact ? 'var(--green)' : 'var(--rose)',
                          border: `1px solid ${isExact ? 'rgba(5, 150, 105, 0.3)' : 'rgba(225, 29, 72, 0.3)'}`
                        }}>
                          {isExact ? <><CheckCircle2 size={18} /> Chính xác!</> : <><XCircle size={18} /> Chưa chính xác. Từ đúng: {targetTerm}</>}
                        </div>

                        {/* Full English sentence */}
                        <div style={{
                          padding: 16,
                          background: 'var(--accent-glow)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid rgba(79,70,229,0.2)',
                          textAlign: 'center'
                        }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', marginBottom: 4 }}>CÂU HOÀN CHỈNH:</div>
                          <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--accent)' }}>
                            "{aiExample?.englishSentence}"
                          </div>
                        </div>

                        <button
                          className="btn btn-primary btn-lg"
                          onClick={handleNext}
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          Bấm Enter ↵ để sang từ tiếp theo <ArrowRight size={18} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
