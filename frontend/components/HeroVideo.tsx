'use client'

export default function HeroVideo() {
  return (
    <video
      className="absolute inset-0 h-full w-full object-cover"
      src="/hero-driveway.mp4"
      autoPlay
      muted
      playsInline
      aria-hidden="true"
      controls={false}
      preload="auto"
    />
  )
}

