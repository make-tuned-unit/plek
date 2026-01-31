'use client'

import { useEffect, useRef, useState } from 'react'

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if mobile on mount and window resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    // Update video source when screen size changes
    if (videoRef.current) {
      const video = videoRef.current
      const currentTime = video.currentTime
      const wasPlaying = !video.paused
      
      video.src = isMobile 
        ? '/plekkdriveway-mobile.mp4' 
        : '/hero-driveway.mp4'
      
      video.load()
      
      // Restore playback state
      if (wasPlaying) {
        video.currentTime = currentTime
        video.play().catch(() => {
          // Autoplay might be blocked, that's okay
        })
      }
    }
  }, [isMobile])

  const handleVideoEnd = () => {
    // Freeze video on last frame by pausing it
    if (videoRef.current) {
      videoRef.current.pause()
    }
  }

  return (
    <div className="absolute inset-0 min-w-full min-h-full overflow-hidden bg-neutral-900">
      <video
        ref={videoRef}
        className="absolute inset-0 min-w-full min-h-full w-full h-full object-cover object-center scale-105"
        style={{ objectFit: 'cover', objectPosition: 'center' }}
        autoPlay
        muted
        playsInline
        aria-hidden="true"
        controls={false}
        preload="auto"
        onEnded={handleVideoEnd}
        src={isMobile ? '/plekkdriveway-mobile.mp4' : '/hero-driveway.mp4'}
      />
    </div>
  )
}

