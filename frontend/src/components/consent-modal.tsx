"use client";

import { useState } from "react";
import { Shield, CheckCircle2 } from "lucide-react";

interface ConsentModalProps {
    onAccept: () => void;
}

export function ConsentModal({ onAccept }: ConsentModalProps) {
    const [isChecked, setIsChecked] = useState(false);
    const [isVisible, setIsVisible] = useState(true); // Always visible on load

    // Unlock audio playback by playing silent audio on click (Chrome autoplay policy)
    const unlockAudio = () => {
        // Create and resume AudioContext
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
            const ctx = new AudioContextClass();
            ctx.resume().then(() => {
                console.log("🔊 AudioContext unlocked");
            });
            // Play a silent buffer to fully unlock
            const buffer = ctx.createBuffer(1, 1, 22050);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.start(0);
        }

        // Also try to play a silent HTML audio
        const audio = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        audio.volume = 0.01;
        audio.play().then(() => {
            console.log("🔊 Audio element unlocked");
        }).catch(() => {
            // Ignore errors
        });
    };

    const handleAccept = () => {
        if (!isChecked) return;

        // IMPORTANT: Unlock audio FIRST within the click handler
        unlockAudio();

        // Trigger onAccept (no localStorage - modal appears every page load)
        onAccept();

        // Hide modal
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md">
            <div className="relative w-full max-w-md mx-4 animate-in fade-in zoom-in duration-300">
                {/* Card */}
                <div className="bg-gradient-to-br from-gray-900 to-gray-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-primary/20 to-cyan-500/20 p-6 border-b border-white/10">
                        <div className="flex items-center gap-3">
                            <div className="p-3 rounded-xl bg-primary/20 border border-primary/30">
                                <Shield className="size-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Terms & Permissions</h2>
                                <p className="text-sm text-white/60">Please accept to continue</p>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <div className="text-sm text-white/70 space-y-3">
                            <p>
                                Welcome to the <span className="text-primary font-medium">Dental X-Ray AI Analysis</span> platform.
                            </p>
                            <p>
                                By continuing, you agree to our Terms of Service and allow the application to:
                            </p>
                            <ul className="space-y-2 ml-2">
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                                    <span>Process your dental X-ray images for AI analysis</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                                    <span>Provide audio feedback and voice notifications</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <CheckCircle2 className="size-4 text-primary mt-0.5 shrink-0" />
                                    <span>Generate diagnostic reports based on detected conditions</span>
                                </li>
                            </ul>
                        </div>

                        {/* Checkbox */}
                        <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                            <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => setIsChecked(e.target.checked)}
                                className="mt-0.5 size-5 rounded border-white/30 bg-white/10 text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                            />
                            <span className="text-sm text-white/80">
                                I have read and agree to the <span className="text-primary underline">Terms of Service</span> and <span className="text-primary underline">Privacy Policy</span>
                            </span>
                        </label>

                        {/* Accept Button */}
                        <button
                            onClick={handleAccept}
                            disabled={!isChecked}
                            className={`
                                w-full py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-200
                                ${isChecked
                                    ? 'bg-gradient-to-r from-primary to-cyan-500 text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-[1.02]'
                                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                                }
                            `}
                        >
                            Accept & Continue
                        </button>

                        <p className="text-xs text-center text-white/40">
                            Your data is processed securely and never shared with third parties.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
