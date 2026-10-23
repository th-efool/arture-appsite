"use client";

import { useState } from "react";
import Image from "next/image";
import {
    Box,
    Brain,
    BookOpen,
    Server,
    Glasses,
    BarChart3,
} from "lucide-react";
import { architectureModules, ArchitectureModule } from "./architectureData";

function ModuleIcon({ type }: { type: string }) {
    const cls = "w-6 h-6 text-primary shrink-0";
    switch (type) {
        case "cube":    return <Box       className={cls} strokeWidth={2} />;
        case "brain":   return <Brain     className={cls} strokeWidth={2} />;
        case "manual":  return <BookOpen  className={cls} strokeWidth={2} />;
        case "servers": return <Server    className={cls} strokeWidth={2} />;
        case "headset": return <Glasses   className={cls} strokeWidth={2} />;
        case "chart":   return <BarChart3 className={cls} strokeWidth={2} />;
        default:        return null;
    }
}

export function ArchitectureDiagram() {
    const [activeModule, setActiveModule] = useState<string | null>(null);

    return (
        <div className="relative w-full min-h-[500px] md:min-h-[620px] flex items-center justify-center">

            {/* Desktop SVG Master Circuit & Blueprint Construction Canvas (hidden on mobile < 768px) */}
            <div className="hidden md:block relative w-full h-[620px]">
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible" viewBox="0 0 800 620">
                    <defs>
                        <pattern id="blueprintGridInner" width="24" height="24" patternUnits="userSpaceOnUse">
                            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#2B4C7E" strokeWidth="0.5" strokeOpacity="0.08" />
                        </pattern>
                    </defs>

                    <rect width="100%" height="100%" fill="url(#blueprintGridInner)" />

                    {/* Central Concentric Blueprint Orbit Rings */}
                    <circle cx="400" cy="310" r="145" fill="none" stroke="#2B4C7E" strokeWidth="1.5" strokeDasharray="4 6" strokeOpacity="0.35" />
                    <circle cx="400" cy="310" r="220" fill="none" stroke="#2B4C7E" strokeWidth="1.5" strokeDasharray="2 4" strokeOpacity="0.25" />

                    {/* Internal Radial Connector Line Spokes linking Central Hub (400, 310) to 6 Radial Modules */}
                    <line x1="310" y1="240" x2="230" y2="160" stroke="#2B4C7E" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.5" />
                    <line x1="490" y1="240" x2="570" y2="160" stroke="#2B4C7E" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.5" />
                    <line x1="280" y1="310" x2="190" y2="310" stroke="#2B4C7E" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.5" />
                    <line x1="520" y1="310" x2="610" y2="310" stroke="#2B4C7E" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.5" />
                    <line x1="310" y1="360" x2="230" y2="460" stroke="#2B4C7E" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.5" />
                    <line x1="490" y1="360" x2="570" y2="460" stroke="#2B4C7E" strokeWidth="2" strokeDasharray="4 4" strokeOpacity="0.5" />

                    {/* Dimension Annotations (420.00, ⌀20.00, 180.00) */}
                    <g transform="translate(420, 60)">
                        <line x1="0" y1="0" x2="60" y2="-15" stroke="#2B4C7E" strokeWidth="1.5" strokeOpacity="0.6" />
                        <line x1="60" y1="-15" x2="100" y2="-15" stroke="#2B4C7E" strokeWidth="1.5" strokeOpacity="0.6" />
                        <text x="62" y="-19" fill="#2B4C7E" fontSize="11" fontFamily="monospace" fontWeight="bold" opacity="0.8">420.00</text>
                    </g>
                    <g transform="translate(130, 240)">
                        <line x1="0" y1="0" x2="0" y2="140" stroke="#2B4C7E" strokeWidth="1.5" strokeDasharray="3 3" strokeOpacity="0.6" />
                        <text x="-24" y="75" fill="#2B4C7E" fontSize="11" fontFamily="monospace" fontWeight="bold" opacity="0.8" transform="rotate(-90 -24 75)">⌀20.00</text>
                    </g>
                    <g transform="translate(560, 540)">
                        <line x1="0" y1="0" x2="80" y2="0" stroke="#2B4C7E" strokeWidth="1.5" strokeOpacity="0.6" />
                        <text x="25" y="-6" fill="#2B4C7E" fontSize="11" fontFamily="monospace" fontWeight="bold" opacity="0.8">180.00</text>
                    </g>
                </svg>

                {/* Central Machined Industrial Platform Hub */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
                    <div className="relative group">
                        <div className="w-56 h-56 sm:w-60 sm:h-60 rounded-full border-4 border-[#2B4C7E]/50 bg-[#F7F4ED] p-2 flex items-center justify-center shadow-2xl relative">
                            <div className="absolute inset-2 rounded-full border-2 border-dashed border-[#2B4C7E]/40" />

                            <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full border-2 border-primary/60 bg-[#F7F4ED] flex flex-col items-center justify-center p-3 shadow-inner relative z-10">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <Image
                                        src="/icons/logo.svg"
                                        alt="Arture Logo"
                                        width={32}
                                        height={32}
                                        className="h-7 w-7 object-contain rounded-md"
                                    />
                                    <span className="text-xl sm:text-2xl font-light tracking-[0.2em] text-[#1F2933]">
                                        Arture
                                    </span>
                                </div>
                                <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-widest text-primary uppercase">
                                    Industrial Interaction Platform
                                </span>
                                <span className="mt-1 text-[8px] font-mono text-[#5B6470] tracking-tighter">
                                    ORCHESTRATION ENGINE
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 6 Radial Hexagonal Module Cards */}
                <div className="absolute top-2 left-0 z-10 w-72 lg:w-80">
                    <HexModuleCard module={architectureModules[0]} isActive={activeModule === architectureModules[0].id} onHover={() => setActiveModule(architectureModules[0].id)} onLeave={() => setActiveModule(null)} />
                </div>
                <div className="absolute top-2 right-0 z-10 w-72 lg:w-80">
                    <HexModuleCard module={architectureModules[1]} isActive={activeModule === architectureModules[1].id} onHover={() => setActiveModule(architectureModules[1].id)} onLeave={() => setActiveModule(null)} />
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -left-2 z-10 w-72 lg:w-80">
                    <HexModuleCard module={architectureModules[2]} isActive={activeModule === architectureModules[2].id} onHover={() => setActiveModule(architectureModules[2].id)} onLeave={() => setActiveModule(null)} />
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 -right-2 z-10 w-72 lg:w-80">
                    <HexModuleCard module={architectureModules[3]} isActive={activeModule === architectureModules[3].id} onHover={() => setActiveModule(architectureModules[3].id)} onLeave={() => setActiveModule(null)} />
                </div>
                <div className="absolute bottom-2 left-0 z-10 w-72 lg:w-80">
                    <HexModuleCard module={architectureModules[4]} isActive={activeModule === architectureModules[4].id} onHover={() => setActiveModule(architectureModules[4].id)} onLeave={() => setActiveModule(null)} />
                </div>
                <div className="absolute bottom-2 right-0 z-10 w-72 lg:w-80">
                    <HexModuleCard module={architectureModules[5]} isActive={activeModule === architectureModules[5].id} onHover={() => setActiveModule(architectureModules[5].id)} onLeave={() => setActiveModule(null)} />
                </div>
            </div>

            {/* Mobile / Tablet Responsive Stack (Visible on screens < 768px) */}
            <div className="block md:hidden w-full space-y-4 my-4">
                {/* Mobile Center Hub Banner */}
                <div className="w-full bg-[#F7F4ED] border-2 border-primary/60 p-4 rounded-xl text-center shadow-md mb-4">
                    <span className="text-2xl font-black tracking-widest text-[#1F2933]">ARTURE</span>
                    <span className="block text-xs font-mono font-bold tracking-widest text-primary uppercase mt-0.5">Industrial Interaction Platform</span>
                    <span className="text-[10px] font-mono text-[#5B6470] tracking-wider uppercase block mt-1">ORCHESTRATION ENGINE</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {architectureModules.map((m) => (
                        <HexModuleCard key={m.id} module={m} isActive={false} onHover={() => {}} onLeave={() => {}} />
                    ))}
                </div>
            </div>

        </div>
    );
}

function HexModuleCard({
    module,
    isActive,
    onHover,
    onLeave,
}: {
    module: ArchitectureModule;
    isActive: boolean;
    onHover: () => void;
    onLeave: () => void;
}) {
    return (
        <div
            onMouseEnter={onHover}
            onMouseLeave={onLeave}
            className={`
                group relative p-3.5 sm:p-4 rounded-xl border-2 transition-all duration-300 backdrop-blur-xs w-full
                ${isActive
                    ? "bg-[#FFFDF8] border-primary shadow-xl border-2"
                    : "bg-[#F7F4ED]/95 border-[#2B4C7E]/40 hover:border-primary/80 hover:bg-[#FFFDF8] shadow-md"
                }
            `}
        >
            {/* Drafting corner crosshairs */}
            <span className="absolute -top-1.5 -left-1.5 text-[10px] font-mono text-[#2B4C7E] font-bold select-none">+</span>
            <span className="absolute -top-1.5 -right-1.5 text-[10px] font-mono text-[#2B4C7E] font-bold select-none">+</span>
            <span className="absolute -bottom-1.5 -left-1.5 text-[10px] font-mono text-[#2B4C7E] font-bold select-none">+</span>
            <span className="absolute -bottom-1.5 -right-1.5 text-[10px] font-mono text-[#2B4C7E] font-bold select-none">+</span>

            <div className="flex items-start gap-3">
                {/* Number & Orange Line Icon Badge */}
                <div className="flex flex-col items-center shrink-0">
                    <span className="text-xs font-mono font-black text-primary tracking-widest">
                        {module.number}
                    </span>
                    <div className="mt-1 p-2 rounded-lg border-2 border-primary/40 bg-primary/10 group-hover:border-primary group-hover:bg-primary/20 transition-all shadow-xs">
                        <ModuleIcon type={module.icon} />
                    </div>
                </div>

                {/* Title & Description with Enlarged Text */}
                <div>
                    <h3 className="text-xs sm:text-sm font-mono font-black tracking-wide text-[#1F2933] uppercase">
                        {module.title}
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-[#5B6470] leading-relaxed font-normal">
                        {module.description}
                    </p>
                </div>
            </div>
        </div>
    );
}
