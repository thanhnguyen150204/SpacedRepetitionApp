'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Sidebar from '@/components/Sidebar';
import { uploadOcr, bulkCreateCards, getDecks } from '@/lib/api';
import { Upload, Scan, Plus, Check, X, FileText, Image, BookOpen } from 'lucide-react';

export default function ScanPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [pairs, setPairs] = useState<Array<{ term: string; definition: string; selected: boolean }>>([]);
  const [rawText, setRawText] = useState('');
  const [decks, setDecks] = useState<any[]>([]);
  const [deckId, setDeckId] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    getDecks().then(d => {
      setDecks(d || []);
      if (d && d.length > 0) setDeckId(d[0].id);
    }).catch(console.error);
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const handleFile = (f: File) => setFile(f);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    try {
      const result = await uploadOcr(file);
      setPairs(result.pairs.map((p: any) => ({ ...p, selected: true })));
      setRawText(result.rawText);
      if (result.pairs.length === 0) showToast('⚠️ Không tìm thấy cặp từ-nghĩa. Hãy kiểm tra định dạng file.');
    } catch {
      showToast('❌ Lỗi khi quét file. Vui lòng thử lại.');
    } finally { setScanning(false); }
  };

  const togglePair = (i: number) => {
    setPairs(prev => prev.map((p, idx) => idx === i ? { ...p, selected: !p.selected } : p));
  };

  const handleImport = async () => {
    if (!deckId) { showToast('⚠️ Hãy chọn một bộ từ vựng'); return; }
    const selected = pairs.filter(p => p.selected);
    if (!selected.length) { showToast('⚠️ Chọn ít nhất 1 từ'); return; }
    setSaving(true);
    try {
      await bulkCreateCards(deckId, selected);
      showToast(`✅ Đã thêm thành công ${selected.length} từ vào bộ từ!`);
      setTimeout(() => router.push(`/decks/${deckId}`), 1200);
    } catch {
      showToast('❌ Lỗi khi thêm từ');
    } finally { setSaving(false); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content animate-fade">
        <div className="page-header">
          <h1 className="page-title">Scan tài liệu 📄</h1>
          <p className="page-subtitle">Upload ảnh hoặc PDF để tự động trích xuất từ vựng</p>
        </div>

        <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Upload Zone */}
          <div
            className="card"
            style={{
              border: `2px dashed ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
              background: dragOver ? 'var(--accent-glow)' : 'var(--bg-card)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '48px 24px', cursor: 'pointer', transition: 'all 0.2s ease',
            }}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept="image/*,.pdf"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {file ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>
                  {file.type.includes('pdf') ? '📄' : '🖼️'}
                </div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{file.name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <Upload size={40} color="var(--text-muted)" style={{ marginBottom: 16 }} />
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Kéo thả file vào đây</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Hỗ trợ: JPG, PNG, PDF (tối đa 10MB)
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                  <span className="badge badge-accent"><Image size={11} /> Ảnh</span>
                  <span className="badge badge-purple"><FileText size={11} /> PDF</span>
                </div>
              </div>
            )}
          </div>

          {/* Format tip */}
          <div className="card card-sm" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
              💡 <strong>Định dạng được hỗ trợ:</strong><br />
              • <code style={{ color: 'var(--accent-light)' }}>word - definition</code> (e.g. "perseverance - sự kiên trì")<br />
              • <code style={{ color: 'var(--accent-light)' }}>Bảng Word / Google Docs / PDF</code> (tự động nhận diện từ & nghĩa tiếng Việt)
            </div>
          </div>

          {file && (
            <button id="scan-btn" className="btn btn-primary btn-lg" onClick={handleScan} disabled={scanning} style={{ justifyContent: 'center' }}>
              {scanning ? (
                <><span className="animate-spin" style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> Đang quét...</>
              ) : (
                <><Scan size={20} /> Quét tài liệu</>
              )}
            </button>
          )}

          {/* Results */}
          {pairs.length > 0 && (
            <div className="card animate-up">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontWeight: 700, marginBottom: 4 }}>Từ vựng tìm thấy ({pairs.length})</h3>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {pairs.filter(p => p.selected).length} từ đã chọn
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => setPairs(prev => prev.map(p => ({ ...p, selected: true })))}>
                    Chọn tất cả
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setPairs(prev => prev.map(p => ({ ...p, selected: false })))}>
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto', marginBottom: 20 }}>
                {pairs.map((pair, i) => (
                  <div
                    key={i}
                    onClick={() => togglePair(i)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                      borderRadius: 10, cursor: 'pointer',
                      background: pair.selected ? 'rgba(99,102,241,0.08)' : 'var(--bg-card)',
                      border: `1px solid ${pair.selected ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      background: pair.selected ? 'var(--accent)' : 'transparent',
                      border: `2px solid ${pair.selected ? 'var(--accent)' : 'var(--border)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {pair.selected && <Check size={12} color="white" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontWeight: 600 }}>{pair.term}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 8px' }}>—</span>
                      <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{pair.definition}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="divider" />

              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
                <div className="input-group" style={{ flex: 1 }}>
                  <label className="input-label">Chọn Bộ Từ Vựng Cần Thêm *</label>
                  {decks.length === 0 ? (
                    <div style={{ fontSize: 13, color: 'var(--rose)' }}>
                      Chưa có bộ từ nào.{' '}
                      <Link href="/decks/new" style={{ color: 'var(--accent-light)', textDecoration: 'underline' }}>
                        Tạo bộ từ mới ngay
                      </Link>
                    </div>
                  ) : (
                    <select
                      id="deck-select"
                      className="input"
                      value={deckId}
                      onChange={e => setDeckId(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    >
                      {decks.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          📚 {d.name} ({d.totalCards || 0} từ)
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  id="import-btn"
                  className="btn btn-primary"
                  onClick={handleImport}
                  disabled={saving || !deckId || pairs.filter(p => p.selected).length === 0}
                >
                  {saving ? 'Đang thêm...' : <><Plus size={16} /> Thêm vào bộ từ</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {toast && <div className="toast toast-success">{toast}</div>}
      </main>
    </div>
  );
}
