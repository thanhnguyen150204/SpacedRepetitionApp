'use client';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { getStats } from '@/lib/api';
import { BarChart3, TrendingUp, Brain, Target } from 'lucide-react';

export default function StatsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  const accuracy = stats?.totalCards > 0
    ? Math.round((stats.mastered / stats.totalCards) * 100) : 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-fade">
        <div className="page-header">
          <h1 className="page-title">Thống kê học tập</h1>
          <p className="page-subtitle">Theo dõi tiến trình ôn luyện của bạn</p>
        </div>

        {loading ? (
          <div className="grid-4">
            {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
          </div>
        ) : (
          <>
            <div className="grid-4" style={{ marginBottom: 32 }}>
              <div className="stat-card">
                <span className="stat-label">Tổng từ vựng</span>
                <span className="stat-value">{stats?.totalCards || 0}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Cần ôn hôm nay</span>
                <span className="stat-value" style={{ color: stats?.dueToday > 0 ? 'var(--rose)' : 'var(--green)' }}>
                  {stats?.dueToday || 0}
                </span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Đã thành thạo</span>
                <span className="stat-value" style={{ color: 'var(--green)' }}>{stats?.mastered || 0}</span>
                <span className="stat-change">≥ 4 lần ôn đúng liên tiếp</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Tỉ lệ thuộc</span>
                <span className="stat-value" style={{ color: accuracy >= 70 ? 'var(--green)' : 'var(--amber)' }}>
                  {accuracy}%
                </span>
              </div>
            </div>

            {/* Progress visual */}
            <div className="card" style={{ marginBottom: 24 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Tổng quan tiến độ</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {[
                  { label: 'Chưa học', value: (stats?.totalCards || 0) - (stats?.learned || 0) - (stats?.mastered || 0), color: 'var(--text-muted)', total: stats?.totalCards },
                  { label: 'Đang học', value: stats?.learned || 0, color: 'var(--amber)', total: stats?.totalCards },
                  { label: 'Thành thạo', value: stats?.mastered || 0, color: 'var(--green)', total: stats?.totalCards },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                      <span style={{ fontSize: 13, color: item.color, fontWeight: 700 }}>{item.value}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{
                        width: `${item.total ? (item.value / item.total) * 100 : 0}%`,
                        background: item.color,
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent activity */}
            {stats?.recentLogs?.length > 0 && (
              <div className="card">
                <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Hoạt động gần đây (30 ngày)</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
                  {stats.recentLogs.slice(0, 30).reverse().map((log: any, i: number) => {
                    const maxCount = Math.max(...stats.recentLogs.map((l: any) => parseInt(l.count)));
                    const height = maxCount > 0 ? (parseInt(log.count) / maxCount) * 100 : 0;
                    return (
                      <div key={i} title={`${log.date}: ${log.count} từ`} style={{
                        flex: 1, background: 'var(--accent)',
                        height: `${Math.max(height, 4)}%`,
                        borderRadius: '3px 3px 0 0', opacity: 0.7 + (i / 30) * 0.3,
                        transition: 'all 0.3s ease', minHeight: 4,
                      }} />
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>
                  <span>30 ngày trước</span>
                  <span>Hôm nay</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
