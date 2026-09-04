'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { getDeck, getCards, createCard, deleteCard, generateQuestions } from '@/lib/api';
import { ArrowLeft, Plus, Trash2, Brain, BookOpen, HelpCircle, Sparkles, X } from 'lucide-react';

export default function DeckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState({ term: '', definition: '', phonetic: '', partOfSpeech: '', exampleSentence: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    Promise.all([getDeck(id), getCards(id)])
      .then(([d, c]) => { setDeck(d); setCards(c); })
      .finally(() => setLoading(false));
  }, [id]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.term || !form.definition) return;
    setSaving(true);
    try {
      const card = await createCard(id, form);
      setCards((prev: any[]) => [card, ...prev]);
      setDeck((prev: any) => ({ ...prev, totalCards: (prev?.totalCards || 0) + 1 }));
      setForm({ term: '', definition: '', phonetic: '', partOfSpeech: '', exampleSentence: '' });
      showToast('✅ Đã thêm từ mới!');
    } finally { setSaving(false); }
  };

  const handleDeleteCard = async (cardId: string) => {
    await deleteCard(id, cardId);
    setCards((prev: any[]) => prev.filter(c => c.id !== cardId));
    setDeck((prev: any) => ({ ...prev, totalCards: (prev?.totalCards || 1) - 1 }));
    showToast('🗑️ Đã xóa từ');
  };

  const handleGenerate = async () => {
    setGenerating(true);
    await generateQuestions(id);
    showToast('✅ Đã tạo ngân hàng câu hỏi!');
    setGenerating(false);
  };

  if (loading) return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-pulse" style={{ fontSize: 32 }}>⚡</div>
      </main>
    </div>
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-fade">
        {/* Header */}
        <Link href="/decks" className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={16} /> Bộ từ vựng
        </Link>

        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>{deck?.name}</h1>
              {deck?.description && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{deck.description}</p>}
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <span className="badge badge-accent"><BookOpen size={11} /> {deck?.totalCards} từ</span>
                <span className="badge badge-purple">
                  {new Date(deck?.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={handleGenerate} disabled={generating || cards.length < 2} className="btn btn-secondary btn-sm">
                <Sparkles size={14} /> {generating ? 'Đang tạo...' : 'Tạo câu hỏi'}
              </button>
              <Link href={`/study/quiz/${id}`} className="btn btn-secondary btn-sm">
                <HelpCircle size={14} /> Quiz
              </Link>
              <Link href={`/study/flashcard/${id}`} className="btn btn-secondary btn-sm">
                <BookOpen size={14} /> Flashcard
              </Link>
              <Link href={`/review?deckId=${id}`} className="btn btn-primary btn-sm">
                <Brain size={14} /> Ôn tập SM-2
              </Link>
            </div>
          </div>
        </div>

        {/* Add Card */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setShowAddCard(!showAddCard)}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              <Plus size={16} style={{ display: 'inline', marginRight: 6 }} />
              Thêm từ mới
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{showAddCard ? '▲ Thu gọn' : '▼ Mở rộng'}</span>
          </div>

          {showAddCard && (
            <form onSubmit={handleAddCard} style={{ marginTop: 20 }}>
              <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
                <div className="input-group">
                  <label className="input-label">Từ / Cụm từ *</label>
                  <input id="card-term" className="input" placeholder="e.g. Perseverance" value={form.term} onChange={e => setForm({...form, term: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Nghĩa *</label>
                  <input id="card-def" className="input" placeholder="e.g. Sự kiên trì" value={form.definition} onChange={e => setForm({...form, definition: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Phiên âm</label>
                  <input className="input" placeholder="e.g. /ˌpɜːsɪˈvɪərəns/" value={form.phonetic} onChange={e => setForm({...form, phonetic: e.target.value})} />
                </div>
                <div className="input-group">
                  <label className="input-label">Loại từ</label>
                  <select className="input" value={form.partOfSpeech} onChange={e => setForm({...form, partOfSpeech: e.target.value})}
                    style={{ background: 'var(--bg-card)', cursor: 'pointer' }}>
                    <option value="">Chọn loại từ</option>
                    <option value="noun">Noun (danh từ)</option>
                    <option value="verb">Verb (động từ)</option>
                    <option value="adjective">Adjective (tính từ)</option>
                    <option value="adverb">Adverb (trạng từ)</option>
                    <option value="phrase">Phrase (cụm từ)</option>
                  </select>
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 14 }}>
                <label className="input-label">Câu ví dụ</label>
                <input className="input" placeholder="e.g. Her perseverance helped her succeed." value={form.exampleSentence} onChange={e => setForm({...form, exampleSentence: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button id="add-card-btn" type="submit" className="btn btn-primary" disabled={saving || !form.term || !form.definition}>
                  {saving ? 'Đang lưu...' : <><Plus size={16} /> Thêm từ</>}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setForm({ term: '', definition: '', phonetic: '', partOfSpeech: '', exampleSentence: '' })}>
                  Xóa form
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Cards List */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>Danh sách từ ({cards.length})</h2>
        </div>

        {cards.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <div className="empty-title">Chưa có từ nào</div>
            <div className="empty-desc">Thêm từ đầu tiên vào bộ từ này!</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {cards.map((card: any, idx: number) => (
              <div key={card.id} className="card card-sm" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 28, flexShrink: 0, textAlign: 'right' }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{card.term}</span>
                    {card.phonetic && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{card.phonetic}</span>}
                    {card.partOfSpeech && <span className="badge badge-purple" style={{ fontSize: 10 }}>{card.partOfSpeech}</span>}
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{card.definition}</span>
                  {card.exampleSentence && (
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                      "{card.exampleSentence}"
                    </p>
                  )}
                </div>
                <button
                  className="btn btn-danger btn-sm btn-icon"
                  onClick={() => handleDeleteCard(card.id)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
