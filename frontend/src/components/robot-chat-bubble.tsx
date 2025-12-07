"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bot, Volume2, VolumeX } from "lucide-react";

// ElevenLabs Configuration
const ELEVENLABS_API_KEY = "sk_1e6dde8d81f8c2abce2458fbe7def4a38be489090b76145e";
const ELEVENLABS_VOICE_ID = "ltUipZFlFUhlYModrYoo";

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
    const [isReady, setIsReady] = useState(false);
    const [pendingSpeech, setPendingSpeech] = useState<string | null>(null);
    // Track the last state that was actually spoken
    const lastSpokenStateRef = useRef<RobotState | null>(null);
    // Audio element for ElevenLabs playback
    const audioRef = useRef<HTMLAudioElement | null>(null);
    // Track current audio URL for cleanup
    const currentAudioUrlRef = useRef<string | null>(null);

    const message = MESSAGES[state];

    // Custom message based on conditions found
    const enhancedMessage = state === "prediction_complete" && conditionsFound !== undefined
        ? `✅ Analysis complete! I found **${conditionsFound} condition${conditionsFound !== 1 ? 's' : ''}**. Click **Generate Diagnosis Report** for detailed recommendations!`
        : message;

    // ElevenLabs Text-to-Speech function
    const speakWithElevenLabs = useCallback(async (text: string, currentState: RobotState) => {
        if (isMuted) {
            return;
        }

        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        // Cleanup previous audio URL
        if (currentAudioUrlRef.current) {
            URL.revokeObjectURL(currentAudioUrlRef.current);
            currentAudioUrlRef.current = null;
        }

        const cleanText = cleanTextForSpeech(text);

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
                {
                    method: "POST",
                    headers: {
                        "Accept": "audio/mpeg",
                        "Content-Type": "application/json",
                        "xi-api-key": ELEVENLABS_API_KEY,
                    },
                    body: JSON.stringify({
                        text: cleanText,
                        model_id: "eleven_turbo_v2_5",
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.75,
                        },
                    }),
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                console.error("ElevenLabs API error:", response.status, response.statusText, "Details:", errorText);
                return;
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            currentAudioUrlRef.current = audioUrl;

            const audio = new Audio(audioUrl);
            audioRef.current = audio;

            audio.onplay = () => {
                lastSpokenStateRef.current = currentState;
            };

            audio.onerror = () => {
                console.error("Audio playback error");
            };

            audio.onended = () => {
                if (currentAudioUrlRef.current === audioUrl) {
                    URL.revokeObjectURL(audioUrl);
                    currentAudioUrlRef.current = null;
                }
            };

            await audio.play();
        } catch (error) {
            console.error("ElevenLabs TTS error:", error);
        }
    }, [isMuted]);

    // Generate unique mount ID on each page load
    const hasTriedInitialSpeechRef = useRef(false);

    // AudioContext ref for priming audio system
    const audioContextRef = useRef<AudioContext | null>(null);

    // Mark as ready on mount and try to prime AudioContext for autoplay
    useEffect(() => {
        hasTriedInitialSpeechRef.current = false;
        lastSpokenStateRef.current = null;

        // Try to create and resume AudioContext to unlock audio
        try {
            const AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
            if (AudioContext) {
                audioContextRef.current = new AudioContext();
                // Try to resume immediately - this might unlock audio in some browsers
                audioContextRef.current.resume().then(() => {
                    console.log("🔊 AudioContext resumed - audio might be enabled");
                }).catch(() => {
                    console.log("⚠️ AudioContext could not resume automatically");
                });
            }
        } catch (e) {
            console.log("AudioContext not available");
        }

        const timer = setTimeout(() => {
            setIsReady(true);
        }, 500);

        return () => {
            clearTimeout(timer);
            if (audioRef.current) {
                audioRef.current.pause();
            }
            if (currentAudioUrlRef.current) {
                URL.revokeObjectURL(currentAudioUrlRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    // Animate visibility - only show after robot is loaded
    useEffect(() => {
        if (!isRobotLoaded) {
            setIsVisible(false);
            return;
        }

        setIsVisible(false);
        const timer = setTimeout(() => {
            setIsVisible(true);
            setIsTyping(true);
            setDisplayedText("");
        }, 300);
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
        }, 20);

        return () => clearInterval(interval);
    }, [isVisible, message, isTyping, state, conditionsFound, enhancedMessage]);

    // TRY TO PLAY ON MOUNT - if browser blocks, queue for click
    useEffect(() => {
        if (!isVisible || !isReady || !isRobotLoaded || isMuted) {
            return;
        }

        if (hasTriedInitialSpeechRef.current) {
            return;
        }

        hasTriedInitialSpeechRef.current = true;

        const textToSpeak = message;

        // Try to play immediately
        const tryPlay = async () => {
            console.log("🎙️ Attempting auto-play for:", state);

            try {
                const cleanText = cleanTextForSpeech(textToSpeak);
                const response = await fetch(
                    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
                    {
                        method: "POST",
                        headers: {
                            "Accept": "audio/mpeg",
                            "Content-Type": "application/json",
                            "xi-api-key": ELEVENLABS_API_KEY,
                        },
                        body: JSON.stringify({
                            text: cleanText,
                            model_id: "eleven_turbo_v2_5",
                            voice_settings: { stability: 0.5, similarity_boost: 0.75 },
                        }),
                    }
                );

                if (!response.ok) {
                    console.error("ElevenLabs API error");
                    return;
                }

                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                currentAudioUrlRef.current = audioUrl;

                const audio = new Audio(audioUrl);
                audioRef.current = audio;

                audio.onplay = () => {
                    lastSpokenStateRef.current = state;
                    console.log("✅ Auto-play succeeded!");
                };

                audio.onended = () => {
                    if (currentAudioUrlRef.current === audioUrl) {
                        URL.revokeObjectURL(audioUrl);
                        currentAudioUrlRef.current = null;
                    }
                };

                await audio.play();

            } catch (error: unknown) {
                // Browser blocked autoplay - queue for click
                if (error instanceof Error && error.name === 'NotAllowedError') {
                    console.log("⚠️ Autoplay blocked - click anywhere to enable audio");
                    setPendingSpeech(textToSpeak);
                } else {
                    console.error("Speech error:", error);
                }
            }
        };

        tryPlay();
    }, [isVisible, isReady, isRobotLoaded, isMuted, state, message]);

    // Play pending speech when user clicks (fallback for autoplay block)
    useEffect(() => {
        if (!pendingSpeech) return;

        const handleClick = () => {
            console.log("🎙️ Playing queued speech after click");
            speakWithElevenLabs(pendingSpeech, state);
            setPendingSpeech(null);
            document.removeEventListener('click', handleClick);
        };

        document.addEventListener('click', handleClick);
        return () => document.removeEventListener('click', handleClick);
    }, [pendingSpeech, state, speakWithElevenLabs]);

    // Speak when state changes (for non-idle states)
    useEffect(() => {
        if (!isVisible || !isReady || !isRobotLoaded || isMuted) return;
        if (state === "idle") return;
        if (lastSpokenStateRef.current === state) return;

        const textToSpeak = state === "prediction_complete" && conditionsFound !== undefined
            ? enhancedMessage
            : message;

        const delay = setTimeout(() => {
            console.log("🎙️ Speaking state change:", state);
            speakWithElevenLabs(textToSpeak, state);
        }, 600);

        return () => clearTimeout(delay);
    }, [isVisible, state, isReady, isRobotLoaded, isMuted, conditionsFound, enhancedMessage, message, speakWithElevenLabs]);

    // Toggle mute
    const toggleMute = () => {
        // Stop any currently playing ElevenLabs audio
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
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

