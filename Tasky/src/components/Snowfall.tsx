import { useEffect, useRef } from 'react';

interface Snowflake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wind: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
}

const Snowfall = () => {
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

    // Create snowflakes
    const snowflakes: Snowflake[] = [];
    const numberOfSnowflakes = 200;

    for (let i = 0; i < numberOfSnowflakes; i++) {
      snowflakes.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 4 + 1,
        speed: Math.random() * 1.5 + 0.5,
        wind: Math.random() * 0.8 - 0.4,
        opacity: Math.random() * 0.7 + 0.3,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    // Animation
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      snowflakes.forEach((flake) => {
        // Draw snowflake with glow effect
        ctx.beginPath();
        ctx.arc(flake.x + Math.sin(flake.wobble) * 10, flake.y, flake.radius, 0, Math.PI * 2);

        // Add glow
        const gradient = ctx.createRadialGradient(
          flake.x + Math.sin(flake.wobble) * 10, flake.y, 0,
          flake.x + Math.sin(flake.wobble) * 10, flake.y, flake.radius * 2
        );
        gradient.addColorStop(0, `rgba(255, 255, 255, ${flake.opacity})`);
        gradient.addColorStop(0.5, `rgba(200, 230, 255, ${flake.opacity * 0.5})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.closePath();

        // Update position with wobble
        flake.y += flake.speed;
        flake.x += flake.wind;
        flake.wobble += flake.wobbleSpeed;

        // Reset when snowflake goes off screen
        if (flake.y > canvas.height) {
          flake.y = -10;
          flake.x = Math.random() * canvas.width;
        }

        if (flake.x > canvas.width) {
          flake.x = 0;
        } else if (flake.x < 0) {
          flake.x = canvas.width;
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ background: 'transparent' }}
    />
  );
};

export default Snowfall;
