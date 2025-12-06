"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bot, Volume2, VolumeX } from "lucide-react";

export type RobotState =
    | "idle"
    | "file_uploaded"
    | "predicting"
    | "prediction_complete"
    | "generating_report"
    | "report_complete";

interface RobotChatBubbleProps {
    state: RobotState;
    fileName?: string;
    conditionsFound?: number;
    isRobotLoaded?: boolean;
}

const MESSAGES: Record<RobotState, string> = {
    idle: "👋 Hey there! Upload an X-ray image and I'll help you detect dental conditions!",
    file_uploaded: "📸 Nice! I see you've uploaded an X-ray. Click the **Predict** button and I'll analyze it for cavities and other conditions!",
    predicting: "🔍 Analyzing your X-ray... Looking for cavities, lesions, and other dental conditions...",
    prediction_complete: "✅ Analysis complete! I found some findings. Click **Generate Diagnosis Report** for detailed recommendations!",
    generating_report: "📝 Generating your comprehensive diagnosis report with treatment recommendations...",
    report_complete: "🎉 Your diagnosis report is ready! Check out the detailed analysis and recommendations below.",
};

// Strip emojis and markdown for speech
function cleanTextForSpeech(text: string): string {
    return text
        .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // emoticons
        .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // symbols & pictographs
        .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // transport & map
        .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // flags
        .replace(/[\u{2600}-\u{26FF}]/gu, '')   // misc symbols
        .replace(/[\u{2700}-\u{27BF}]/gu, '')   // dingbats
        .replace(/\*\*/g, '')                    // bold markdown
        .replace(/\*/g, '')                      // italic markdown
        .trim();
}

