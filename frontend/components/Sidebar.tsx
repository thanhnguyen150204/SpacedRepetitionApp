'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BookOpen, LayoutDashboard, Brain, Scan, BarChart3, Plus, Menu, X, LogOut, User as UserIcon, LogIn, Globe, Sparkles } from 'lucide-react';

export default function Sidebar({ dueCount = 0 }: { dueCount?: number }) {
  const path = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('user');
      if (stored) {
        try { setUser(JSON.parse(stored)); } catch (e) {}
      }
    }
  }, []);

  const isActive = (href: string) => path === href || path.startsWith(href + '/');
  const closeSidebar = () => setIsOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <header className="mobile-header">
        <div className="logo" style={{ marginBottom: 0, padding: 0 }}>
          <div className="logo-icon"><Sparkles size={18} color="white" /></div>
          <div className="logo-text">HeoKem<span>English</span></div>
        </div>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle Menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Backdrop Overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'active' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar Drawer */}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="logo-icon"><Sparkles size={20} color="white" /></div>
            <div className="logo-text">HeoKem<span>English</span></div>
          </div>
          <button
            className="btn btn-ghost btn-icon mobile-close-btn"
            onClick={closeSidebar}
          >
            <X size={18} />
          </button>
        </div>

        <nav>
          <div className="nav-label">Menu</div>

          <Link href="/dashboard" onClick={closeSidebar} className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
            <LayoutDashboard className="icon" />
            Dashboard
          </Link>

          <Link href="/decks" onClick={closeSidebar} className={`nav-item ${path === '/decks' ? 'active' : ''}`}>
            <BookOpen className="icon" />
            Bộ từ vựng của tôi
          </Link>

          <Link href="/public-decks" onClick={closeSidebar} className={`nav-item ${isActive('/public-decks') ? 'active' : ''}`}>
            <Globe className="icon" />
            Mẫu bộ từ vựng
          </Link>

          <Link href="/review" onClick={closeSidebar} className={`nav-item ${isActive('/review') ? 'active' : ''}`}>
            <Brain className="icon" />
            Ôn tập hôm nay
            {dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
          </Link>

          <Link href="/scan" onClick={closeSidebar} className={`nav-item ${isActive('/scan') ? 'active' : ''}`}>
            <Scan className="icon" />
            Scan tài liệu
          </Link>

          <Link href="/stats" onClick={closeSidebar} className={`nav-item ${isActive('/stats') ? 'active' : ''}`}>
            <BarChart3 className="icon" />
            Thống kê
          </Link>
        </nav>

        <div style={{ marginTop: 'auto', paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Link href="/decks/new" onClick={closeSidebar} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            <Plus size={16} />
            Tạo bộ từ mới
          </Link>

          {user ? (
            <div style={{ padding: 10, background: 'var(--bg-card-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
                </div>
              </div>
              <button className="btn btn-ghost btn-icon btn-sm" title="Đăng xuất" onClick={handleLogout}>
                <LogOut size={15} color="var(--rose)" />
              </button>
            </div>
          ) : (
            <Link href="/login" onClick={closeSidebar} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
              <LogIn size={15} /> Đăng nhập / Đăng ký
            </Link>
          )}
        </div>
      </aside>
    </>
  );
}
