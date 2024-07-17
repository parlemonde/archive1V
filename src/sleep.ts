/**
 * Crée une promesse qui se résout après un délai spécifié.
 * @param ms - Le délai en millisecondes.
 * @returns Une promesse qui se résout après le délai spécifié.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
