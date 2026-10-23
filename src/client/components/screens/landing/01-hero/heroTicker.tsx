const tickerItems = [
    "Training",
    "Maintenance",
    "Remote Assistance",
    "Inspection",
    "Digital Twins",
    "Analytics",
];

export function HeroTicker() {
    return (
        <div className="absolute inset-x-0 bottom-7 z-20">

            <div className="mx-auto max-w-[1520px] px-12 pb-10">

                <div className="flex items-center justify-center">

                    {tickerItems.map((item, index) => (
                        <div
                            key={item}
                            className="flex items-center"
                        >
                            <span className="text-[17px] font-medium text-white/80 whitespace-nowrap">
                                {item}
                            </span>

                            {index !== tickerItems.length - 1 && (
                                <span className="mx-13 h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                        </div>
                    ))}

                </div>

            </div>

        </div>
    );
}