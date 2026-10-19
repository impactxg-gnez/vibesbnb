export type StaySearchInput = {
  area?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  maxNightly?: number | null;
  cannabisFriendly?: boolean | null;
};

export type StayCard = {
  id: string;
  name: string;
  location: string;
  guestNightly: number;
  guests: number;
  href: string;
  cover: string;
  nights: number | null;
  matchNotes: string[];
};

export type StaySearchResult = {
  listings: StayCard[];
  relaxed: boolean;
  summary: string;
};

export type ConciergeChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  body: string;
  listings?: StayCard[];
  createdAt: string;
};

export type ConciergeChatSummary = {
  id: string;
  title: string;
  lastMessage: string;
  lastMessageAt: string;
};
