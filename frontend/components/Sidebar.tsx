'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, LayoutDashboard, Brain, Scan, BarChart3, Plus } from 'lucide-react';

export default function Sidebar({ dueCount = 0 }: { dueCount?: number }) {
  const path = usePathname();
  const isActive = (href: string) => path === href || path.startsWith(href + '/');

  return (
    <aside className="sidebar">
      <div className="logo">
        <div className="logo-icon">🐷</div>
        <div className="logo-text">HeoKem<span>English</span></div>
      </div>

      <nav>
        <div className="nav-label">Menu</div>

        <Link href="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
          <LayoutDashboard className="icon" />
          Dashboard
        </Link>

        <Link href="/decks" className={`nav-item ${isActive('/decks') ? 'active' : ''}`}>
          <BookOpen className="icon" />
          Bộ từ vựng
        </Link>

        <Link href="/review" className={`nav-item ${isActive('/review') ? 'active' : ''}`}>
          <Brain className="icon" />
          Ôn tập hôm nay
          {dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
        </Link>

        <Link href="/scan" className={`nav-item ${isActive('/scan') ? 'active' : ''}`}>
          <Scan className="icon" />
          Scan tài liệu
        </Link>

        <Link href="/stats" className={`nav-item ${isActive('/stats') ? 'active' : ''}`}>
          <BarChart3 className="icon" />
          Thống kê
        </Link>
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <Link href="/decks/new" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          <Plus size={16} />
          Tạo bộ từ mới
        </Link>
      </div>
    </aside>
  );
}
