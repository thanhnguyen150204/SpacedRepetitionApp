'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getPublicDecks, cloneDeck } from '@/lib/api';
import { BookOpen, Search, Globe, Copy, ChevronLeft, ChevronRight, User as UserIcon, HelpCircle, Zap, X } from 'lucide-react';

function PublicDecksContent() {
  const router = useRouter();
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [selectedDeckModal, setSelectedDeckModal] = useState<any | null>(null);

  const fetchPublicDecks = (p: number, s: string) => {
    setLoading(true);
    getPublicDecks(p, 9, s)
      .then(res => {
        setDecks(res.data || []);
        setPage(res.page || 1);
        setTotalPages(res.totalPages || 1);
        setTotal(res.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPublicDecks(page, search);
    }, 300);
    return () => clearTimeout(timer);
  }, [page, search]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleCloneDeck = async (deckId: string, deckName: string) => {
    setCloningId(deckId);
    try {
      const cloned = await cloneDeck(deckId);
      showToast(`✅ Đã sao chép "${deckName}" về Bộ từ của bạn!`);
      setSelectedDeckModal(null);
      setTimeout(() => router.push('/decks'), 1000);
    } catch (err) {
      showToast('❌ Không thể sao chép bộ từ. Vui lòng thử lại!');
    } finally {
      setCloningId(null);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-fade">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 className="page-title">Mẫu bộ từ vựng công khai</h1>
              <span className="badge badge-purple"><Globe size={12} /> Community Hub</span>
            </div>
            <p className="page-subtitle">Khám phá các bộ từ vựng chất lượng do cộng đồng chia sẻ ({total} bộ từ)</p>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: 28 }}>
          <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 44, fontSize: 15, borderRadius: 'var(--radius-sm)' }}
            placeholder="Tìm kiếm bộ từ công khai theo tên hoặc chủ đề..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        {/* Decks Grid */}
        {loading ? (
          <div className="grid-3">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: 180 }} />)}
          </div>
        ) : decks.length === 0 ? (
          <div className="empty-state" style={{ marginTop: 40 }}>
            <div className="empty-icon">🌐</div>
            <div className="empty-title">{search ? 'Không tìm thấy bộ từ phù hợp' : 'Chưa có bộ từ công khai nào'}</div>
            <div className="empty-desc">
              {search ? 'Hãy thử tìm bằng từ khóa khác.' : 'Hãy là người đầu tiên tạo bộ từ và gạt sang "Công khai" để chia sẻ cho mọi người!'}
            </div>
          </div>
        ) : (
          <div className="grid-3" style={{ gap: 20 }}>
            {decks.map((deck: any) => (
              <div
                key={deck.id}
                className="card deck-card"
                style={{ display: 'flex', flexDirection: 'column', gap: 14, justifyContent: 'space-between', cursor: 'pointer' }}
                onClick={() => setSelectedDeckModal(deck)}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span className="badge badge-accent"><BookOpen size={12} /> {deck.totalCards} từ vựng</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(deck.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {deck.name}
                  </h3>

                  {deck.description && (
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {deck.description}
                    </p>
                  )}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <UserIcon size={13} />
                      <span>Tác giả: <strong>{deck.user?.name || 'Cộng đồng'}</strong></span>
                    </div>

                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ justifyContent: 'center' }}
                      disabled={cloningId === deck.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloneDeck(deck.id, deck.name);
                      }}
                      title="Lưu bản sao về danh sách bộ từ của bạn"
                    >
                      <Copy size={14} />
                      {cloningId === deck.id ? 'Đang lưu...' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 36 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Trang trước
            </button>

            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
              Trang {page} / {totalPages}
            </span>

            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            >
              Trang sau <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Study Options Modal */}
        {selectedDeckModal && (
          <div className="modal-overlay" onClick={() => setSelectedDeckModal(null)}>
            <div className="modal animate-up" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">{selectedDeckModal.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    Chọn chế độ học hoặc thử thách cho bộ từ mẫu này ({selectedDeckModal.totalCards} từ)
                  </div>
                </div>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelectedDeckModal(null)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Link
                  href={`/study/flashcard/${selectedDeckModal.id}`}
                  className="card card-sm"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
                    background: 'var(--bg-card)', border: '1px solid var(--border)', transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(99,102,241,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Thẻ ghi nhớ Flashcard</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Luyện lật thẻ tự do, xem nghĩa & câu ví dụ</div>
                  </div>
                </Link>

                <Link
                  href={`/study/quiz/${selectedDeckModal.id}`}
                  className="card card-sm"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
                    background: 'var(--bg-card)', border: '1px solid var(--border)', transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(168,85,247,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', flexShrink: 0 }}>
                    <HelpCircle size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>Trắc nghiệm Quiz</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Luyện trắc nghiệm 4 đáp án chọn nghĩa đúng</div>
                  </div>
                </Link>

                <Link
                  href={`/study/test/${selectedDeckModal.id}`}
                  className="card card-sm"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none', color: 'inherit',
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(225,29,72,0.08))',
                    border: '1px solid rgba(245,158,11,0.3)', transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--amber)', flexShrink: 0 }}>
                    <Zap size={22} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--amber)' }}>Bài Test Đếm Ngược (15s/câu)</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Thử thách bấm giờ với thanh thời gian đếm ngược sinh động</div>
                  </div>
                </Link>

                <button
                  className="btn btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                  disabled={cloningId === selectedDeckModal.id}
                  onClick={() => handleCloneDeck(selectedDeckModal.id, selectedDeckModal.name)}
                >
                  <Copy size={16} />
                  {cloningId === selectedDeckModal.id ? 'Đang lưu...' : 'Sao chép về Bộ từ của tôi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}

export default function PublicDecksPage() {
  return (
    <Suspense fallback={<div className="app-layout"><Sidebar /><main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="animate-spin" style={{ width: 40, height: 40, border: '3px solid rgba(99,102,241,0.3)', borderTopColor: 'var(--accent)', borderRadius: '50%' }} /></main></div>}>
      <PublicDecksContent />
    </Suspense>
  );
}
