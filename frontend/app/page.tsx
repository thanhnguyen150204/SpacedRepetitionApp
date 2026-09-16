'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Volume2, VolumeX, SkipForward, Play, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const handleFinish = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      router.push('/login');
    }, 400);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && videoRef.current.duration) {
      const pct = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(pct);
    }
  };

  // Auto-play attempt on mount
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // If browser blocks autoplay, keep muted and try again
        setIsMuted(true);
        if (videoRef.current) videoRef.current.muted = true;
      });
    }
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: '#090d16',
        color: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        opacity: isFadingOut ? 0 : 1,
        transition: 'opacity 0.4s ease-in-out',
        overflow: 'hidden',
        fontFamily: 'var(--font, sans-serif)',
      }}
    >
      {!videoError ? (
        <>
          <video
            ref={videoRef}
            src="/intro.mp4"
            autoPlay
            playsInline
            muted={isMuted}
            onEnded={handleFinish}
            onError={() => setVideoError(true)}
            onTimeUpdate={handleTimeUpdate}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />

          {/* Progress Bar at bottom */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              height: '4px',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #6366f1, #a855f7)',
              transition: 'width 0.1s linear',
              boxShadow: '0 0 10px rgba(99, 102, 241, 0.8)',
            }}
          />

          {/* Overlay Controls */}
          <div
            style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              display: 'flex',
              gap: '12px',
              zIndex: 10,
            }}
          >
            <button
              onClick={toggleMute}
              style={{
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                padding: '10px 16px',
                borderRadius: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease',
              }}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              {isMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            </button>

            <button
              onClick={handleFinish}
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
                border: 'none',
                color: '#fff',
                padding: '10px 20px',
                borderRadius: '30px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                boxShadow: '0 4px 15px rgba(79, 70, 229, 0.4)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Bỏ qua</span>
              <SkipForward size={18} />
            </button>
          </div>
        </>
      ) : (
        /* Fallback screen if intro.mp4 does not exist yet */
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            maxWidth: '500px',
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              fontSize: '32px',
              boxShadow: '0 0 25px rgba(99, 102, 241, 0.5)',
            }}
          >
            🐷
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px' }}>
            Chào mừng đến với HeoKemEnglish
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            Để hiển thị video intro của bạn, hãy đặt file video vào thư mục:<br />
            <code style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '6px', color: '#a7f3d0' }}>
              frontend/public/intro.mp4
            </code>
          </p>
          <button
            onClick={handleFinish}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #9333ea)',
              color: '#fff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '30px',
              fontSize: '15px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 20px rgba(79, 70, 229, 0.4)',
            }}
          >
            Vào trang đăng nhập ngay <Sparkles size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

