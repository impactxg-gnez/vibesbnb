'use client';

import { useEffect, useRef } from 'react';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Streamer lines
    const streamers: Array<{
      x: number;
      y: number;
      length: number;
      speed: number;
      angle: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 15; i++) {
      streamers.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        length: 100 + Math.random() * 200,
        speed: 0.5 + Math.random() * 1.5,
        angle: Math.random() * Math.PI * 2,
        opacity: 0.1 + Math.random() * 0.2,
      });
    }

    // Floating travel elements
    const travelElements: Array<{
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      icon: string;
      opacity: number;
    }> = [];

    const icons = ['✈️', '🏔️', '🌊', '🌴', '🏕️', '🗺️', '🧳', '🌅'];
    for (let i = 0; i < 20; i++) {
      travelElements.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 20 + Math.random() * 30,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: (Math.random() - 0.5) * 0.3,
        icon: icons[Math.floor(Math.random() * icons.length)],
        opacity: 0.15 + Math.random() * 0.2,
      });
    }

    // Particles
    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: 1 + Math.random() * 2,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: 0.2 + Math.random() * 0.3,
      });
    }

    let animationFrameId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw streamer lines
      streamers.forEach((streamer) => {
        ctx.save();
        ctx.strokeStyle = `rgba(74, 124, 74, ${streamer.opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(streamer.x, streamer.y);
        ctx.lineTo(
          streamer.x + Math.cos(streamer.angle) * streamer.length,
          streamer.y + Math.sin(streamer.angle) * streamer.length
        );
        ctx.stroke();
        ctx.restore();

        // Update position
        streamer.x += Math.cos(streamer.angle) * streamer.speed;
        streamer.y += Math.sin(streamer.angle) * streamer.speed;

        // Wrap around edges
        if (streamer.x < -streamer.length) streamer.x = canvas.width + streamer.length;
        if (streamer.x > canvas.width + streamer.length) streamer.x = -streamer.length;
        if (streamer.y < -streamer.length) streamer.y = canvas.height + streamer.length;
        if (streamer.y > canvas.height + streamer.length) streamer.y = -streamer.length;
      });

      // Draw floating travel elements
      travelElements.forEach((element) => {
        ctx.save();
        ctx.globalAlpha = element.opacity;
        ctx.font = `${element.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(element.icon, element.x, element.y);
        ctx.restore();

        // Update position
        element.x += element.speedX;
        element.y += element.speedY;

        // Wrap around edges
        if (element.x < -element.size) element.x = canvas.width + element.size;
        if (element.x > canvas.width + element.size) element.x = -element.size;
        if (element.y < -element.size) element.y = canvas.height + element.size;
        if (element.y > canvas.height + element.size) element.y = -element.size;
      });

      // Draw particles
      particles.forEach((particle) => {
        ctx.save();
        ctx.fillStyle = `rgba(74, 124, 74, ${particle.opacity})`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Update position
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

