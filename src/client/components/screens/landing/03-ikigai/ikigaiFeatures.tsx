import Image from "next/image";
import { featureCards } from "./ikigaiData";

export function IkigaiFeatures() {
    return (
        <div className="mb-10">
            {/* Headline */}
            <div className="text-center max-w-3xl mx-auto mb-7">
                <h3 className="text-3xl lg:text-4xl font-extrabold text-[#1F2933]">
                    <span className="text-primary">Arture</span> is the missing interface.
                </h3>
                <p className="mt-3 text-base lg:text-lg text-[#5B6470] leading-relaxed">
                    An AI-powered spatial operating system that brings industrial expertise into your real world—so anyone can operate, maintain, inspect, train, and collaborate with confidence.
                </p>
            </div>

            {/* 5 Feature Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                {featureCards.map((card) => (
                    <div
                        key={card.id}
                        className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-[#E6E0D4] bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/50"
                    >
                        <div>
                            <h4 className="text-base font-bold text-[#1F2933] mb-3">
                                {card.title}
                            </h4>

                            {/* Image Visual */}
                            <div className="relative w-full aspect-square overflow-hidden rounded-xl bg-black/5 mb-3 border border-[#E6E0D4]/60">
                                <Image
                                    src={card.imageSrc}
                                    alt={card.title}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>
                        </div>

                        <p className="text-xs text-[#5B6470] leading-snug">
                            {card.description}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
