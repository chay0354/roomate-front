import { apiGet, apiPatch, apiPost, apiPostFormFile } from './api-client';
import type {
  Apartment,
  ApartmentMember,
  Application,
  Conversation,
  Favorite,
  Meeting,
  Message,
  Notification,
  Profile,
  Reel,
  ReelComment,
  ReelKind,
} from './types';

export type RoommateInvite = ApartmentMember & {
  apartment?: Apartment | null;
};

export async function fetchApartments(opts?: {
  neighborhood?: string;
  search?: string;
}): Promise<Apartment[]> {
  const params = new URLSearchParams();
  if (opts?.neighborhood) params.set('neighborhood', opts.neighborhood);
  if (opts?.search) params.set('search', opts.search);
  const qs = params.toString();
  return apiGet<Apartment[]>(`/apartments${qs ? `?${qs}` : ''}`);
}

export async function fetchApartmentById(id: string): Promise<Apartment> {
  return apiGet<Apartment>(`/apartments/${id}`);
}

export async function fetchMyApartments(): Promise<Apartment[]> {
  return apiGet<Apartment[]>('/apartments/mine', true);
}

/** Apartments where I am an accepted roommate. */
export async function fetchMyMemberships(): Promise<Apartment[]> {
  return apiGet<Apartment[]>('/apartments/memberships', true);
}

export async function fetchApartmentMembers(apartmentId: string): Promise<ApartmentMember[]> {
  return apiGet<ApartmentMember[]>(`/apartments/${apartmentId}/members`, true);
}

export type ApartmentExpenses = {
  apartment: Apartment;
  occupants: { id: string; full_name: string | null; username: string | null; role: string }[];
  occupant_count: number;
  can_edit: boolean;
  expenses: { rent: number; arnona: number; vaad: number; utilities: number; total: number };
  per_person: { rent: number; arnona: number; vaad: number; utilities: number; total: number };
};

export async function fetchApartmentExpenses(apartmentId: string): Promise<ApartmentExpenses> {
  return apiGet<ApartmentExpenses>(`/apartments/${apartmentId}/expenses`, true);
}

export async function updateApartmentExpenses(
  apartmentId: string,
  body: { rent?: number; arnona?: number; vaad?: number; utilities?: number }
): Promise<Apartment> {
  return apiPatch<Apartment>(`/apartments/${apartmentId}/expenses`, body, true);
}

export async function inviteRoommate(apartmentId: string, userId: string): Promise<void> {
  await apiPost(`/apartments/${apartmentId}/invite`, { user_id: userId }, true);
}

export async function fetchPendingRoommateInvites(): Promise<RoommateInvite[]> {
  return apiGet<RoommateInvite[]>('/apartments/invites/pending', true);
}

export async function respondRoommateInvite(
  apartmentId: string,
  action: 'accept' | 'decline'
): Promise<void> {
  await apiPost('/apartments/invites/respond', { apartment_id: apartmentId, action }, true);
}

export async function fetchMyFavoriteIds(_userId: string): Promise<string[]> {
  return apiGet<string[]>('/favorites/ids', true);
}

export async function toggleFavorite(
  _userId: string,
  apartmentId: string,
  isFavorite: boolean
): Promise<void> {
  await apiPost('/favorites/' + apartmentId, { is_favorite: isFavorite }, true);
}

export async function fetchFavorites(_userId: string): Promise<Favorite[]> {
  return apiGet<Favorite[]>('/favorites', true);
}

export async function createApartment(
  payload: Partial<Apartment> & { address: string; price: number }
): Promise<Apartment> {
  return apiPost<Apartment>('/apartments', payload, true);
}

export async function sendApplication(
  apartmentId: string,
  _applicantId: string,
  message: string
): Promise<{ conversation_id: string }> {
  return apiPost<{ conversation_id: string }>(
    '/applications',
    { apartment_id: apartmentId, message },
    true
  );
}

export async function fetchMyApplications(_applicantId: string): Promise<Application[]> {
  return apiGet<Application[]>('/applications/mine', true);
}

export async function fetchApplicationsForOwner(_ownerId: string): Promise<Application[]> {
  return apiGet<Application[]>('/applications/owner', true);
}

export async function approveApplication(applicationId: string): Promise<string> {
  const result = await apiPost<{ conversation_id: string }>(
    `/applications/${applicationId}/approve`,
    undefined,
    true
  );
  return result.conversation_id;
}

export async function rejectApplication(applicationId: string): Promise<void> {
  await apiPost(`/applications/${applicationId}/reject`, undefined, true);
}

