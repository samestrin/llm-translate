import React, { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

const HistoryAudio = ({ children }) => {
  const [audioElement, setAudioElement] = useState(null);
  const [speakingItemId, setSpeakingItemId] = useState(null);
  const [isSpeakingLoading, setIsSpeakingLoading] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [speakError, setSpeakError] = useState(false);
  const [speakCount, setSpeakCount] = useState(0);
  const [canSpeak, setCanSpeak] = useState(true);
  const [audioCache, setAudioCache] = useState({});
  const MAX_SPEAKS_PER_DAY = 10;

  // Initialize audio element and speak count
  useEffect(() => {
    // Create audio element
    const audio = new Audio();
    setAudioElement(audio);
    
    // Set up audio event listeners
    audio.addEventListener('playing', () => setIsAudioPlaying(true));
    audio.addEventListener('ended', () => {
      setIsAudioPlaying(false);
      setSpeakingItemId(null);
    });
    audio.addEventListener('pause', () => setIsAudioPlaying(false));
    
    // Only show error toast when we're actually trying to play something
    audio.addEventListener('error', () => {
      // Only show error if we're actively trying to play audio
      if (speakingItemId) {
        setSpeakError(true);
        setIsAudioPlaying(false);
        setSpeakingItemId(null);
        toast.error('Error playing audio. Please try again.');
      }
    });
    
    // Load speak count from localStorage
    const storedSpeakCount = localStorage.getItem('speakCount');
    const storedLastSpeakDate = localStorage.getItem('lastSpeakDate');
    const today = new Date().toLocaleDateString();
    
    if (storedLastSpeakDate && storedLastSpeakDate === today) {
      const count = parseInt(storedSpeakCount, 10) || 0;
      setSpeakCount(count);
      setCanSpeak(count < MAX_SPEAKS_PER_DAY);
    } else {
      // Reset count if it's a new day
      setSpeakCount(0);
      localStorage.setItem('speakCount', '0');
      localStorage.setItem('lastSpeakDate', today);
      setCanSpeak(true);
    }
    
    // Cleanup on unmount
    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('playing', () => setIsAudioPlaying(true));
      audio.removeEventListener('ended', () => {
        setIsAudioPlaying(false);
        setSpeakingItemId(null);
      });
      audio.removeEventListener('pause', () => setIsAudioPlaying(false));
      audio.removeEventListener('error', () => {
        setSpeakError(true);
        setIsAudioPlaying(false);
        setSpeakingItemId(null);
      });
    };
  }, []);

  return children({
    audioElement,
    speakingItemId,
    setSpeakingItemId,
    isSpeakingLoading,
    setIsSpeakingLoading,
    isAudioPlaying,
    speakError,
    setSpeakError,
    speakCount,
    setSpeakCount,
    canSpeak,
    setCanSpeak,
    audioCache,
    setAudioCache,
    MAX_SPEAKS_PER_DAY
  });
};

export default HistoryAudio;