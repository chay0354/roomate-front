export type UserPath = 'dayer' | 'dira';

export type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type ApartmentStatus = 'open' | 'full';

export type ReelKind = 'image' | 'video' | 'apartment_tour';

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  bio: string | null;
  age: number | null;
  occupation: string | null;
  marital_status: string | null;
  user_path: UserPath;
  hobbies: string[];
  avatar_url: string | null;
  socials: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Apartment {
  id: string;
  owner_id: string;
  title: string | null;
  address: string;
  neighborhood: string | null;
  city: string;
  price: number;
  rooms: number | null;
  roommate_slots: number;
  description: string | null;
  tags: string[];
  features: string[];
  house_rules: string[];
  entry_type: string;
  entry_date: string | null;
  arnona: number;
  vaad: number;
  utilities: number;
  image_urls: string[];
  status: ApartmentStatus;
  lat: number | null;
  lng: number | null;
  created_at: string;
  updated_at: string;
  owner?: Profile | null;
  is_favorite?: boolean;
}

export interface ApartmentMember {
  apartment_id: string;
  profile_id: string;
  role: string;
  profile?: Profile;
}

export interface Application {
  id: string;
  apartment_id: string;
  applicant_id: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
  apartment?: Apartment | null;
  applicant?: Profile | null;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: Profile | null;
}

export interface Conversation {
  id: string;
  apartment_id: string | null;
  application_id: string | null;
  created_at: string;
  apartment?: Apartment | null;
  members?: Profile[];
  last_message?: Message | null;
  other_member?: Profile | null;
}

export type MeetingStatus = 'proposed' | 'scheduled' | 'done' | 'cancelled' | 'declined';

export interface Meeting {
  id: string;
  apartment_id: string;
  organizer_id: string;
  with_user_id: string;
  starts_at: string;
  notes: string | null;
  status: MeetingStatus;
  organizer_accepted?: boolean;
  invitee_accepted?: boolean;
  conversation_id?: string | null;
  created_at: string;
  apartment?: Apartment | null;
  organizer?: Profile | null;
  with_user?: Profile | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string | null;
  body: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface Favorite {
  user_id: string;
  apartment_id: string;
  created_at: string;
  apartment?: Apartment;
}

export interface Reel {
  id: string;
  user_id: string;
  apartment_id: string | null;
  kind: ReelKind;
  media_url: string;
  thumbnail_url: string | null;
  caption: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile | null;
  apartment?: Apartment | null;
  liked_by_me?: boolean;
}

export interface ReelComment {
  id: string;
  reel_id: string;
  user_id: string;
  body: string;
  created_at: string;
  author?: Profile | null;
}