export function RobotChatBubble({ state, fileName, conditionsFound, isRobotLoaded = true }: RobotChatBubbleProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [voicesReady, setVoicesReady] = useState(false);
    const speechSynthRef = useRef<SpeechSynthesisUtterance | null>(null);
    const speakRetryRef = useRef<NodeJS.Timeout | null>(null);

    const message = MESSAGES[state];

    // Custom message based on conditions found
    const enhancedMessage = state === "prediction_complete" && conditionsFound !== undefined
        ? `✅ Analysis complete! I found **${conditionsFound} condition${conditionsFound !== 1 ? 's' : ''}**. Click **Generate Diagnosis Report** for detailed recommendations!`
        : message;

    // Get the best male voice available
    const getBestMaleVoice = useCallback(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;

        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) return null;

        // Priority order for deep, natural male voices
        const voicePriorities = [
            // Windows voices
            (v: SpeechSynthesisVoice) => v.name.includes('David'),
            (v: SpeechSynthesisVoice) => v.name.includes('Mark'),
            (v: SpeechSynthesisVoice) => v.name.includes('Guy'),
            // Google voices
            (v: SpeechSynthesisVoice) => v.name.includes('Google US English') && !v.name.includes('Female'),
            (v: SpeechSynthesisVoice) => v.name.includes('Google UK English Male'),
            // macOS voices
            (v: SpeechSynthesisVoice) => v.name.includes('Alex'),
            (v: SpeechSynthesisVoice) => v.name.includes('Daniel'),
            // Generic English male
            (v: SpeechSynthesisVoice) => v.lang.startsWith('en') && v.name.toLowerCase().includes('male'),
            // Any English voice as fallback
            (v: SpeechSynthesisVoice) => v.lang.startsWith('en-US'),
            (v: SpeechSynthesisVoice) => v.lang.startsWith('en'),
        ];

        for (const check of voicePriorities) {
            const voice = voices.find(check);
            if (voice) return voice;
        }

        return voices[0];
    }, []);

    // Speech function - deep podcast-like male voice
    const speakMessage = useCallback((text: string, retryCount = 0) => {
        if (isMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const voices = window.speechSynthesis.getVoices();

        // If voices aren't loaded yet, retry after a delay (up to 5 retries)
        if (voices.length === 0 && retryCount < 5) {
            speakRetryRef.current = setTimeout(() => {
                speakMessage(text, retryCount + 1);
            }, 200);
            return;
        }

        const cleanText = cleanTextForSpeech(text);
        const utterance = new SpeechSynthesisUtterance(cleanText);

        // Deep, podcast-like male voice settings
        utterance.pitch = 0.85;   // Slightly lower for deeper voice
        utterance.rate = 0.92;    // Slightly slower for podcast feel
        utterance.volume = 1.0;

        // Get the best male voice
        const voice = getBestMaleVoice();
        if (voice) {
            utterance.voice = voice;
        }

        speechSynthRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [isMuted, getBestMaleVoice]);

    // Load voices on mount
    useEffect(() => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

        // Function to check and set voices ready
        const checkVoices = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length > 0) {
                setVoicesReady(true);
                return true;
            }
            return false;
        };

        // Check immediately
        if (checkVoices()) return;

        // Chrome requires listening for voiceschanged
        const handleVoicesChanged = () => {
            checkVoices();
        };

        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);

        // Also poll a few times as backup
        const pollInterval = setInterval(() => {
            if (checkVoices()) {
                clearInterval(pollInterval);
            }
        }, 100);

        // Clear polling after 2 seconds
        const pollTimeout = setTimeout(() => {
            clearInterval(pollInterval);
        }, 2000);

        return () => {
            window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
            clearInterval(pollInterval);
            clearTimeout(pollTimeout);
            if (speakRetryRef.current) {
                clearTimeout(speakRetryRef.current);
            }
            if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Animate visibility - only show after robot is loaded
    useEffect(() => {
        if (!isRobotLoaded) {
            setIsVisible(false);
            return;
        }

        // Reset the spoken state ref when state changes so new state can be spoken
        // This is needed because we're resetting visibility
        setIsVisible(false);
        const timer = setTimeout(() => {
            setIsVisible(true);
            setIsTyping(true);
            setDisplayedText("");
        }, 300); // Slight delay after robot loads
        return () => clearTimeout(timer);
    }, [state, isRobotLoaded]);

    // Typewriter effect
    useEffect(() => {
        if (!isVisible || !isTyping) return;

        const targetMessage = state === "prediction_complete" && conditionsFound !== undefined
            ? enhancedMessage
            : message;

        let index = 0;
        const interval = setInterval(() => {
            if (index < targetMessage.length) {
                setDisplayedText(targetMessage.slice(0, index + 1));
                index++;
            } else {
                setIsTyping(false);
                clearInterval(interval);
            }
        }, 20); // Speed of typing

        return () => clearInterval(interval);
    }, [isVisible, message, isTyping, state, conditionsFound, enhancedMessage]);

    // Speak when bubble becomes visible AND voices are ready
    useEffect(() => {
        // Need both visibility and voices to be ready
        if (!isVisible || !voicesReady) return;

        // Check other conditions at the time of speaking
        if (!isRobotLoaded || isMuted) return;

        // Speak after a short delay to let typewriter start
        const speechDelay = setTimeout(() => {
            const textToSpeak = state === "prediction_complete" && conditionsFound !== undefined
                ? enhancedMessage
                : message;
            speakMessage(textToSpeak);
        }, 600);

        return () => clearTimeout(speechDelay);
    }, [isVisible, state, voicesReady, isRobotLoaded, isMuted, conditionsFound, enhancedMessage, message, speakMessage]);

    // Toggle mute
    const toggleMute = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        setIsMuted(!isMuted);
    };

    // Don't render if robot hasn't loaded yet
    if (!isRobotLoaded) {
        return null;
    }

    return (
        <div
            className={`
        absolute top-4 left-4 right-4 z-30
        transition-all duration-500 ease-out
        ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}
      `}
        >
            {/* Chat Bubble */}
            <div className="relative">
                {/* Glassmorphism bubble */}
                <div className="
          bg-black/40 backdrop-blur-xl
          border border-white/20
          rounded-2xl
          p-4
          shadow-2xl
          shadow-primary/20
        ">
                    {/* Robot icon and mute button */}
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 p-2 rounded-full bg-primary/20 border border-primary/30 animate-pulse">
                            <Bot className="size-5 text-primary" />
                        </div>

                        {/* Message */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium text-primary">AI Assistant</p>
                                {/* Mute/Unmute button */}
                                <button
                                    onClick={toggleMute}
                                    className="p-1 rounded-full hover:bg-white/10 transition-colors"
                                    title={isMuted ? "Unmute voice" : "Mute voice"}
                                >
                                    {isMuted ? (
                                        <VolumeX className="size-4 text-white/50" />
                                    ) : (
                                        <Volume2 className="size-4 text-primary" />
                                    )}
                                </button>
                            </div>
                            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                                {displayedText}
                                {isTyping && <span className="animate-pulse">|</span>}
                            </p>
                        </div>
                    </div>

                    {/* Loading indicator for active states */}
                    {(state === "predicting" || state === "generating_report") && (
                        <div className="mt-3 flex items-center gap-2">
                            <div className="flex gap-1">
                                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                                <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                            </div>
                            <span className="text-xs text-white/50">Processing...</span>
                        </div>
                    )}
                </div>

                {/* Speech bubble tail pointing down-right toward robot */}
                <div className="absolute -bottom-2 right-8 w-4 h-4 bg-black/40 backdrop-blur-xl border-r border-b border-white/20 rotate-45 transform" />
            </div>
        </div>
    );
}

