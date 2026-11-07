import type { LegalSource, RawHit } from "./types";

/**
 * OpenLegal / CaseWin adapter. LOCKED STUB.
 *
 * The developer documentation at https://openlegal.casewinai.com/developers could not be read
 * when this scaffold was generated, and the project rules forbid guessing endpoints. So this
 * adapter reports "not configured" and the research engine honestly says no live search ran.
 *
 * TO ACTIVATE (after you read the docs yourself):
 *  1. Confirm base URL, auth scheme, endpoints, parameters, response shape and rate limits.
 *  2. Fill in search(), fetchFull() and lookupCitation() below, mapping responses to RawHit.
 *  3. Add secrets:  npx wrangler secret put OPENLEGAL_API_KEY
 *                   npx wrangler secret put OPENLEGAL_VERIFIED   (value: true)
 *  Paste the docs page into a chat and the three functions can be written against them.
 */
export const openLegal: LegalSource = {
  id: "openlegal",
  name: "OpenLegal (CaseWin)",

  isConfigured() {
    return Boolean(process.env.OPENLEGAL_API_KEY) && process.env.OPENLEGAL_VERIFIED === "true";
  },

  async search(_query, _opts): Promise<RawHit[]> {
    throw new Error("OPENLEGAL_NOT_IMPLEMENTED: implement against the verified API docs.");
  },

  async fetchFull(_hit) {
    throw new Error("OPENLEGAL_NOT_IMPLEMENTED");
  },

  async lookupCitation(_citation) {
    throw new Error("OPENLEGAL_NOT_IMPLEMENTED");
  },
};
