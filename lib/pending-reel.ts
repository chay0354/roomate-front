import type { ReelKind } from '@/lib/types';

export type PendingReelDraft = {
  kind: ReelKind;
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  apartmentId?: string | null;
  apartmentLabel?: string | null;
};

let draft: PendingReelDraft | null = null;

export function setPendingReel(next: PendingReelDraft) {
  draft = next;
}

export function getPendingReel(): PendingReelDraft | null {
  return draft;
}

export function clearPendingReel() {
  draft = null;
}

export function updatePendingReel(partial: Partial<PendingReelDraft>) {
  if (!draft) return null;
  draft = { ...draft, ...partial };
  return draft;
}
