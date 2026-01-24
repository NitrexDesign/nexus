import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";

export interface WebAuthnConfig {
  rpName: string;
  rpID: string;
  origin: string[];
}

export interface SessionData {
  challenge: string;
  userId?: string;
}

// In-memory session storage (ephemeral)
const sessionStore = new Map<string, SessionData>();

export function initWebAuthn(config: WebAuthnConfig) {
  console.log("[WebAuthn] Initialized with config:", {
    rpName: config.rpName,
    rpID: config.rpID,
    origins: config.origin,
  });
  return config;
}

export async function startRegistration(
  username: string,
  userId: string,
  config: WebAuthnConfig,
): Promise<PublicKeyCredentialCreationOptionsJSON> {
  const options = await generateRegistrationOptions({
    rpName: config.rpName,
    rpID: config.rpID,
    userID: Buffer.from(userId, "utf-8"),
    userName: username,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  // Store challenge in session
  sessionStore.set(username, {
    challenge: options.challenge,
    userId,
  });

  return options;
}

export async function finishRegistration(
  username: string,
  response: RegistrationResponseJSON,
  config: WebAuthnConfig,
): Promise<VerifiedRegistrationResponse> {
  const session = sessionStore.get(username);
  if (!session) {
    throw new Error("No registration session found for user");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: session.challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpID,
  });

  // Clean up session
  sessionStore.delete(username);

  return verification;
}

export async function startAuthentication(
  username: string,
  userCredentials: Array<{ id: Buffer; signCount: number }>,
  config: WebAuthnConfig,
): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const options = await generateAuthenticationOptions({
    rpID: config.rpID,
    allowCredentials: userCredentials.map((cred) => ({
      id: cred.id,
      type: "public-key",
      transports: ["usb", "ble", "nfc", "internal"],
    })),
    userVerification: "preferred",
  });

  // Store challenge in session
  sessionStore.set(username, {
    challenge: options.challenge,
  });

  return options;
}

export async function finishAuthentication(
  username: string,
  response: AuthenticationResponseJSON,
  credential: {
    id: Buffer;
    publicKey: Buffer;
    signCount: number;
  },
  config: WebAuthnConfig,
): Promise<VerifiedAuthenticationResponse> {
  const session = sessionStore.get(username);
  if (!session) {
    throw new Error("No authentication session found for user");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: session.challenge,
    expectedOrigin: config.origin,
    expectedRPID: config.rpID,
    authenticator: {
      credentialID: credential.id,
      credentialPublicKey: credential.publicKey,
      counter: credential.signCount,
    },
  });

  // Clean up session
  sessionStore.delete(username);

  return verification;
}
