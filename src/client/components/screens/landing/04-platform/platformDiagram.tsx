"use client";

import { useState } from "react";
import Image from "next/image";
import {
    MessageSquare,
    ShieldCheck,
    Camera,
    TrendingUp,
    Box,
    ArrowUpRight,
} from "lucide-react";
import { platformNodes } from "./platformData";

function NodeIcon({ type }: { type: string }) {
    const cls = "w-6 h-6 text-primary shrink-0";
    switch (type) {
        case "message": return <MessageSquare className={cls} strokeWidth={2} />;
        case "shield":  return <ShieldCheck  className={cls} strokeWidth={2} />;
        case "camera":  return <Camera       className={cls} strokeWidth={2} />;
        case "chart":   return <TrendingUp   className={cls} strokeWidth={2} />;
        case "box":     return <Box          className={cls} strokeWidth={2} />;
        case "arrow":   return <ArrowUpRight className={cls} strokeWidth={2} />;
        default:        return null;
    }
}

export function PlatformDiagram() {
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);

    const getNodeByPos = (pos: string) => platformNodes.find(n => n.position === pos);

    const guideNode = getNodeByPos("top-left");
    const explainNode = getNodeByPos("top");
    const verifyNode = getNodeByPos("top-right");
    const documentNode = getNodeByPos("bottom-right");
    const improveNode = getNodeByPos("bottom");
    const simulateNode = getNodeByPos("bottom-left");

    return (
        <div className="relative w-full max-w-5xl mx-auto my-10 px-2 sm:px-4">

            {/* Desktop / Tablet Oval Radial Layout (hidden on small mobile screens) */}
            <div className="hidden md:block relative w-full h-[540px]">
                {/* SVG Radial Connector Lines */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible" viewBox="0 0 900 540">
                    <defs>
                        <radialGradient id="hubGlow" cx="50%" cy="50%" r="50%">
                            <stop offset="0%" stopColor="#F59E38" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#F59E38" stopOpacity="0" />
                        </radialGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Central ambient orbital oval ring */}
                    <ellipse
                        cx="450"
                        cy="270"
                        rx="360"
                        ry="200"
                        fill="none"
                        stroke="#F59E38"
                        strokeWidth="1.5"
                        strokeDasharray="4 6"
                        className="opacity-30"
                    />

                    {/* Lines from Center Hub (450, 270) to the 6 Node Positions */}
                    {/* EXPLAIN (Top: 450, 60) */}
                    <line
                        x1="450" y1="210" x2="450" y2="85"
                        stroke={hoveredNode === "explain" ? "#F59E38" : "rgba(255,255,255,0.2)"}
                        strokeWidth={hoveredNode === "explain" ? "2.5" : "1.5"}
                        strokeDasharray="4 4"
                        filter={hoveredNode === "explain" ? "url(#glow)" : undefined}
                        className="transition-all duration-300"
                    />
                    <circle cx="450" cy="85" r="3.5" fill="#F59E38" />

                    {/* VERIFY (Top Right: 730, 120) */}
                    <line
                        x1="520" y1="235" x2="720" y2="135"
                        stroke={hoveredNode === "verify" ? "#F59E38" : "rgba(255,255,255,0.2)"}
                        strokeWidth={hoveredNode === "verify" ? "2.5" : "1.5"}
                        strokeDasharray="4 4"
                        filter={hoveredNode === "verify" ? "url(#glow)" : undefined}
                        className="transition-all duration-300"
                    />
                    <circle cx="720" cy="135" r="3.5" fill="#F59E38" />

                    {/* DOCUMENT (Bottom Right: 730, 420) */}
                    <line
                        x1="520" y1="305" x2="720" y2="405"
                        stroke={hoveredNode === "document" ? "#F59E38" : "rgba(255,255,255,0.2)"}
                        strokeWidth={hoveredNode === "document" ? "2.5" : "1.5"}
                        strokeDasharray="4 4"
                        filter={hoveredNode === "document" ? "url(#glow)" : undefined}
                        className="transition-all duration-300"
                    />
                    <circle cx="720" cy="405" r="3.5" fill="#F59E38" />

                    {/* IMPROVE (Bottom: 450, 480) */}
                    <line
                        x1="450" y1="330" x2="450" y2="455"
                        stroke={hoveredNode === "improve" ? "#F59E38" : "rgba(255,255,255,0.2)"}
                        strokeWidth={hoveredNode === "improve" ? "2.5" : "1.5"}
                        strokeDasharray="4 4"
                        filter={hoveredNode === "improve" ? "url(#glow)" : undefined}
                        className="transition-all duration-300"
                    />
                    <circle cx="450" cy="455" r="3.5" fill="#F59E38" />

                    {/* SIMULATE (Bottom Left: 170, 420) */}
                    <line
                        x1="380" y1="305" x2="180" y2="405"
                        stroke={hoveredNode === "simulate" ? "#F59E38" : "rgba(255,255,255,0.2)"}
                        strokeWidth={hoveredNode === "simulate" ? "2.5" : "1.5"}
                        strokeDasharray="4 4"
                        filter={hoveredNode === "simulate" ? "url(#glow)" : undefined}
                        className="transition-all duration-300"
                    />
                    <circle cx="180" cy="405" r="3.5" fill="#F59E38" />

                    {/* GUIDE (Top Left: 170, 120) */}
                    <line
                        x1="380" y1="235" x2="180" y2="135"
                        stroke={hoveredNode === "guide" ? "#F59E38" : "rgba(255,255,255,0.2)"}
                        strokeWidth={hoveredNode === "guide" ? "2.5" : "1.5"}
                        strokeDasharray="4 4"
                        filter={hoveredNode === "guide" ? "url(#glow)" : undefined}
                        className="transition-all duration-300"
                    />
                    <circle cx="180" cy="135" r="3.5" fill="#F59E38" />
                </svg>

                {/* Center Core Hub: ARTURE */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-center">
                    <div className="relative group">
                        {/* Glow halo */}
                        <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />

                        <div className="relative flex flex-col items-center justify-center bg-[#0c0e14] border-2 border-primary/60 px-7 py-4.5 rounded-2xl shadow-2xl shadow-primary/20 backdrop-blur-md">
                            <div className="flex items-center gap-2 mb-1">
                                <Image
                                    src="/icons/logo.svg"
                                    alt="Arture Logo"
                                    width={36}
                                    height={36}
                                    className="h-8 w-8 object-contain rounded-lg"
                                />
                                <span className="text-2xl font-light tracking-[0.25em] text-white">
                                    Arture
                                </span>
                            </div>
                            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary">
                                Industrial Interaction Platform
                            </span>
                        </div>
                    </div>
                </div>

                {/* 1. EXPLAIN (Top Center) */}
                {explainNode && (
                    <div
                        onMouseEnter={() => setHoveredNode("explain")}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="absolute top-0 left-1/2 -translate-x-1/2 z-10 w-72 transition-all duration-300"
                    >
                        <NodeCard node={explainNode} isHovered={hoveredNode === "explain"} align="center" />
                    </div>
                )}

                {/* 2. VERIFY (Top Right) */}
                {verifyNode && (
                    <div
                        onMouseEnter={() => setHoveredNode("verify")}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="absolute top-12 right-4 z-10 w-64 transition-all duration-300"
                    >
                        <NodeCard node={verifyNode} isHovered={hoveredNode === "verify"} align="left" />
                    </div>
                )}

                {/* 3. DOCUMENT (Bottom Right) */}
                {documentNode && (
                    <div
                        onMouseEnter={() => setHoveredNode("document")}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="absolute bottom-12 right-4 z-10 w-64 transition-all duration-300"
                    >
                        <NodeCard node={documentNode} isHovered={hoveredNode === "document"} align="left" />
                    </div>
                )}

                {/* 4. IMPROVE (Bottom Center) */}
                {improveNode && (
                    <div
                        onMouseEnter={() => setHoveredNode("improve")}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="absolute bottom-0 left-1/2 -translate-x-1/2 z-10 w-72 transition-all duration-300"
                    >
                        <NodeCard node={improveNode} isHovered={hoveredNode === "improve"} align="center" />
                    </div>
                )}

                {/* 5. SIMULATE (Bottom Left) */}
                {simulateNode && (
                    <div
                        onMouseEnter={() => setHoveredNode("simulate")}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="absolute bottom-12 left-4 z-10 w-64 transition-all duration-300"
                    >
                        <NodeCard node={simulateNode} isHovered={hoveredNode === "simulate"} align="right" />
                    </div>
                )}

                {/* 6. GUIDE (Top Left) */}
                {guideNode && (
                    <div
                        onMouseEnter={() => setHoveredNode("guide")}
                        onMouseLeave={() => setHoveredNode(null)}
                        className="absolute top-12 left-4 z-10 w-64 transition-all duration-300"
                    >
                        <NodeCard node={guideNode} isHovered={hoveredNode === "guide"} align="right" />
                    </div>
                )}
            </div>

            {/* Mobile Responsive Layout (Stacked Grid) */}
            <div className="block md:hidden space-y-4">
                {/* Center Core Banner for Mobile */}
                <div className="flex flex-col items-center justify-center bg-[#0c0e14] border-2 border-primary px-6 py-4 rounded-xl text-center shadow-lg mb-6">
                    <span className="text-2xl font-black tracking-widest text-primary">ARTURE</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Industrial Interaction Platform</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {platformNodes.map((node) => (
                        <NodeCard key={node.id} node={node} isHovered={false} align="left" />
                    ))}
                </div>
            </div>

        </div>
    );
}

function NodeCard({
    node,
    isHovered,
    align,
}: {
    node: (typeof platformNodes)[0];
    isHovered: boolean;
    align: "left" | "right" | "center";
}) {
    return (
        <div
            className={`
                group relative flex flex-col p-4 rounded-xl border transition-all duration-300
                ${isHovered
                    ? "bg-[#141822] border-primary shadow-lg shadow-primary/20 -translate-y-1"
                    : "bg-[#0e1015]/90 border-white/10 hover:border-primary/50 hover:bg-[#12151f]"
                }
                ${align === "center" ? "items-center text-center" : align === "right" ? "items-end text-right" : "items-start text-left"}
            `}
        >
            {/* Icon Circle */}
            <div className="w-10 h-10 rounded-full border border-primary/40 bg-primary/10 flex items-center justify-center mb-2 shadow-xs group-hover:bg-primary/20 group-hover:scale-110 transition-all">
                <NodeIcon type={node.icon} />
            </div>

            {/* Title */}
            <span className="text-sm font-black tracking-wider text-white group-hover:text-primary transition-colors">
                {node.title}
            </span>

            {/* Description */}
            <p className="mt-1 text-xs text-white/70 leading-snug">
                {node.description}
            </p>
        </div>
    );
}
