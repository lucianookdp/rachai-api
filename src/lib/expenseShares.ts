import { splitEqually } from './money.js';

export interface ShareInput {
  participantId: string;
  shareCents: number;
}

export type ResolveSharesResult = { ok: true; shares: ShareInput[] } | { ok: false; error: string };

// Either an explicit set of shares (custom, unequal amounts) or a list of
// participant ids (split evenly among them) can drive an expense's shares.
// Exactly one of the two is expected to be set by the caller.
export function resolveShares(
  amountCents: number,
  groupParticipantIds: Set<string>,
  options: { participantIds?: string[]; shares?: ShareInput[] },
): ResolveSharesResult {
  if (options.shares) {
    if (!options.shares.every((s) => groupParticipantIds.has(s.participantId))) {
      return { ok: false, error: 'shares contains someone outside this group' };
    }
    const sum = options.shares.reduce((total, s) => total + s.shareCents, 0);
    if (sum !== amountCents) {
      return { ok: false, error: 'shares must add up to amountCents' };
    }
    return { ok: true, shares: options.shares };
  }

  const splitAmong = options.participantIds ?? [...groupParticipantIds];
  if (!splitAmong.every((id) => groupParticipantIds.has(id))) {
    return { ok: false, error: 'participantIds contains someone outside this group' };
  }

  const amounts = splitEqually(amountCents, splitAmong.length);
  return {
    ok: true,
    shares: splitAmong.map((participantId, index) => ({ participantId, shareCents: amounts[index]! })),
  };
}
