"use client";

import { useEffect, useRef, useState } from "react";
import { ArchitectureHeader } from "./architectureHeader";
import { ArchitectureDiagram } from "./architectureDiagram";
import { LeftBlueprintPanels, RightBlueprintPanels } from "./architectureSidePanels";
import { ArchitectureEcosystem } from "./architectureEcosystem";

export function Architecture() {
    const sectionRef = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (sectionRef.current) observer.observe(sectionRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <section
            ref={sectionRef}
            id="architecture"
            style={{
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 800ms cubic-bezier(.22,1,.36,1), transform 800ms cubic-bezier(.22,1,.36,1)",
            }}
            className="relative w-full bg-[#F7F4ED] text-[#1F2933] py-12 lg:py-20 px-3 sm:px-6 lg:px-10 overflow-hidden border-t border-[#E6E0D4]"
        >
            {/* Master Blueprint Outer Poster Framing Canvas Box */}
            <div className="relative z-10 mx-auto max-w-[1720px] border-2 border-[#2B4C7E]/40 bg-[#F7F4ED] p-4 sm:p-6 lg:p-8 rounded-xl shadow-2xl overflow-hidden">

                {/* Master Blueprint Outer Drafting Bracket Corners */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#2B4C7E]/70 pointer-events-none" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#2B4C7E]/70 pointer-events-none" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#2B4C7E]/70 pointer-events-none" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#2B4C7E]/70 pointer-events-none" />

                {/* Master Drafting Corner Crosshairs */}
                <span className="absolute top-1.5 left-3 text-[10px] font-mono font-bold text-[#2B4C7E]/60 select-none hidden sm:inline">
                    + SYSTEM ARCHITECTURE SCHEMATIC
                </span>
                <span className="absolute top-1.5 right-3 text-[10px] font-mono font-bold text-[#2B4C7E]/60 select-none hidden sm:inline">
                    REV 4.2.0 +
                </span>

                {/* Background Full Blueprint Grid Lines Pattern */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.07] z-0"
                    style={{
                        backgroundImage: `
                            linear-gradient(to right, #2B4C7E 1px, transparent 1px),
                            linear-gradient(to bottom, #2B4C7E 1px, transparent 1px)
                        `,
                        backgroundSize: "32px 32px",
                    }}
                />

                {/* Header */}
                <ArchitectureHeader />

                {/* Master SVG Circuit Wiring Overlay across 3-Column Layout */}
                <div className="relative my-4 z-10">
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 hidden lg:block overflow-visible" viewBox="0 0 1600 620">
                        {/* Left Side Connector Bus (Bridging Left Panels into Center Diagram) */}
                        <g stroke="#2B4C7E" strokeWidth="1.8" strokeOpacity="0.6" fill="none">
                            {/* Panel 1 (Knowledge Inputs) -> Spatial Computing */}
                            <path d="M 280 110 H 420 V 90 H 520" strokeDasharray="4 4" />
                            <circle cx="280" cy="110" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />
                            <circle cx="520" cy="90" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />

                            {/* Panel 2 (Document Inputs) -> Industrial Knowledge */}
                            <path d="M 280 310 H 500" strokeDasharray="4 4" />
                            <circle cx="280" cy="310" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />
                            <circle cx="500" cy="310" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />

                            {/* Panel 3 (Interface Layer) -> Human Interaction */}
                            <path d="M 280 510 H 420 V 530 H 520" strokeDasharray="4 4" />
                            <circle cx="280" cy="510" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />
                            <circle cx="520" cy="530" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />
                        </g>

                        {/* Right Side Connector Bus (Bridging Center Diagram into Right Panels) */}
                        <g stroke="#2B4C7E" strokeWidth="1.8" strokeOpacity="0.6" fill="none">
                            {/* Panel 1 (AI Capabilities) <- Machine Intelligence */}
                            <path d="M 1320 110 H 1180 V 90 H 1080" strokeDasharray="4 4" />
                            <circle cx="1320" cy="110" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />
                            <circle cx="1080" cy="90" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />

                            {/* Panel 2 (Enterprise Systems) <- Enterprise Integration */}
                            <path d="M 1320 310 H 1100" strokeDasharray="4 4" />
                            <circle cx="1320" cy="310" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />
                            <circle cx="1100" cy="310" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />

                            {/* Panel 3 (Output & Actions) <- Operational Intelligence */}
                            <path d="M 1320 510 H 1180 V 530 H 1080" strokeDasharray="4 4" />
                            <circle cx="1320" cy="510" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />
                            <circle cx="1080" cy="530" r="3.5" fill="#F59E38" stroke="#2B4C7E" strokeWidth="1.5" />
                        </g>
                    </svg>

                    {/* 3-Column Unified Schematic Layout */}
                    <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 lg:gap-8 items-center">
                        {/* Far Left Column: Input Side Panels */}
                        <div className="w-full relative z-10">
                            <LeftBlueprintPanels />
                        </div>

                        {/* Center Column: Radial Engineering Modules & Hub */}
                        <div className="w-full relative z-10">
                            <ArchitectureDiagram />
                        </div>

                        {/* Far Right Column: Output & Enterprise Side Panels */}
                        <div className="w-full relative z-10">
                            <RightBlueprintPanels />
                        </div>
                    </div>
                </div>

                {/* Bottom Quote & 12-Partner Integration Ecosystem Strip */}
                <ArchitectureEcosystem />
            </div>
        </section>
    );
}