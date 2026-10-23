"use client";

import { useEffect, useRef, useState } from "react";

export function IkigaiHeader() {
    const headerRef = useRef<HTMLDivElement>(null);
    const [isEmphasized, setIsEmphasized] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    // Trigger emphasis slightly after main text reaches 40% viewport
                    setTimeout(() => {
                        setIsEmphasized(true);
                    }, 150);
                }
            },
            { threshold: 0.4 }
        );

        if (headerRef.current) observer.observe(headerRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div ref={headerRef} className="mx-auto max-w-4xl text-center mb-6">
            <span className="text-xs md:text-sm font-bold uppercase tracking-[0.2em] text-[#5B6470]">
                Why Arture Exists
            </span>

            {/* Headline */}
            <h2 className="mt-2.5 text-3xl sm:text-4xl lg:text-[3.2rem] font-extrabold tracking-tight text-[#1F2933] leading-[1.12]">
                Industries lose billions <br className="hidden sm:inline" />
                to the same problems.{" "}
                <span
                    className="inline-block transition-all duration-300 ease-out font-black"
                    style={{
                        transform: isEmphasized ? "translateY(0)" : "translateY(8px)",
                        color: isEmphasized ? "#F59E38" : "#D8A65A",
                        transitionProperty: "transform, color",
                        transitionDuration: "300ms",
                    }}
                >
                    At the same moment.
                </span>
            </h2>

            {/* Description */}
            <p className="mt-3.5 text-sm md:text-base text-[#5B6470] max-w-3xl mx-auto leading-relaxed font-normal">
                Every minute of downtime, every defect, every wrong decision, and every delay happens while people are trying to understand complex industrial systems with outdated tools and disconnected information.
            </p>
        </div>
    );
}
