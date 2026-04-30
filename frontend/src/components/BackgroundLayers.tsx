/**
 * Fixed background layers rendered behind all page content.
 *
 * - AuroraBackground: three slow-moving blurred radial gradients
 * - DotGrid: subtle dot pattern overlay
 * - NoiseLayer: SVG fractal noise at ~3.5% opacity for texture depth
 * - AuroraStyles: injects the keyframe animations
 */

export function AuroraBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute w-[800px] h-[800px] rounded-full opacity-20 blur-[120px]"
        style={{
          background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)',
          top: '-20%',
          left: '-10%',
          animation: 'aurora1 18s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-15 blur-[100px]"
        style={{
          background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)',
          bottom: '10%',
          right: '-5%',
          animation: 'aurora2 22s ease-in-out infinite alternate',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-10 blur-[80px]"
        style={{
          background: 'radial-gradient(circle, #0ea5e9 0%, transparent 70%)',
          top: '40%',
          left: '40%',
          animation: 'aurora3 26s ease-in-out infinite alternate',
        }}
      />
    </div>
  )
}

export function DotGrid() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      aria-hidden="true"
      style={{
        backgroundImage:
          'radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)',
        backgroundSize: '28px 28px',
      }}
    />
  )
}

export function NoiseLayer() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-[1]"
      aria-hidden="true"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat',
        backgroundSize: '200px 200px',
        opacity: 0.035,
        mixBlendMode: 'overlay',
      }}
    />
  )
}

/** Injects aurora keyframe animations and hides the default cursor globally. */
export function GlobalStyles() {
  return (
    <style>{`
      @keyframes aurora1 {
        0%   { transform: translate(0, 0) scale(1); }
        100% { transform: translate(8%, 12%) scale(1.15); }
      }
      @keyframes aurora2 {
        0%   { transform: translate(0, 0) scale(1); }
        100% { transform: translate(-10%, -8%) scale(1.2); }
      }
      @keyframes aurora3 {
        0%   { transform: translate(0, 0) scale(1); }
        100% { transform: translate(6%, -10%) scale(0.9); }
      }
      * { cursor: none !important; }
    `}</style>
  )
}
