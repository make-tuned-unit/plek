'use client'

export default function HeroVideo() {
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      autoPlay
      muted
      playsInline
      aria-hidden="true"
      controls={false}
      preload="auto"
      loop
    >
      {/* Mobile video */}
      <source 
        src="/Plekkdriveway mobile.mov" 
        type="video/quicktime" 
        media="(max-width: 768px)"
      />
      {/* Desktop video */}
      <source 
        src="/hero-driveway.mp4" 
        type="video/mp4" 
        media="(min-width: 769px)"
      />
      {/* Fallback for browsers that don't support media queries in source */}
      <source src="/hero-driveway.mp4" type="video/mp4" />
    </video>
  )
}

