/**
 * AudioTestButton - Minimal test component for voice preview
 * This is a simplified version to isolate the audio playback issue
 */

import { useState, useRef } from 'react';
import { Play, Pause, AlertCircle, Loader2 } from 'lucide-react';

interface AudioTestButtonProps {
    voiceId: string;
    voiceName: string;
    provider: string;
}

export function AudioTestButton({ voiceId, voiceName, provider }: AudioTestButtonProps) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const blobUrlRef = useRef<string | null>(null);

    const handleClick = async () => {
        console.log('[AudioTest] Button clicked for:', voiceName);

        // If playing, stop
        if (status === 'playing' && audioRef.current) {
            console.log('[AudioTest] Stopping...');
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setStatus('idle');
            return;
        }

        // If loading, do nothing
        if (status === 'loading') return;

        // Cleanup previous
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            // Fetch audio
            const url = `/api/voice/preview/${voiceId}?provider=${provider}`;
            console.log('[AudioTest] Fetching:', url);

            const res = await fetch(url);
            console.log('[AudioTest] Response:', res.status);

            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const buffer = await res.arrayBuffer();
            console.log('[AudioTest] Buffer size:', buffer.byteLength);

            if (buffer.byteLength < 100) throw new Error('Data too small');

            // Create blob and URL
            const blob = new Blob([buffer], { type: 'audio/mpeg' });
            const blobUrl = URL.createObjectURL(blob);
            blobUrlRef.current = blobUrl;
            console.log('[AudioTest] Blob URL created');

            // Create audio and play
            const audio = new Audio(blobUrl);
            audioRef.current = audio;

            audio.onended = () => {
                console.log('[AudioTest] Ended');
                setStatus('idle');
            };

            audio.onerror = (e) => {
                console.error('[AudioTest] Audio error:', e);
                setStatus('error');
                setErrorMsg('Audio error');
            };

            console.log('[AudioTest] Playing...');
            await audio.play();
            console.log('[AudioTest] Playing!');
            setStatus('playing');

        } catch (err) {
            console.error('[AudioTest] Error:', err);
            setStatus('error');
            setErrorMsg(err instanceof Error ? err.message : 'Unknown');
        }
    };

    return (
        <button
            onClick={handleClick}
            disabled={status === 'loading'}
            className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${status === 'error' ? 'bg-red-900/50 text-red-400' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}
                transition-colors
            `}
            title={status === 'error' ? `Error: ${errorMsg}` : voiceName}
        >
            {status === 'loading' && (
                <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {status === 'error' && (
                <AlertCircle className="w-4 h-4" />
            )}
            {status === 'playing' && (
                <Pause className="w-4 h-4" />
            )}
            {status === 'idle' && (
                <Play className="w-4 h-4 ml-0.5" />
            )}
        </button>
    );
}