export async function fetchConversations(_userId: string): Promise<Conversation[]> {
  return apiGet<Conversation[]>('/conversations', true);
}

export async function fetchConversation(id: string): Promise<Conversation> {
  return apiGet<Conversation>(`/conversations/${id}`, true);
}

export async function fetchMessages(conversationId: string): Promise<Message[]> {
  return apiGet<Message[]>(`/conversations/${conversationId}/messages`, true);
}

export async function sendMessage(
  conversationId: string,
  _senderId: string,
  body: string
): Promise<Message> {
  return apiPost<Message>(`/conversations/${conversationId}/messages`, { body }, true);
}

export async function fetchMeetings(
  _userId: string,
  opts?: { conversationId?: string }
): Promise<Meeting[]> {
  const q = opts?.conversationId
    ? `?conversation_id=${encodeURIComponent(opts.conversationId)}`
    : '';
  return apiGet<Meeting[]>(`/meetings${q}`, true);
}

export async function createMeeting(payload: {
  apartment_id: string;
  with_user_id: string;
  starts_at: string;
  notes?: string;
  conversation_id?: string;
}): Promise<Meeting> {
  return apiPost<Meeting>('/meetings', payload, true);
}

export async function respondToMeeting(
  meetingId: string,
  accepted: boolean
): Promise<Meeting> {
  return apiPost<Meeting>(`/meetings/${meetingId}/respond`, { accepted }, true);
}

export async function fetchNotifications(_userId: string): Promise<Notification[]> {
  return apiGet<Notification[]>('/notifications', true);
}

export async function markNotificationRead(id: string): Promise<void> {
  await apiPatch(`/notifications/${id}/read`, undefined, true);
}

export async function markAllNotificationsRead(_userId: string): Promise<void> {
  await apiPost('/notifications/read-all', undefined, true);
}

export type FriendshipStatus =
  | 'none'
  | 'pending_out'
  | 'pending_in'
  | 'friends'
  | 'declined'
  | 'self';

export interface FriendRow {
  friendship: { requester_id: string; addressee_id: string; status: string };
  profile: Profile;
}

export interface PublicProfileResponse {
  profile: Profile;
  friendship_status: FriendshipStatus;
}

export async function fetchFriends(): Promise<FriendRow[]> {
  return apiGet<FriendRow[]>('/friends', true);
}

export async function fetchPendingFriendRequests(): Promise<FriendRow[]> {
  return apiGet<FriendRow[]>('/friends/pending', true);
}

export async function fetchFriendSuggestions(): Promise<Profile[]> {
  return apiGet<Profile[]>('/friends/suggestions', true);
}

export async function fetchFriendApartments(): Promise<Apartment[]> {
  return apiGet<Apartment[]>('/friends/apartments', true);
}

export async function requestFriend(userId: string): Promise<void> {
  await apiPost('/friends/request', { user_id: userId }, true);
}

export async function respondFriendRequest(
  userId: string,
  action: 'accept' | 'decline'
): Promise<void> {
  await apiPost('/friends/respond', { user_id: userId, action }, true);
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfileResponse> {
  return apiGet<PublicProfileResponse>(`/profiles/${userId}`, true);
}

export async function fetchReels(): Promise<Reel[]> {
  return apiGet<Reel[]>('/reels');
}

export async function fetchMyLikedReelIds(): Promise<string[]> {
  return apiGet<string[]>('/reels/me/liked-ids', true);
}

export async function likeReel(id: string, liked: boolean): Promise<{ likes_count: number }> {
  return apiPost(`/reels/${id}/like`, { liked }, true);
}

export async function fetchReelComments(id: string): Promise<ReelComment[]> {
  return apiGet<ReelComment[]>(`/reels/${id}/comments`);
}

export async function postReelComment(id: string, body: string): Promise<ReelComment> {
  return apiPost<ReelComment>(`/reels/${id}/comments`, { body }, true);
}

export async function uploadReel(params: {
  kind: ReelKind;
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  caption?: string;
  apartmentId?: string | null;
}): Promise<Reel> {
  const name =
    params.fileName ??
    (params.kind === 'image' ? `reel-${Date.now()}.jpg` : `reel-${Date.now()}.mp4`);
  const type =
    params.mimeType ?? (params.kind === 'image' ? 'image/jpeg' : 'video/mp4');

  const fields: Record<string, string> = { kind: params.kind };
  if (params.caption) fields.caption = params.caption;
  if (params.apartmentId) fields.apartment_id = params.apartmentId;

  return apiPostFormFile<Reel>('/reels', fields, {
    uri: params.uri,
    name,
    type,
    fieldName: 'file',
  });
}
