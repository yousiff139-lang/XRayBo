"use client";

import { useEffect, useState } from "react";
import { Bot } from "lucide-react";

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
}

const MESSAGES: Record<RobotState, string> = {
    idle: "👋 Hey there! Upload an X-ray image and I'll help you detect dental conditions!",
    file_uploaded: "📸 Nice! I see you've uploaded an X-ray. Click the **Predict** button and I'll analyze it for cavities and other conditions!",
    predicting: "🔍 Analyzing your X-ray... Looking for cavities, lesions, and other dental conditions...",
    prediction_complete: "✅ Analysis complete! I found some findings. Click **Generate Diagnosis Report** for detailed recommendations!",
    generating_report: "📝 Generating your comprehensive diagnosis report with treatment recommendations...",
    report_complete: "🎉 Your diagnosis report is ready! Check out the detailed analysis and recommendations below.",
};

export function RobotChatBubble({ state, fileName, conditionsFound }: RobotChatBubbleProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [displayedText, setDisplayedText] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const message = MESSAGES[state];

    // Animate visibility
    useEffect(() => {
        setIsVisible(false);
        const timer = setTimeout(() => {
            setIsVisible(true);
            setIsTyping(true);
            setDisplayedText("");
        }, 100);
        return () => clearTimeout(timer);
    }, [state]);

    // Typewriter effect
    useEffect(() => {
        if (!isVisible || !isTyping) return;

        let index = 0;
        const interval = setInterval(() => {
            if (index < message.length) {
                setDisplayedText(message.slice(0, index + 1));
                index++;
            } else {
                setIsTyping(false);
                clearInterval(interval);
            }
        }, 20); // Speed of typing

        return () => clearInterval(interval);
    }, [isVisible, message, isTyping]);

    // Custom message based on conditions found
    const enhancedMessage = state === "prediction_complete" && conditionsFound !== undefined
        ? `✅ Analysis complete! I found **${conditionsFound} condition${conditionsFound !== 1 ? 's' : ''}**. Click **Generate Diagnosis Report** for detailed recommendations!`
        : displayedText;

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
                    {/* Robot icon */}
                    <div className="flex items-start gap-3">
                        <div className="shrink-0 p-2 rounded-full bg-primary/20 border border-primary/30 animate-pulse">
                            <Bot className="size-5 text-primary" />
                        </div>

                        {/* Message */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-primary mb-1">AI Assistant</p>
                            <p className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap">
                                {state === "prediction_complete" && conditionsFound !== undefined
                                    ? enhancedMessage
                                    : displayedText}
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
