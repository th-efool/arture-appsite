"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Wrench, Settings2, Zap, Users } from "lucide-react";
import { lossMetrics } from "./ikigaiData";

function MetricIcon({ type, isHovered }: { type: string; isHovered: boolean }) {
    // Point 7: Icon orange becomes slightly darker on hover (#E88819 vs #F59E38)
    const colorClass = isHovered ? "text-[#E88819]" : "text-primary";
    const cls = `w-9 h-9 lg:w-10 lg:h-10 ${colorClass} shrink-0 transition-colors duration-200`;

    switch (type) {
        case "clock":   return <Clock   className={cls} strokeWidth={1.8} />;
        case "wrench":  return <Wrench  className={cls} strokeWidth={1.8} />;
        case "gear":    return <Settings2 className={cls} strokeWidth={1.8} />;
        case "zap":     return <Zap     className={cls} strokeWidth={1.8} />;
        case "user":    return <Users   className={cls} strokeWidth={1.8} />;
        default:        return null;
    }
}

export function IkigaiMetrics() {
    const containerRef = useRef<HTMLDivElement>(null);
    const pillRef = useRef<HTMLDivElement>(null);

    const [isInView, setIsInView] = useState(false);
    const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    // Pill 3-step sequence state (Point 15)
    const [pillStage, setPillStage] = useState<"hidden" | "border" | "icon" | "full">("hidden");

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                }
            },
            { threshold: 0.3 }
        );

        if (containerRef.current) observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, []);

    // Pill sequence observer (Point 15)
    useEffect(() => {
        const pillObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && pillStage === "hidden") {
                    setPillStage("border");
                    setTimeout(() => setPillStage("icon"), 300);
                    setTimeout(() => setPillStage("full"), 500);
                }
            },
            { threshold: 0.5 }
        );

        if (pillRef.current) pillObserver.observe(pillRef.current);
        return () => pillObserver.disconnect();
    }, [pillStage]);

    // Mouse position handler for radial mouse lighting (Point 8)
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <div className="mb-6">
            {/* 4 Stats Row Container */}
            <div
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={() => setMousePos({ x: -1000, y: -1000 })}
                className="relative overflow-hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E6E0D4] bg-[#EFE9DD]/60 rounded-2xl py-4 px-3 border border-[#E6E0D4]"
            >
                {/* Mouse Radial Spotlight (Point 8: 4-6% opacity cursor light) */}
                <div
                    className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-0"
                    style={{
                        background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245, 158, 56, 0.07), transparent 80%)`,
                    }}
                />

                {/* Travelling Highlight Sweep (Point 3: 5-8% opacity soft light moving left->right in 1s, runs once) */}
                {isInView && (
                    <div
                        className="pointer-events-none absolute top-0 bottom-0 w-48 bg-gradient-to-r from-transparent via-white/50 to-transparent z-10 opacity-40 animate-[sweep_1s_cubic-bezier(.22,1,.36,1)_forwards]"
                        style={{
                            animation: "sweep 1000ms cubic-bezier(.22,1,.36,1) forwards",
                        }}
                    />
                )}

                {/* Stat Cards */}
                {lossMetrics.map((m, idx) => (
                    <StatCard
                        key={m.id}
                        metric={m}
                        index={idx}
                        isInView={isInView}
                        isHovered={hoveredIndex === idx}
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                    />
                ))}
            </div>

            {/* Warning Callout Pill (Point 15: Restrained 3-Step Sequence) */}
            <div ref={pillRef} className="mt-3.5 flex justify-center">
                <div
                    className="relative overflow-hidden inline-flex items-center gap-2.5 rounded-full bg-amber-50/90 px-4 py-1.5 text-xs sm:text-sm text-[#1F2933] shadow-xs transition-all duration-300"
                    style={{
                        borderWidth: "1px",
                        borderStyle: "solid",
                        borderColor: pillStage !== "hidden" ? "#F59E38" : "transparent",
                        transition: "border-color 300ms ease-out",
                    }}
                >
                    {/* Animated Border Draw line overlay (Point 15) */}
                    <div
                        className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all duration-300"
                        style={{
                            width: pillStage !== "hidden" ? "100%" : "0%",
                        }}
                    />

                    {/* Lightning Icon (appears second) */}
                    <Zap
                        className={`w-4 h-4 text-amber-500 shrink-0 transition-all duration-200 ${
                            pillStage === "icon" || pillStage === "full" ? "opacity-100 scale-100" : "opacity-0 scale-75"
                        }`}
                        strokeWidth={2}
                    />

                    {/* Text (fades in last) */}
                    <span
                        className={`transition-opacity duration-200 ${
                            pillStage === "full" ? "opacity-100" : "opacity-0"
                        }`}
                    >
                        These costs are not from lack of technology. They come from{" "}
                        <strong className="font-semibold text-primary">how we interact with it.</strong>
                    </span>
                </div>
            </div>

            {/* Keyframe style for travelling light sweep */}
            <style jsx global>{`
                @keyframes sweep {
                    0% { transform: translateX(-150%); }
                    100% { transform: translateX(500%); }
                }
            `}</style>
        </div>
    );
}

// Stat Card with Count-Up animation & restrained hover (Point 3 & Point 7)
function StatCard({
    metric,
    isInView,
    isHovered,
    onMouseEnter,
    onMouseLeave,
}: {
    metric: (typeof lossMetrics)[0];
    index: number;
    isInView: boolean;
    isHovered: boolean;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}) {
    const [displayVal, setDisplayVal] = useState("0");

    // Number Count-Up over 800ms (Point 3)
    useEffect(() => {
        if (!isInView) return;

        const duration = 800;
        const startTime = performance.now();

        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);

            if (metric.id === "downtime-cost") {
                setDisplayVal(`₹${Math.floor(70 * eased)}L+`);
            } else if (metric.id === "skill-gap") {
                const val1 = Math.floor(40 * eased);
                const val2 = Math.floor(45 * eased);
                setDisplayVal(`${val1}–${val2}%`);
            } else if (metric.id === "copq-quality") {
                const val1 = Math.floor(15 * eased);
                const val2 = Math.floor(20 * eased);
                setDisplayVal(`${val1}–${val2}%`);
            } else if (metric.id === "sme-delay") {
                const val1 = Math.floor(4 * eased);
                const val2 = Math.floor(6 * eased);
                setDisplayVal(`${val1}–${val2} Hrs`);
            } else {
                setDisplayVal(metric.value);
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setDisplayVal(metric.value);
            }
        };

        requestAnimationFrame(animate);
    }, [isInView, metric]);

    return (
        <div
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            className={`
                relative z-10 flex flex-col items-center text-center px-3 py-2 rounded-xl transition-all duration-200
                ${isHovered
                    ? "bg-[#FFFDF8] border-2 border-primary/40 shadow-md"
                    : "bg-transparent border border-transparent"
                }
            `}
        >
            <MetricIcon type={metric.icon} isHovered={isHovered} />
            <span className="mt-2 text-2xl lg:text-3xl font-extrabold text-[#1F2933] tracking-tight">
                <span className="sr-only">{metric.value}</span>
                <span aria-hidden="true">{isInView ? displayVal : metric.value}</span>
            </span>
            <span className="mt-1 text-xs lg:text-sm font-semibold text-[#1F2933] leading-snug">
                {metric.label}
            </span>
            <span className="mt-0.5 text-xs text-[#5B6470]">
                {metric.sublabel}
            </span>
        </div>
    );
}
