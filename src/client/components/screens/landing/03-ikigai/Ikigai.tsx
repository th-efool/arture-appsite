"use client";

import { useEffect, useRef, useState } from "react";
import { IkigaiHeader } from "./ikigaiHeader";
import { IkigaiMetrics } from "./ikigaiMetrics";
import { IkigaiComparison } from "./ikigaiComparison";
import { IkigaiImpact } from "./ikigaiImpact";

export function Ikigai() {
    const sectionRef = useRef<HTMLElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [scrollRatio, setScrollRatio] = useState(0);
    const [parallaxOffset, setParallaxOffset] = useState(0);

    // Section reveal on scroll into view (Point 1) & section exit opacity (Point 12) & parallax (Point 4)
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

        const handleScroll = () => {
            if (!sectionRef.current) return;
            const rect = sectionRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // Parallax offset calculation
            const relativeY = rect.top - windowHeight / 2;
            setParallaxOffset(relativeY);

            // Exit opacity reduction (Point 12: reduce opacity to 96% over top 300px scroll)
            if (rect.top < 0 && rect.top > -300) {
                const exitRatio = Math.max(0.96, 1 - (Math.abs(rect.top) / 300) * 0.04);
                setScrollRatio(exitRatio);
            } else {
                setScrollRatio(1);
            }
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        handleScroll();

        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <section
            ref={sectionRef}
            id="ikigai"
            style={{
                opacity: isVisible ? scrollRatio : 0,
                transform: isVisible ? "translateY(0)" : "translateY(24px)",
                transition: "opacity 800ms cubic-bezier(.22,1,.36,1), transform 800ms cubic-bezier(.22,1,.36,1)",
            }}
            className="relative w-full bg-[#F7F4ED] text-[#1F2933] py-10 lg:py-14 px-4 sm:px-8 lg:px-12 overflow-hidden border-t border-[#E6E0D4]"
        >
            {/* Background Texture: Paper Grain SVG (Point 14) */}
            <div
                className="absolute inset-0 pointer-events-none opacity-[0.03] z-0 mix-blend-multiply"
                style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                }}
            />

            {/* Soft Radial Brightness Behind Headline (Point 14) */}
            <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-100/40 rounded-full blur-[100px] pointer-events-none" />

            <div className="relative z-10 mx-auto max-w-[1440px]">
                {/* 1. Headline */}
                <IkigaiHeader />

                {/* Center-out Divider (Point 9) */}
                <AnimatedDivider isVisible={isVisible} />

                {/* 2. Statistics Container (0.97x Parallax - Point 4) */}
                <div
                    style={{
                        transform: `translateY(${parallaxOffset * -0.03}px)`,
                        transition: "transform 100ms ease-out",
                    }}
                >
                    <IkigaiMetrics />
                </div>

                {/* Center-out Divider (Point 9) */}
                <AnimatedDivider isVisible={isVisible} />

                {/* 3. Workflow Comparison Container (1.00x Parallax - Point 4) */}
                <div style={{ transform: "translateY(0px)" }}>
                    <IkigaiComparison />
                </div>

                {/* 4. Impact Container (1.02x Parallax - Point 4) */}
                <div
                    style={{
                        transform: `translateY(${parallaxOffset * 0.02}px)`,
                        transition: "transform 100ms ease-out",
                    }}
                >
                    <IkigaiImpact />
                </div>
            </div>
        </section>
    );
}

// Center-Out Expanding Divider (Point 9)
function AnimatedDivider({ isVisible }: { isVisible: boolean }) {
    const dividerRef = useRef<HTMLDivElement>(null);
    const [lineVisible, setLineVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setLineVisible(true);
                }
            },
            { threshold: 0.5 }
        );

        if (dividerRef.current) observer.observe(dividerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={dividerRef} className="my-6 flex justify-center w-full overflow-hidden">
            <div
                className="h-[1px] bg-[#E6E0D4] transition-all duration-400 ease-out"
                style={{
                    width: lineVisible && isVisible ? "100%" : "0%",
                    transitionDuration: "400ms",
                }}
            />
        </div>
    );
}