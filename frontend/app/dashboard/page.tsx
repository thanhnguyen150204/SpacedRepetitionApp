'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { getDecks, getDueCards, getStats } from '@/lib/api';
import { BookOpen, Brain, Flame, TrendingUp, Plus, ChevronRight, Zap, Lock, Globe } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [decks, setDecks] = useState<any[]>([]);
  const [dueCards, setDueCards] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDecks(), getDueCards(), getStats()])
      .then(([d, due, s]) => { setDecks(d); setDueCards(due); setStats(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="app-layout">
      <Sidebar dueCount={dueCards.length} />
      <main className="main-content animate-fade">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Xin chào! 👋</h1>
            <p className="page-subtitle">Hãy ôn luyện từ vựng mỗi ngày để không quên nhé.</p>
          </div>
          <Link href="/decks/new" className="btn btn-primary">
            <Plus size={16} /> Tạo bộ từ mới
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid-4" style={{ marginBottom: 32 }}>
          <div className="stat-card">
            <span className="stat-label">Từ cần ôn hôm nay</span>
            <span className="stat-value" style={{ color: dueCards.length > 0 ? 'var(--rose)' : 'var(--green)' }}>
              {loading ? '...' : dueCards.length}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Tổng bộ từ</span>
            <span className="stat-value">{loading ? '...' : decks.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Đã học thuộc</span>
            <span className="stat-value" style={{ color: 'var(--green)' }}>
              {loading ? '...' : stats?.mastered || 0}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Tổng từ</span>
            <span className="stat-value">{loading ? '...' : stats?.totalCards || 0}</span>
          </div>
        </div>

        {/* Due Cards Alert Card */}
        {dueCards.length > 0 && (
          <Link
            href="/review"
            className="card animate-up"
            style={{
              marginBottom: 32, padding: '22px 28px',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(168,85,247,0.08))',
              border: '1.5px solid rgba(99,102,241,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              textDecoration: 'none', color: 'inherit', cursor: 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: '0 8px 24px rgba(79,70,229,0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 14,
                background: 'var(--accent-glow)', border: '1px solid rgba(99,102,241,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Brain size={26} color="var(--accent-light)" />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text-primary)' }}>
                  Bạn có <span style={{ color: 'var(--accent-light)' }}>{dueCards.length} từ</span> cần ôn tập hôm nay!
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                  Nhấn vào thẻ này để bắt đầu phiên ôn trắc nghiệm Spaced Repetition 🔥
                </div>
              </div>
            </div>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--accent-glow)', color: 'var(--accent-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <ChevronRight size={20} />
            </div>
          </Link>
        )}

        {/* My Decks */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>Bộ từ của tôi</h2>
          <Link href="/decks" style={{ fontSize: 13, color: 'var(--accent-light)', textDecoration: 'none' }}>
            Xem tất cả →
          </Link>
        </div>

        {loading ? (
          <div className="grid-3">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 140 }} />
            ))}
          </div>
        ) : decks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div className="empty-title">Chưa có bộ từ nào</div>
            <div className="empty-desc">Tạo bộ từ đầu tiên để bắt đầu hành trình học tiếng Anh!</div>
            <Link href="/decks/new" className="btn btn-primary">
              <Plus size={16} /> Tạo ngay
            </Link>
          </div>
        ) : (
          <div className="grid-3">
            {decks.slice(0, 6).map((deck: any) => (
              <Link key={deck.id} href={`/decks/${deck.id}`} className="deck-card">
                <div className="deck-card-name">{deck.name}</div>
                {deck.description && (
                  <div className="deck-card-desc" style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {deck.description}
                  </div>
                )}
                <div className="deck-card-meta">
                  <span className="badge badge-accent" style={{ gap: 4 }}>
                    <BookOpen size={11} /> {deck.totalCards} từ
                  </span>
                  <span className={`badge ${deck.isPublic ? 'badge-purple' : 'tag'}`} style={{ fontSize: 10, gap: 4 }}>
                    {deck.isPublic ? <><Globe size={10} /> Công khai</> : <><Lock size={10} /> Riêng tư</>}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
