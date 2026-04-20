import { randomUUID } from "node:crypto";
import type { TokenManager } from "./token-manager";
import { log } from "../logger/logger";

export interface ToolContext {
  organizationId: string;
  accessToken: string | null;
  correlationId: string;
}

export async function buildToolContext(
  tokenManager: TokenManager,
  organizationId: string,
): Promise<ToolContext> {
  try {
    const accessToken = await tokenManager.getAccessToken();
    return { organizationId, accessToken, correlationId: randomUUID() };
  } catch (err) {
    const data = {
      error: err,
      organizationId,
      correlationId: randomUUID(),
      accessToken: null,
    };
    log(data, "warn", "failed_access_token");

    return data;
  }
}
