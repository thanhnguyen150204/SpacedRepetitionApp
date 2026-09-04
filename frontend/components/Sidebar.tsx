'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, Brain, Scan, BarChart3, Plus, Menu, X } from 'lucide-react';

export default function Sidebar({ dueCount = 0 }: { dueCount?: number }) {
  const path = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const isActive = (href: string) => path === href || path.startsWith(href + '/');

  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <header className="mobile-header">
        <div className="logo" style={{ marginBottom: 0, padding: 0 }}>
          <div className="logo-icon">🐷</div>
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
            <div className="logo-icon">🐷</div>
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

          <Link href="/decks" onClick={closeSidebar} className={`nav-item ${isActive('/decks') ? 'active' : ''}`}>
            <BookOpen className="icon" />
            Bộ từ vựng
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

        <div style={{ marginTop: 'auto', paddingTop: 16 }}>
          <Link href="/decks/new" onClick={closeSidebar} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            <Plus size={16} />
            Tạo bộ từ mới
          </Link>
        </div>
      </aside>
    </>
  );
}
