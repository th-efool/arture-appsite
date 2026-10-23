"use client";

import { useEffect, useRef, useState } from "react";
import {
    TrendingDown,
    CheckCircle2,
    Leaf,
    ShieldCheck,
    GraduationCap,
} from "lucide-react";
import { impactStats } from "./ikigaiData";

function ImpactIcon({
    type,
    isHovered,
    activeMicro,
}: {
    type: string;
    isHovered: boolean;
    activeMicro: string | null;
}) {
    const colorClass = isHovered ? "text-[#E88819]" : "text-primary";
    const isActive = activeMicro === type;

    const baseCls = `w-8 h-8 lg:w-9 lg:h-9 ${colorClass} shrink-0 transition-all duration-300`;

    switch (type) {
        case "trending-down":
            return (
                <TrendingDown
                    className={`${baseCls} ${isActive ? "rotate-[2deg] -translate-y-0.5" : ""}`}
                    strokeWidth={1.8}
                />
            );
        case "check-circle":
            return (
                <CheckCircle2
                    className={`${baseCls} ${isActive ? "scale-110 opacity-90" : ""}`}
                    strokeWidth={1.8}
                />
            );
        case "leaf":
            return (
                <Leaf
                    className={`${baseCls} ${isActive ? "drop-shadow-[0_0_8px_rgba(245,158,56,0.6)]" : ""}`}
                    strokeWidth={1.8}
                />
            );
        case "shield":
            return (
                <ShieldCheck
                    className={`${baseCls} ${isActive ? "scale-105 opacity-90" : ""}`}
                    strokeWidth={1.8}
                />
            );
        case "award":
            return (
                <GraduationCap
                    className={`${baseCls} ${isActive ? "-translate-y-1" : ""}`}
                    strokeWidth={1.8}
                />
            );
        default:
            return null;
    }
}

export function IkigaiImpact() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Micro-interaction sequential idle loop (Point 11)
    const [activeMicro, setActiveMicro] = useState<string | null>(null);

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

    // Point 11: Trigger one micro-animation every 12s sequentially
    useEffect(() => {
        const icons = ["trending-down", "check-circle", "leaf", "shield", "award"];
        let iconIdx = 0;

        const interval = setInterval(() => {
            const currentIcon = icons[iconIdx % icons.length];
            setActiveMicro(currentIcon);

            // Active for 1s, then reset
            setTimeout(() => {
                setActiveMicro(null);
            }, 1000);

            iconIdx++;
        }, 12000);

        return () => clearInterval(interval);
    }, []);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setMousePos({ x: -1000, y: -1000 })}
            className="relative rounded-2xl border border-[#E6E0D4] bg-[#EFE9DD]/50 p-4 lg:p-5 overflow-hidden"
        >
            {/* Mouse Spotlight (Point 8) */}
            <div
                className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-0"
                style={{
                    background: `radial-gradient(350px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245, 158, 56, 0.05), transparent 80%)`,
                }}
            />

            <h3 className="relative z-10 text-center text-base lg:text-lg font-extrabold text-[#1F2933] mb-3">
                The impact is real.
            </h3>

            {/* 5 Impact Cards with 40ms Stagger Reveal (Point 10) */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {impactStats.map((stat, idx) => (
                    <div
                        key={stat.id}
                        onMouseEnter={() => setHoveredId(stat.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{
                            transitionDelay: `${idx * 40}ms`,
                            opacity: isInView ? 1 : 0,
                            transform: isInView ? "translateY(0)" : "translateY(12px)",
                            transition: "all 400ms cubic-bezier(.22,1,.36,1)",
                        }}
                        className={`
                            group flex items-center gap-3 rounded-xl p-3 transition-all duration-200
                            ${hoveredId === stat.id
                                ? "bg-[#FFFDF8] border-2 border-primary/40 shadow-md"
                                : "bg-white border border-[#E6E0D4] shadow-2xs"
                            }
                        `}
                    >
                        <ImpactIcon
                            type={stat.icon}
                            isHovered={hoveredId === stat.id}
                            activeMicro={activeMicro}
                        />
                        <div>
                            <span className="block text-base font-extrabold text-[#1F2933] leading-tight">
                                {stat.value}
                            </span>
                            <span className="block text-xs text-[#5B6470] leading-snug mt-0.5">
                                {stat.label}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
