'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { getDecks, deleteDeck } from '@/lib/api';
import { BookOpen, Plus, Trash2, Edit, ChevronRight, Search } from 'lucide-react';

export default function DecksPage() {
  const [decks, setDecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getDecks().then(setDecks).finally(() => setLoading(false));
  }, []);

  const filtered = decks.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-fade">
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Bộ từ vựng</h1>
            <p className="page-subtitle">Quản lý tất cả bộ từ của bạn</p>
          </div>
          <Link href="/decks/new" className="btn btn-primary">
            <Plus size={16} /> Tạo bộ từ mới
          </Link>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 24 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            style={{ paddingLeft: 40 }}
            placeholder="Tìm kiếm bộ từ..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="grid-3">
            {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton" style={{ height: 160 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div className="empty-title">{search ? 'Không tìm thấy kết quả' : 'Chưa có bộ từ nào'}</div>
            <div className="empty-desc">Tạo bộ từ đầu tiên để bắt đầu học tiếng Anh!</div>
            {!search && <Link href="/decks/new" className="btn btn-primary"><Plus size={16} /> Tạo ngay</Link>}
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map((deck: any) => (
              <div key={deck.id} className="deck-card" style={{ position: 'relative' }}>
                <Link href={`/decks/${deck.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                  <div className="deck-card-name">{deck.name}</div>
                  {deck.description && (
                    <div className="deck-card-desc" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {deck.description}
                    </div>
                  )}
                  <div className="deck-card-meta">
                    <span className="badge badge-accent"><BookOpen size={11} /> {deck.totalCards} từ</span>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
                      {new Date(deck.createdAt).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                </Link>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <Link href={`/study/flashcard/${deck.id}`} className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                    Học
                  </Link>
                  <Link href={`/decks/${deck.id}`} className="btn btn-secondary btn-sm btn-icon" title="Chi tiết bộ từ">
                    <Edit size={14} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
