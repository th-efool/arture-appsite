export const demoAdminEmail = "admin@arture.demo";
export const demoGuestEmail = "guest@arture.demo";
export function isGuest(user: { email?: string }) { return user.email?.toLowerCase() === demoGuestEmail; }
export const waterPump = {
  assetCode: "ATR-DEMO-PUMP-001",
  name: "Centrifugal Water Pump",
  model: "CentrifugalWaterPump",
  location: "Demo Workshop",
  status: "operational" as const,
};

export function isPumpDemo(_user?: { email?: string; demoAccount?: boolean }) {
  return true;
}

export function visibleMachineFilter(_user?: { email?: string }) {
  return { assetCode: waterPump.assetCode };
}
