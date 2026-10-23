"use client";

import { useEffect, useRef, useState } from "react";
import {
    FileText,
    MessageSquare,
    Search,
    ClipboardList,
    Glasses,
    Brain,
    Target,
    CheckCircle2,
    XCircle,
    CheckCircle,
} from "lucide-react";
import { todaySteps, todayBullets, artureSteps, artureBullets } from "./ikigaiData";

function StepIcon({ icon, isPrimary = false, isHovered = false }: { icon: string; isPrimary?: boolean; isHovered?: boolean }) {
    // Point 7: Icon orange becomes slightly darker on hover
    const primaryColor = isHovered ? "text-[#E88819]" : "text-primary";
    const cls = isPrimary
        ? `w-9 h-9 lg:w-10 lg:h-10 ${primaryColor} shrink-0 transition-colors duration-200`
        : `w-9 h-9 lg:w-10 lg:h-10 text-[#7C8591] shrink-0 transition-colors duration-200`;

    switch (icon) {
        case "file-text":      return <FileText      className={cls} strokeWidth={1.8} />;
        case "message-square": return <MessageSquare className={cls} strokeWidth={1.8} />;
        case "search":         return <Search        className={cls} strokeWidth={1.8} />;
        case "clipboard":      return <ClipboardList className={cls} strokeWidth={1.8} />;
        case "glasses":        return <Glasses       className={cls} strokeWidth={1.8} />;
        case "brain":          return <Brain         className={cls} strokeWidth={1.8} />;
        case "target":         return <Target        className={cls} strokeWidth={1.8} />;
        case "check-circle":   return <CheckCircle2  className={cls} strokeWidth={1.8} />;
        default:               return null;
    }
}

