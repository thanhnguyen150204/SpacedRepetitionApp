'use client';
import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
  gravity: number;
  shape: 'circle' | 'square' | 'star';
  rotation: number;
  rotationSpeed: number;
}

export default function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const colors = [
      '#6366f1', '#a855f7', '#ec4899', '#3b82f6', '#10b981',
      '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#f43f5e'
    ];

    const particles: Particle[] = [];

    // Helper to launch fireworks burst from origin (x, y) with angle range
    const launchBurst = (x: number, y: number, angleMin: number, angleMax: number, count = 40) => {
      for (let i = 0; i < count; i++) {
        const angle = angleMin + Math.random() * (angleMax - angleMin);
        const speed = 8 + Math.random() * 16;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shapes: ('circle' | 'square' | 'star')[] = ['circle', 'square', 'star'];
        const shape = shapes[Math.floor(Math.random() * shapes.length)];

        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          radius: 4 + Math.random() * 6,
          alpha: 1,
          decay: 0.008 + Math.random() * 0.012,
          gravity: 0.35 + Math.random() * 0.2,
          shape,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.2,
        });
      }
    };

    // Burst from 4 corners + bottom center!
    // Top-Left corner shooting down-right
    launchBurst(0, 0, Math.PI * 0.1, Math.PI * 0.4, 45);
    // Top-Right corner shooting down-left
    launchBurst(width, 0, Math.PI * 0.6, Math.PI * 0.9, 45);
    // Bottom-Left corner shooting up-right
    launchBurst(0, height, -Math.PI * 0.45, -Math.PI * 0.1, 55);
    // Bottom-Right corner shooting up-left
    launchBurst(width, height, -Math.PI * 0.9, -Math.PI * 0.55, 55);
    // Bottom-Center burst
    launchBurst(width / 2, height, -Math.PI * 0.75, -Math.PI * 0.25, 50);

    // Second wave burst after 400ms!
    const timer = setTimeout(() => {
      launchBurst(width * 0.2, height * 0.2, 0, Math.PI * 2, 35);
      launchBurst(width * 0.8, height * 0.2, 0, Math.PI * 2, 35);
      launchBurst(width * 0.5, height * 0.4, 0, Math.PI * 2, 40);
    }, 400);

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.98;
        p.alpha -= p.decay;
        p.rotation += p.rotationSpeed;

        if (p.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'square') {
          ctx.fillRect(-p.radius, -p.radius, p.radius * 2, p.radius * 2);
        } else {
          // Star
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            ctx.lineTo(Math.cos(((18 + s * 72) * Math.PI) / 180) * p.radius, -Math.sin(((18 + s * 72) * Math.PI) / 180) * p.radius);
            ctx.lineTo(Math.cos(((54 + s * 72) * Math.PI) / 180) * (p.radius / 2), -Math.sin(((54 + s * 72) * Math.PI) / 180) * (p.radius / 2));
          }
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      if (particles.length > 0) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 99999,
      }}
    />
  );
}
