import React, { useState, useEffect, useRef } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
  isAppReady?: boolean;
}

const CLOUDINARY_VIDEO_URL =
  'https://res.cloudinary.com/dr59elrhw/video/upload/v1791275144/kamtw4fjoz0gpgi4mgiv.mp4';
const LOCAL_VIDEO_URL = '/loading-screen/video-refersh.mp4';

// Extended duration: ~7.5s (increased by ~5.1s from previous 2.4s)
const MIN_VIDEO_TIME_MS = 7500;

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete, isAppReady = true }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const minTimeReachedRef = useRef(false);
  const isAppReadyRef = useRef(isAppReady);
  const hasFinishedRef = useRef(false);

  useEffect(() => {
    isAppReadyRef.current = isAppReady;
    if (minTimeReachedRef.current && isAppReady && !hasFinishedRef.current) {
      triggerFadeOut();
    }
  }, [isAppReady]);

  useEffect(() => {
    const timer = setTimeout(() => {
      minTimeReachedRef.current = true;
      if (isAppReadyRef.current && !hasFinishedRef.current) {
        triggerFadeOut();
      }
    }, MIN_VIDEO_TIME_MS);

    return () => clearTimeout(timer);
  }, []);

  const triggerFadeOut = () => {
    if (hasFinishedRef.current) return;
    hasFinishedRef.current = true;
    setIsFadingOut(true);
    setTimeout(() => {
      onComplete();
    }, 450); // 450ms smooth cinematic fade-out
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#040609] transition-opacity duration-500 ease-in-out select-none pointer-events-none overflow-hidden ${
        isFadingOut ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden="true"
    >
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      >
        <source src={CLOUDINARY_VIDEO_URL} type="video/mp4" />
        <source src={LOCAL_VIDEO_URL} type="video/mp4" />
      </video>
    </div>
  );
};
