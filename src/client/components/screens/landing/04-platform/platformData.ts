export interface PlatformNode {
    id: string;
    title: string;
    description: string;
    icon: string;
    position: "top" | "top-right" | "bottom-right" | "bottom" | "bottom-left" | "top-left";
}

export interface EvolutionStep {
    id: string;
    title: string;
    subtitle: string;
    icon: string;
}

export const platformNodes: PlatformNode[] = [
    {
        id: "explain",
        title: "EXPLAIN",
        description: "Every machine can answer why, not just what.",
        icon: "message",
        position: "top",
    },
    {
        id: "verify",
        title: "VERIFY",
        description: "Know it was done correctly—before production resumes.",
        icon: "shield",
        position: "top-right",
    },
    {
        id: "document",
        title: "DOCUMENT",
        description: "Every action becomes evidence.",
        icon: "camera",
        position: "bottom-right",
    },
    {
        id: "improve",
        title: "IMPROVE",
        description: "Every interaction makes the next one smarter.",
        icon: "chart",
        position: "bottom",
    },
    {
        id: "simulate",
        title: "SIMULATE",
        description: "Practice consequences before they become downtime.",
        icon: "box",
        position: "bottom-left",
    },
    {
        id: "guide",
        title: "GUIDE",
        description: "Work happens where the work is. Instructions appear on the machine, not in a binder.",
        icon: "arrow",
        position: "top-left",
    },
];

export const evolutionSteps: EvolutionStep[] = [
    {
        id: "traditional",
        title: "TRADITIONAL MACHINE",
        subtitle: "Passive equipment. Complex. Opaque.",
        icon: "machine-passive",
    },
    {
        id: "interactive",
        title: "INTERACTIVE MACHINE",
        subtitle: "Understands context. Provides guidance.",
        icon: "machine-interactive",
    },
    {
        id: "adaptive",
        title: "ADAPTIVE MACHINE",
        subtitle: "Learns from work. Adapts in real time.",
        icon: "machine-adaptive",
    },
    {
        id: "intelligent",
        title: "INTELLIGENT FACTORY",
        subtitle: "Continuously improves. Autonomous in the future.",
        icon: "factory-intelligent",
    },
];
