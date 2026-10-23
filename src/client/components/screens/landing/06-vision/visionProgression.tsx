import {
    Sliders,
    MessageSquare,
    Cpu,
    Factory,
    ChevronRight,
    HelpCircle,
} from "lucide-react";
import { visionStages, VisionStage } from "./visionData";

function StageIcon({ type }: { type: VisionStage["iconType"] }) {
    const cls = "w-9 h-9 text-primary shrink-0 transition-transform duration-300 group-hover:scale-110";
    switch (type) {
        case "machine":     return <Sliders       className={cls} strokeWidth={1.8} />;
        case "interactive": return <MessageSquare className={cls} strokeWidth={1.8} />;
        case "adaptive":    return <Cpu           className={cls} strokeWidth={1.8} />;
        case "factory":     return <Factory       className={cls} strokeWidth={1.8} />;
        case "future":      return <HelpCircle    className="w-10 h-10 text-primary shrink-0 animate-pulse" strokeWidth={2} />;
        default:            return null;
    }
}

export function VisionProgression() {
    return (
        <div className="w-full max-w-6xl mx-auto my-10 px-2 sm:px-4">
            {/* Top Accent Progression Line with Dots */}
            <div className="relative w-full h-[2px] bg-primary/30 mb-8 hidden lg:block">
                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary shadow-xs" />
                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
            </div>

            {/* 5 Stages Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
                {visionStages.map((stage, idx) => (
                    <div key={stage.id} className="relative flex flex-col justify-between">
                        {/* Stage Card */}
                        <div className="group flex flex-col items-center text-center p-5 rounded-2xl border border-white/10 bg-[#0e1015] hover:border-primary/50 hover:bg-[#12151f] shadow-xl transition-all duration-300 h-full">
                            {/* Icon Container */}
                            <div className="relative w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4 shadow-inner">
                                {stage.iconType === "future" && (
                                    <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-md pointer-events-none" />
                                )}
                                <StageIcon type={stage.iconType} />
                            </div>

                            {/* Title */}
                            <h3 className="text-base font-extrabold tracking-tight text-white">
                                {stage.title}
                            </h3>

                            {/* Description */}
                            <p className="mt-1.5 text-xs text-white/70 leading-snug">
                                {stage.description}
                            </p>
                        </div>

                        {/* Arrow separator (desktop only) */}
                        {idx < visionStages.length - 1 && (
                            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-[#161a24] border border-primary/40 items-center justify-center text-primary shadow-xs">
                                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