export function IkigaiComparison() {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isInView, setIsInView] = useState(false);
    const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

    // Progressive step draw counts (Point 5)
    const [todayVisibleCount, setTodayVisibleCount] = useState(0);
    const [artureVisibleCount, setArtureVisibleCount] = useState(0);

    const [hoveredColumn, setHoveredColumn] = useState<"today" | "arture" | null>(null);

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

    // Progressive Draw Sequence (Point 5 & Point 6)
    useEffect(() => {
        if (!isInView) return;

        // Draw Left workflow steps
        let currentToday = 0;
        const todayTimer = setInterval(() => {
            currentToday++;
            setTodayVisibleCount(currentToday);
            if (currentToday >= todaySteps.length) {
                clearInterval(todayTimer);

                // Start Right workflow steps after left finishes
                let currentArture = 0;
                const artureTimer = setInterval(() => {
                    currentArture++;
                    setArtureVisibleCount(currentArture);
                    if (currentArture >= artureSteps.length) {
                        clearInterval(artureTimer);
                    }
                }, 300);
            }
        }, 300);

        return () => {
            clearInterval(todayTimer);
        };
    }, [isInView]);

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
            className="relative mb-6 rounded-2xl border border-[#E6E0D4] bg-[#EFE9DD]/30 p-4 lg:p-6 overflow-hidden"
        >
            {/* Mouse Spotlight (Point 8) */}
            <div
                className="pointer-events-none absolute inset-0 transition-opacity duration-300 z-0"
                style={{
                    background: `radial-gradient(400px circle at ${mousePos.x}px ${mousePos.y}px, rgba(245, 158, 56, 0.05), transparent 80%)`,
                }}
            />

            {/* Header */}
            <div className="relative z-10 text-center mb-4">
                <h3 className="text-lg lg:text-xl font-extrabold text-[#1F2933]">
                    Why do these losses continue?{" "}
                    <span className="block sm:inline text-primary">Because workflows haven&apos;t evolved.</span>
                </h3>
            </div>

            {/* 2-Column Comparison Grid */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Column: Today */}
                <div
                    onMouseEnter={() => setHoveredColumn("today")}
                    onMouseLeave={() => setHoveredColumn(null)}
                    className={`
                        rounded-xl border p-4 flex flex-col justify-between transition-all duration-200
                        ${hoveredColumn === "today"
                            ? "border-primary/40 bg-[#FFFDF8] shadow-md border-2"
                            : "border-[#E6E0D4] bg-[#F7F4ED]"
                        }
                    `}
                >
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#5B6470] mb-3">
                            Today: Fragmented &amp; Reactive
                        </h4>

                        {/* Flow Steps with SVG Drawn Connectors */}
                        <div className="flex items-start justify-between gap-1 mb-4 relative">
                            {todaySteps.map((step, idx) => (
                                <div
                                    key={step.label}
                                    className={`relative flex flex-col items-center text-center flex-1 transition-all duration-300 ${
                                        idx < todayVisibleCount ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                                    }`}
                                >
                                    <StepIcon icon={step.icon} isHovered={hoveredColumn === "today"} />
                                    <span className="mt-1 text-xs font-bold text-[#1F2933]">{step.label}</span>
                                    <span className="mt-0.5 text-[10px] text-[#5B6470] leading-tight px-0.5">{step.description}</span>

                                    {/* SVG Path Stroke Animated Arrow (Point 6: 400ms Apple/Linear style stroke draw) */}
                                    {idx < todaySteps.length - 1 && (
                                        <div className="absolute -right-2 top-4 w-4 h-4 pointer-events-none">
                                            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-[#C5C0BB]">
                                                <path
                                                    d="M4 12H20M20 12L14 6M20 12L14 18"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    style={{
                                                        strokeDasharray: 40,
                                                        strokeDashoffset: idx < todayVisibleCount - 1 ? 0 : 40,
                                                        transition: "stroke-dashoffset 400ms ease-out",
                                                    }}
                                                />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bullets */}
                    <ul className="space-y-1.5 pt-3 border-t border-[#E6E0D4]">
                        {todayBullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-2 text-xs lg:text-sm text-[#5B6470]">
                                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" strokeWidth={2} />
                                <span>{bullet}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Right Column: With Arture */}
                <div
                    onMouseEnter={() => setHoveredColumn("arture")}
                    onMouseLeave={() => setHoveredColumn(null)}
                    className={`
                        relative overflow-hidden rounded-xl border p-4 flex flex-col justify-between transition-all duration-200
                        ${hoveredColumn === "arture"
                            ? "border-primary bg-[#FFFDF8] shadow-md border-2"
                            : "border-amber-300/70 bg-amber-50/50 shadow-xs"
                        }
                    `}
                >
                    {/* Soft Orange Ambient Glow Behind Right Card (Point 14) */}
                    <div className="absolute -inset-4 bg-primary/10 blur-2xl pointer-events-none rounded-xl" />

                    <div className="relative z-10">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-primary mb-3">
                            With Arture: Contextual &amp; Intelligent
                        </h4>

                        {/* Flow Steps with SVG Drawn Connectors */}
                        <div className="flex items-start justify-between gap-1 mb-4 relative">
                            {artureSteps.map((step, idx) => (
                                <div
                                    key={step.label}
                                    className={`relative flex flex-col items-center text-center flex-1 transition-all duration-300 ${
                                        idx < artureVisibleCount ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                                    }`}
                                >
                                    <StepIcon icon={step.icon} isPrimary isHovered={hoveredColumn === "arture"} />
                                    <span className="mt-1 text-xs font-bold text-[#1F2933]">{step.label}</span>
                                    <span className="mt-0.5 text-[10px] text-[#5B6470] leading-tight px-0.5">{step.description}</span>

                                    {/* SVG Path Stroke Animated Primary Arrow (Point 6: 400ms Apple/Linear style stroke draw) */}
                                    {idx < artureSteps.length - 1 && (
                                        <div className="absolute -right-2 top-4 w-4 h-4 pointer-events-none">
                                            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-primary">
                                                <path
                                                    d="M4 12H20M20 12L14 6M20 12L14 18"
                                                    stroke="currentColor"
                                                    strokeWidth="2.5"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    style={{
                                                        strokeDasharray: 40,
                                                        strokeDashoffset: idx < artureVisibleCount - 1 ? 0 : 40,
                                                        transition: "stroke-dashoffset 400ms ease-out",
                                                    }}
                                                />
                                            </svg>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bullets */}
                    <ul className="relative z-10 space-y-1.5 pt-3 border-t border-amber-200/80">
                        {artureBullets.map((bullet) => (
                            <li key={bullet} className="flex items-start gap-2 text-xs lg:text-sm text-[#1F2933] font-medium">
                                <CheckCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={2} />
                                <span>{bullet}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
