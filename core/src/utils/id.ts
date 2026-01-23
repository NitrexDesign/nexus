import { randomBytes } from "crypto";

/**
 * Generates a random ID as a 32-character hex string
 * @returns Random 32-character hex ID
 */
export function generateId(): string {
  return randomBytes(16).toString("hex");
}
