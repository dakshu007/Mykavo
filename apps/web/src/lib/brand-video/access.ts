import { getVideoRollout, prisma, rolloutAllows } from "@mykavo/database";
import { isPlatformAdmin, type AdminCandidate } from "@/lib/platform-admin";

/**
 * Who can open Brand Video: platform admins always, then whoever its own
 * rollout switch on All Usage allows (a beta list of verified emails, then
 * everyone). Every page and API route checks this server-side.
 */
export async function canUseBrandVideo(user: AdminCandidate): Promise<boolean> {
  if (isPlatformAdmin(user)) return true;
  const rollout = await getVideoRollout(prisma);
  return rolloutAllows(rollout, user.email ?? null, user.emailVerified === true);
}
