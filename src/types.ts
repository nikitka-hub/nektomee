export type Gender = 'male' | 'female' | 'any';

export type AgeGroup = '18-21' | '22-25' | '26-30' | '30+';

export interface UserFilters {
  myGender: Gender;
  targetGender: Gender;
  ageGroup: AgeGroup;
}

export type ConnectionState = 
  | 'idle' 
  | 'mic_check' 
  | 'searching' 
  | 'waiting_link'
  | 'connected' 
  | 'ended' 
  | 'error';

export interface PeerInfo {
  id: string;
  gender: Gender;
  ageGroup: AgeGroup;
  matchedAt: number;
  isDirectLink?: boolean;
  name?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'me' | 'peer' | 'system';
  text: string;
  timestamp: number;
}

export type VoiceEffect = 'none' | 'robot' | 'echo' | 'radio' | 'deep' | 'chipmunk';

export interface SoundReaction {
  id: string;
  emoji: string;
  label: string;
  soundName: string;
}

export interface StatsInfo {
  onlineCount: number;
  searchingCount: number;
  activeCallsCount: number;
}

// WS Message Protocol
export type WSMessageType =
  | 'init'
  | 'start_search'
  | 'cancel_search'
  | 'create_direct_room'
  | 'join_direct_room'
  | 'direct_room_created'
  | 'match_found'
  | 'signal'
  | 'chat_message'
  | 'reaction'
  | 'audio_status'
  | 'skip_partner'
  | 'leave_call'
  | 'report'
  | 'stats';

export interface WSMessage {
  type: WSMessageType;
  payload?: any;
}

