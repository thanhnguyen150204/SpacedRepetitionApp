'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { createDeck } from '@/lib/api';
import { ArrowLeft, BookOpen } from 'lucide-react';

export default function NewDeckPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Vui lòng nhập tên bộ từ'); return; }
    setLoading(true);
    try {
      const deck = await createDeck(form);
      router.push(`/decks/${deck.id}`);
    } catch {
      setError('Có lỗi xảy ra, vui lòng thử lại');
      setLoading(false);
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-fade">
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <Link href="/decks" className="btn btn-ghost btn-sm" style={{ marginBottom: 24 }}>
            <ArrowLeft size={16} /> Quay lại
          </Link>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg, var(--accent), var(--purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <BookOpen size={24} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>Tạo bộ từ mới</h1>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nhóm các từ vựng liên quan lại</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="input-group">
                <label className="input-label">Tên bộ từ *</label>
                <input
                  id="deck-name"
                  className="input"
                  placeholder="Ví dụ: IELTS Vocabulary, Từ vựng văn phòng..."
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  maxLength={200}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Mô tả (tùy chọn)</label>
                <textarea
                  id="deck-desc"
                  className="input"
                  placeholder="Mô tả ngắn về bộ từ này..."
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={3}
                />
              </div>

              {error && (
                <div style={{ padding: '12px 16px', borderRadius: 10, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', color: 'var(--rose)', fontSize: 14 }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <Link href="/decks" className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Hủy
                </Link>
                <button id="create-deck-btn" type="submit" className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }} disabled={loading}>
                  {loading ? <span className="animate-spin" style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> : null}
                  {loading ? 'Đang tạo...' : 'Tạo bộ từ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
