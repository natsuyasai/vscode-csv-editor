import { randomBytes } from "crypto";

/**
 * CSP の script-src に指定する nonce を生成する。
 * 暗号論的に安全な乱数（crypto.randomBytes）を使い、推測できないようにする。
 */
export function getNonce(): string {
  return randomBytes(24).toString("base64");
}
