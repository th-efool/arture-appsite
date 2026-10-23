import {
    Glasses,
    Box,
    Layers,
    FileText,
    Wrench,
    Search,
    Brain,
    Bot,
    Server,
    BarChart3,
    Shield,
    CheckCircle2,
} from "lucide-react";
import { leftPanels, rightPanels, PanelGroup } from "./architectureData";

function ItemIcon({ name }: { name: string }) {
    const cls = "w-4 h-4 text-primary shrink-0";
    if (name.includes("XR") || name.includes("VR") || name.includes("MR")) return <Glasses className={cls} />;
    if (name.includes("Spatial") || name.includes("Unity") || name.includes("CAD")) return <Box className={cls} />;
    if (name.includes("Physics") || name.includes("Layers")) return <Layers className={cls} />;
    if (name.includes("Manual") || name.includes("SOP") || name.includes("Doc")) return <FileText className={cls} />;
    if (name.includes("Maintenance") || name.includes("Wrench")) return <Wrench className={cls} />;
    if (name.includes("Inspection") || name.includes("Search")) return <Search className={cls} />;
    if (name.includes("Agent") || name.includes("Reasoning") || name.includes("AI")) return <Brain className={cls} />;
    if (name.includes("Vision") || name.includes("Tool")) return <Bot className={cls} />;
    if (name.includes("PLC") || name.includes("SCADA") || name.includes("MES") || name.includes("ERP") || name.includes("CMMS") || name.includes("OPC")) return <Server className={cls} />;
    if (name.includes("Analytics") || name.includes("Quality")) return <BarChart3 className={cls} />;
    if (name.includes("Safety")) return <Shield className={cls} />;
    return <CheckCircle2 className={cls} />;
}

export function SinglePanelBox({ group, side, index }: { group: PanelGroup; side: "left" | "right"; index: number }) {
    return (
        <div
            id={`${side}-panel-${index}`}
            className="relative group rounded-md border-2 border-[#2B4C7E]/40 bg-[#F7F4ED]/95 p-4 shadow-sm backdrop-blur-xs transition-all duration-300 hover:border-primary/80 hover:shadow-md"
        >
            {/* Blueprint Corner Crosshairs (+) */}
            <span className="absolute -top-2 -left-2 text-[10px] font-mono text-[#2B4C7E] select-none font-bold">+</span>
            <span className="absolute -top-2 -right-2 text-[10px] font-mono text-[#2B4C7E] select-none font-bold">+</span>
            <span className="absolute -bottom-2 -left-2 text-[10px] font-mono text-[#2B4C7E] select-none font-bold">+</span>
            <span className="absolute -bottom-2 -right-2 text-[10px] font-mono text-[#2B4C7E] select-none font-bold">+</span>

            {/* Bracket Corners */}
            <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-[#2B4C7E]/60" />
            <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-[#2B4C7E]/60" />
            <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-[#2B4C7E]/60" />
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-[#2B4C7E]/60" />

            {/* Circuit Line Outward Output Anchor Dots */}
            <div className={`absolute top-1/2 -translate-y-1/2 ${side === "left" ? "-right-3" : "-left-3"} flex flex-col gap-1.5 z-30`}>
                <span className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#2B4C7E] shadow-xs" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#2B4C7E] shadow-xs" />
                <span className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-[#2B4C7E] shadow-xs" />
            </div>

            {/* Header */}
            <div className="border-b border-[#2B4C7E]/30 pb-1.5 mb-2.5 flex items-center justify-between">
                <span className="text-xs sm:text-sm font-mono font-black tracking-wider text-[#1F2933] uppercase">
                    {group.title}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#2B4C7E] uppercase">
                    {side === "left" ? "INPUT" : "OUTPUT"}
                </span>
            </div>

            {/* Items List with Enlarged Text */}
            <div className="space-y-2">
                {group.items.map((item) => (
                    <div
                        key={item.label}
                        className="flex items-center justify-between py-1 text-xs sm:text-sm text-[#1F2933] font-bold border-b border-dashed border-[#2B4C7E]/15 last:border-0"
                    >
                        <span>{item.label}</span>
                        <ItemIcon name={item.label} />
                    </div>
                ))}
            </div>
        </div>
    );
}

export function LeftBlueprintPanels() {
    return (
        <div className="flex flex-col gap-5 w-full">
            {leftPanels.map((group, idx) => (
                <SinglePanelBox key={group.id} group={group} side="left" index={idx} />
            ))}
        </div>
    );
}

export function RightBlueprintPanels() {
    return (
        <div className="flex flex-col gap-5 w-full">
            {rightPanels.map((group, idx) => (
                <SinglePanelBox key={group.id} group={group} side="right" index={idx} />
            ))}
        </div>
    );
}
