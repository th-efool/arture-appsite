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

export function isPumpDemo(user: { email?: string }) {
  return user.email?.toLowerCase() === demoAdminEmail || isGuest(user);
}

export function visibleMachineFilter(user: { email?: string }) {
  return isPumpDemo(user) ? { assetCode: waterPump.assetCode } : {};
}
