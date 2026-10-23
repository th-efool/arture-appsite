import {
    Cpu,
    MessageSquare,
    Factory,
    ArrowRight,
    Sliders,
} from "lucide-react";
import { evolutionSteps } from "./platformData";

function StepIcon({ type }: { type: string }) {
    const cls = "w-7 h-7 text-primary shrink-0 transition-transform duration-300 group-hover:scale-110";
    switch (type) {
        case "machine-passive":     return <Sliders       className={cls} strokeWidth={1.8} />;
        case "machine-interactive": return <MessageSquare className={cls} strokeWidth={1.8} />;
        case "machine-adaptive":    return <Cpu           className={cls} strokeWidth={1.8} />;
        case "factory-intelligent": return <Factory       className={cls} strokeWidth={1.8} />;
        default:                    return null;
    }
}

export function PlatformEvolution() {
    return (
        <div className="w-full max-w-5xl mx-auto my-10 rounded-2xl border border-primary/20 bg-[#0e1015]/90 p-5 lg:p-7 shadow-2xl backdrop-blur-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 relative">
                {evolutionSteps.map((step, idx) => (
                    <div key={step.id} className="relative flex flex-col justify-between">
                        {/* Step Card */}
                        <div className="group flex flex-col items-center text-center p-4 rounded-xl border border-white/5 bg-black/40 hover:border-primary/40 hover:bg-[#12151f] transition-all duration-300 h-full">
                            {/* Icon Wrapper */}
                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 shadow-inner">
                                <StepIcon type={step.icon} />
                            </div>

                            {/* Title */}
                            <h3 className="text-xs lg:text-sm font-black tracking-wider text-white uppercase">
                                {step.title}
                            </h3>

                            {/* Subtitle */}
                            <p className="mt-1.5 text-xs text-white/70 leading-relaxed">
                                {step.subtitle}
                            </p>
                        </div>

                        {/* Arrow separator (desktop/tablet only between items) */}
                        {idx < evolutionSteps.length - 1 && (
                            <div className="hidden lg:flex absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-[#161a24] border border-primary/40 items-center justify-center text-primary shadow-xs">
                                <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.5} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
