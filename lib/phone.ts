/**
 * Telefoonnummers zoals mensen ze invullen: "+31 (0)6 12 34 56 78", "06-12345678 / 073-1234567 (na 18u)".
 * Het veld blijft vrij, maar bellen en tonen gebeurt met het eerste nummer dat erin staat.
 */
export function firstPhone(input: string): string {
  const m = input.match(/\+?\d[\d\s().-]{6,}\d/);
  return (m ? m[0] : input).trim();
}

/** Link waarmee de telefoon het eerste nummer belt. */
export const telHref = (input: string) => `tel:${firstPhone(input).replace(/\(0\)/g, "").replace(/[^\d+]/g, "")}`;
