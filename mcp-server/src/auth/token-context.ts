import { randomUUID } from "node:crypto";
import type { TokenManager } from "./token-manager";
import { log } from "../logger/logger";

export interface ToolContext {
  organizationId: string;
  accessToken: string;
  correlationId: string;
}

export async function buildToolContext(
  tokenManager: TokenManager,
  organizationId: string,
): Promise<ToolContext> {
  const correlationId = randomUUID();

  try {
    const accessToken = await tokenManager.getAccessToken();
    return { organizationId, accessToken, correlationId };
  } catch (err) {
    log(
      {
        error: err,
        organizationId,
        correlationId,
      },
      "warn",
      "failed_access_token",
    );

    throw err;
  }
}
