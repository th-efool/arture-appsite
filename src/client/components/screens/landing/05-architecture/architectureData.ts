export interface ArchitectureModule {
    id: string;
    number: string;
    title: string;
    description: string;
    icon: string;
    position: "top-left" | "top-right" | "mid-left" | "mid-right" | "bottom-left" | "bottom-right";
}

export interface PanelGroup {
    id: string;
    title: string;
    items: { label: string; icon?: string }[];
}

export interface EcosystemLogo {
    id: string;
    name: string;
    subtext: string;
    iconType: string;
}

export const architectureModules: ArchitectureModule[] = [
    {
        id: "spatial-computing",
        number: "01",
        title: "SPATIAL COMPUTING",
        description: "Understands where people, machines, tools, and procedures exist inside three-dimensional space.",
        icon: "cube",
        position: "top-left",
    },
    {
        id: "machine-intelligence",
        number: "02",
        title: "MACHINE INTELLIGENCE",
        description: "Reasons through engineering context to explain, guide, verify, and improve industrial work.",
        icon: "brain",
        position: "top-right",
    },
    {
        id: "industrial-knowledge",
        number: "03",
        title: "INDUSTRIAL KNOWLEDGE",
        description: "Transforms decades of industrial expertise into machine-aware operational intelligence.",
        icon: "manual",
        position: "mid-left",
    },
    {
        id: "enterprise-integration",
        number: "04",
        title: "ENTERPRISE INTEGRATION",
        description: "Connects naturally with existing industrial infrastructure instead of replacing it.",
        icon: "servers",
        position: "mid-right",
    },
    {
        id: "human-interaction",
        number: "05",
        title: "HUMAN INTERACTION",
        description: "Delivers one consistent industrial experience across every interface.",
        icon: "headset",
        position: "bottom-left",
    },
    {
        id: "operational-intelligence",
        number: "06",
        title: "OPERATIONAL INTELLIGENCE",
        description: "Every interaction becomes evidence, insight, and continuous operational improvement.",
        icon: "chart",
        position: "bottom-right",
    },
];

export const leftPanels: PanelGroup[] = [
    {
        id: "knowledge-inputs",
        title: "KNOWLEDGE INPUTS",
        items: [
            { label: "OpenXR" },
            { label: "Unity" },
            { label: "Spatial Anchoring" },
            { label: "Physics" },
            { label: "Hand Tracking" },
        ],
    },
    {
        id: "document-inputs",
        title: "DOCUMENT INPUTS",
        items: [
            { label: "OEM Manuals" },
            { label: "SOPs" },
            { label: "Maintenance" },
            { label: "Inspection" },
            { label: "CAD" },
            { label: "Safety" },
        ],
    },
    {
        id: "interface-layer",
        title: "INTERFACE LAYER",
        items: [
            { label: "VR" },
            { label: "MR" },
            { label: "Desktop" },
            { label: "Tablet" },
            { label: "Voice" },
            { label: "Remote Expert" },
        ],
    },
];

export const rightPanels: PanelGroup[] = [
    {
        id: "ai-capabilities",
        title: "AI CAPABILITIES",
        items: [
            { label: "Engineering Agent" },
            { label: "Vision" },
            { label: "Reasoning" },
            { label: "Procedure Planner" },
            { label: "Tool Invocation" },
        ],
    },
    {
        id: "enterprise-systems",
        title: "ENTERPRISE SYSTEMS",
        items: [
            { label: "PLC" },
            { label: "SCADA" },
            { label: "MES" },
            { label: "ERP" },
            { label: "CMMS" },
            { label: "OPC-UA" },
        ],
    },
    {
        id: "outputs-actions",
        title: "OUTPUT & ACTIONS",
        items: [
            { label: "Documentation" },
            { label: "Inspection" },
            { label: "Quality" },
            { label: "Maintenance" },
            { label: "Analytics" },
            { label: "Knowledge Capture" },
        ],
    },
];

export const ecosystemLogos: EcosystemLogo[] = [
    { id: "siemens", name: "SIEMENS", subtext: "PLC", iconType: "siemens" },
    { id: "aveva", name: "AVEVA", subtext: "SCADA", iconType: "aveva" },
    { id: "rockwell", name: "Rockwell Automation", subtext: "MES", iconType: "rockwell" },
    { id: "sap", name: "SAP", subtext: "ERP", iconType: "sap" },
    { id: "ibm", name: "IBM Maximo", subtext: "CMMS", iconType: "ibm" },
    { id: "opc-ua", name: "OPC UA", subtext: "OPC-UA", iconType: "opc" },
    { id: "rest", name: "{ REST }", subtext: "REST APIs", iconType: "code" },
    { id: "mqtt", name: "mqtt", subtext: "MQTT", iconType: "wifi" },
    { id: "aws", name: "aws", subtext: "IoT", iconType: "aws" },
    { id: "sql", name: "Microsoft SQL Server", subtext: "SQL", iconType: "database" },
    { id: "nvidia", name: "NVIDIA OMNIVERSE", subtext: "Digital Twin", iconType: "nvidia" },
    { id: "azure", name: "Azure", subtext: "Cloud", iconType: "azure" },
];
