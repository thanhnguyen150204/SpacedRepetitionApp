'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import {
  getDeck, getCards, createCard, updateCard, deleteCard, updateDeck, deleteDeck,
  generateQuestions, toggleCardFlag, enrollDeckForReview, getUserCardStates
} from '@/lib/api';
import {
  ArrowLeft, Plus, Trash2, Edit, Brain, BookOpen, HelpCircle, Sparkles, X,
  Edit3, Lock, Globe, Calendar, Flag, Zap
} from 'lucide-react';

export default function DeckDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [deck, setDeck] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [userCardStates, setUserCardStates] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showAddCard, setShowAddCard] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [form, setForm] = useState({ term: '', definition: '', phonetic: '', partOfSpeech: '', exampleSentence: '' });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // Edit Deck State
  const [showEditDeck, setShowEditDeck] = useState(false);
  const [editDeckForm, setEditDeckForm] = useState({ name: '', description: '', isPublic: false });
  const [savingDeck, setSavingDeck] = useState(false);

  // Edit Card State
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [editCardForm, setEditCardForm] = useState({ term: '', definition: '', phonetic: '', partOfSpeech: '', exampleSentence: '' });
  const [savingCardEdit, setSavingCardEdit] = useState(false);

  useEffect(() => {
    Promise.all([getDeck(id), getCards(id)])
      .then(async ([d, c]) => {
        setDeck(d);
        setCards(c);
        if (d) setEditDeckForm({ name: d.name, description: d.description || '', isPublic: !!d.isPublic });
        if (c && c.length > 0) {
          try {
            const states = await getUserCardStates(c.map((x: any) => x.id));
            setUserCardStates(states || {});
          } catch (err) {}
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ─── Flag & Enroll ──────────────────────────────────────
  const handleToggleFlag = async (cardId: string) => {
    try {
      const currentFlagged = !!userCardStates[cardId]?.isFlagged;
      const res = await toggleCardFlag(cardId, !currentFlagged);
      setUserCardStates(prev => ({
        ...prev,
        [cardId]: {
          isFlagged: res.isFlagged,
          repetitions: res.repetitions,
          nextReviewDate: res.nextReviewDate,
        }
      }));
      showToast(res.isFlagged ? '🚩 Đã thêm từ vào hàng chờ ôn tập SM-2!' : '🏳️ Đã bỏ đánh dấu ôn tập!');
    } catch (err) {
      showToast('❌ Không thể cập nhật trạng thái ôn tập');
    }
  };

  const handleEnrollAll = async () => {
    if (cards.length === 0) return;
    setEnrolling(true);
    try {
      const res = await enrollDeckForReview(id);
      showToast(`🚩 Đã bật ôn tập SM-2 cho tất cả ${res.enrolledCount || cards.length} từ trong bộ này!`);
      const states = await getUserCardStates(cards.map((x: any) => x.id));
      setUserCardStates(states || {});
    } catch (err) {
      showToast('❌ Không thể bật ôn tập cho cả bộ!');
    } finally {
      setEnrolling(false);
    }
  };

  // ─── Deck CRUD ─────────────────────────────────────────
  const handleUpdateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDeckForm.name) return;
    setSavingDeck(true);
    try {
      const updated = await updateDeck(id, editDeckForm);
      setDeck(updated);
      setShowEditDeck(false);
      showToast('✅ Đã cập nhật thông tin bộ từ!');
    } catch (err) {
      showToast('❌ Không thể cập nhật bộ từ!');
    } finally {
      setSavingDeck(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bộ từ "${deck?.name}"? Tất cả từ vựng bên trong sẽ bị xóa vĩnh viễn!`)) {
      return;
    }
    try {
      await deleteDeck(id);
      showToast('🗑️ Đã xóa bộ từ!');
      router.push('/decks');
    } catch (err) {
      showToast('❌ Không thể xóa bộ từ!');
    }
  };

  // ─── Card CRUD ─────────────────────────────────────────
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

  const handleStartEditCard = (card: any) => {
    setEditingCardId(card.id);
    setEditCardForm({
      term: card.term || '',
      definition: card.definition || '',
      phonetic: card.phonetic || '',
      partOfSpeech: card.partOfSpeech || '',
      exampleSentence: card.exampleSentence || '',
    });
  };

  const handleSaveCardEdit = async (cardId: string) => {
    if (!editCardForm.term || !editCardForm.definition) return;
    setSavingCardEdit(true);
    try {
      const updated = await updateCard(id, cardId, editCardForm);
      setCards((prev: any[]) => prev.map(c => c.id === cardId ? updated : c));
      setEditingCardId(null);
      showToast('✅ Đã cập nhật từ vựng!');
    } catch (err) {
      showToast('❌ Lỗi khi cập nhật từ vựng!');
    } finally {
      setSavingCardEdit(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    await deleteCard(id, cardId);
    setCards((prev: any[]) => prev.filter(c => c.id !== cardId));
    setDeck((prev: any) => ({ ...prev, totalCards: Math.max(0, (prev?.totalCards || 1) - 1) }));
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
        {/* Header Navigation */}
        <Link href="/decks" className="btn btn-ghost btn-sm" style={{ marginBottom: 20 }}>
          <ArrowLeft size={16} /> Bộ từ vựng
        </Link>

        {/* Deck Card Header */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800 }}>{deck?.name}</h1>
                <button
                  className="btn btn-ghost btn-sm btn-icon"
                  title="Sửa thông tin bộ từ"
                  onClick={() => setShowEditDeck(!showEditDeck)}
                >
                  <Edit size={16} />
                </button>
                <button
                  className="btn btn-danger btn-sm btn-icon"
                  title="Xóa bộ từ"
                  onClick={handleDeleteDeck}
                >
                  <Trash2 size={16} />
                </button>
              </div>
              {deck?.description && <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{deck.description}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <span className="badge badge-accent" style={{ gap: 5 }}>
                  <BookOpen size={13} /> {deck?.totalCards} từ
                </span>
                <span className={`badge ${deck?.isPublic ? 'badge-purple' : 'tag'}`} style={{ gap: 5 }}>
                  {deck?.isPublic ? <><Globe size={13} /> Công khai mẫu</> : <><Lock size={13} /> Riêng tư</>}
                </span>
                <span className="badge badge-purple" style={{ gap: 5 }}>
                  <Calendar size={13} /> {new Date(deck?.createdAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={handleEnrollAll}
                disabled={enrolling || cards.length === 0}
                className="btn btn-secondary btn-sm"
                title="Bật ôn tập SM-2 cho tất cả các từ trong bộ này"
              >
                <Flag size={14} color="var(--rose)" /> {enrolling ? 'Đang bật...' : 'Bật ôn tập cả bộ'}
              </button>
              <button onClick={handleGenerate} disabled={generating || cards.length < 2} className="btn btn-secondary btn-sm">
                <Sparkles size={14} /> {generating ? 'Đang tạo...' : 'Tạo câu hỏi'}
              </button>
              <Link href={`/study/test/${id}`} className="btn btn-secondary btn-sm">
                <Zap size={14} color="var(--amber)" /> Bài Test
              </Link>
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

          {/* Edit Deck Form */}
          {showEditDeck && (
            <form onSubmit={handleUpdateDeck} style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Sửa tên, mô tả & quyền riêng tư</h3>
              <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
                <div className="input-group">
                  <label className="input-label">Tên bộ từ *</label>
                  <input
                    className="input"
                    value={editDeckForm.name}
                    onChange={e => setEditDeckForm({ ...editDeckForm, name: e.target.value })}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">Mô tả ngắn</label>
                  <input
                    className="input"
                    value={editDeckForm.description}
                    onChange={e => setEditDeckForm({ ...editDeckForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 16 }}>
                <label className="input-label">Trạng thái chia sẻ</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => setEditDeckForm({ ...editDeckForm, isPublic: false })}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${!editDeckForm.isPublic ? 'var(--accent)' : 'var(--border)'}`,
                      background: !editDeckForm.isPublic ? 'var(--accent-glow)' : 'var(--bg-card)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
                    }}
                  >
                    <Lock size={15} color={!editDeckForm.isPublic ? 'var(--accent)' : 'var(--text-muted)'} />
                    Riêng tư (Chỉ bạn thấy)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditDeckForm({ ...editDeckForm, isPublic: true })}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 'var(--radius-sm)',
                      border: `1.5px solid ${editDeckForm.isPublic ? 'var(--accent)' : 'var(--border)'}`,
                      background: editDeckForm.isPublic ? 'var(--accent-glow)' : 'var(--bg-card)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600,
                    }}
                  >
                    <Globe size={15} color={editDeckForm.isPublic ? 'var(--accent)' : 'var(--text-muted)'} />
                    Công khai mẫu (Mọi người cùng xem & học)
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="submit" className="btn btn-primary btn-sm" disabled={savingDeck || !editDeckForm.name}>
                  {savingDeck ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowEditDeck(false)}>
                  Hủy
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Add Card Section */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setShowAddCard(!showAddCard)}
          >
            <div style={{ fontWeight: 700, fontSize: 15 }}>
              <Plus size={16} style={{ display: 'inline', marginRight: 6 }} />
              Thêm từ mới vào bộ từ
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
            {cards.map((card: any, idx: number) => {
              const isFlagged = !!userCardStates[card.id]?.isFlagged;
              return (
                <div key={card.id} className="card card-sm" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {editingCardId === card.id ? (
                    /* Edit Card Inline Form */
                    <div style={{ padding: 6 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: 'var(--accent)' }}>
                        📝 Chỉnh sửa từ vựng
                      </div>
                      <div className="grid-2" style={{ gap: 10, marginBottom: 10 }}>
                        <div>
                          <label className="input-label">Từ / Cụm từ *</label>
                          <input
                            className="input"
                            value={editCardForm.term}
                            onChange={e => setEditCardForm({ ...editCardForm, term: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="input-label">Nghĩa *</label>
                          <input
                            className="input"
                            value={editCardForm.definition}
                            onChange={e => setEditCardForm({ ...editCardForm, definition: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="input-label">Phiên âm</label>
                          <input
                            className="input"
                            value={editCardForm.phonetic}
                            onChange={e => setEditCardForm({ ...editCardForm, phonetic: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="input-label">Loại từ</label>
                          <select
                            className="input"
                            value={editCardForm.partOfSpeech}
                            onChange={e => setEditCardForm({ ...editCardForm, partOfSpeech: e.target.value })}
                          >
                            <option value="">Chọn loại từ</option>
                            <option value="noun">Noun (danh từ)</option>
                            <option value="verb">Verb (động từ)</option>
                            <option value="adjective">Adjective (tính từ)</option>
                            <option value="adverb">Adverb (trạng từ)</option>
                            <option value="phrase">Phrase (cụm từ)</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label className="input-label">Câu ví dụ</label>
                        <input
                          className="input"
                          value={editCardForm.exampleSentence}
                          onChange={e => setEditCardForm({ ...editCardForm, exampleSentence: e.target.value })}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={savingCardEdit || !editCardForm.term || !editCardForm.definition}
                          onClick={() => handleSaveCardEdit(card.id)}
                        >
                          {savingCardEdit ? 'Đang lưu...' : 'Cập nhật'}
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingCardId(null)}>
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Display Card View */
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 28, flexShrink: 0, textAlign: 'right' }}>
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>{card.term}</span>
                          {card.phonetic && <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{card.phonetic}</span>}
                          {card.partOfSpeech && <span className="badge badge-purple" style={{ fontSize: 10 }}>{card.partOfSpeech}</span>}
                          {isFlagged && (
                            <span className="badge badge-rose" style={{ fontSize: 10, padding: '2px 8px' }}>
                              🚩 Đã bật ôn tập
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{card.definition}</span>
                        {card.exampleSentence && (
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                            "{card.exampleSentence}"
                          </p>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className={`btn btn-sm btn-icon ${isFlagged ? 'btn-danger' : 'btn-secondary'}`}
                          title={isFlagged ? 'Bỏ đánh dấu ôn tập' : 'Đánh dấu đưa vào hàng chờ Ôn tập hôm nay'}
                          onClick={() => handleToggleFlag(card.id)}
                        >
                          <Flag size={14} fill={isFlagged ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          className="btn btn-secondary btn-sm btn-icon"
                          title="Sửa từ vựng"
                          onClick={() => handleStartEditCard(card)}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm btn-icon"
                          title="Xóa từ vựng"
                          onClick={() => handleDeleteCard(card.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
