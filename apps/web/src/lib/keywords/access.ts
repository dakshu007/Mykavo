import { getAgentRollout, prisma, rolloutAllows } from "@mykavo/database";
import { isPlatformAdmin, type AdminCandidate } from "@/lib/platform-admin";

/**
 * Who can open the AI Keyword Agent: platform admins always, then whoever the
 * rollout switch on All Usage allows (a beta list of verified emails, then
 * everyone). Every page and API route checks this server-side.
 */
export async function canUseKeywordAgent(user: AdminCandidate): Promise<boolean> {
  if (isPlatformAdmin(user)) return true;
  const rollout = await getAgentRollout(prisma);
  return rolloutAllows(rollout, user.email ?? null, user.emailVerified === true);
}
