export function phoneIdentity(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 15) throw new Error("Phone number must contain 10 to 15 digits.");
  return digits.slice(-10);
}
