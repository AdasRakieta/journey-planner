// Tag definitions for attractions with corresponding emoji icons
// Maps tag values to display labels and emoji

export type AttractionTag = 
  | 'beauty' 
  | 'cafe' 
  | 'must_see' 
  | 'accommodation' 
  | 'nature' 
  | 'airport' 
  | 'food' 
  | 'attraction' 
  | 'train_station';

export interface AttractionTagInfo {
  value: AttractionTag;
  label: string;
  emoji: string;
  color: string; // Tailwind color class
}

export const ATTRACTION_TAGS: Record<AttractionTag, AttractionTagInfo> = {
  beauty: {
    value: 'beauty',
    label: 'Beauty & Spa',
    emoji: '🧖🏻‍♀️',
    color: 'bg-pink-100 text-pink-800'
  },
  cafe: {
    value: 'cafe',
    label: 'Café',
    emoji: '☕️',
    color: 'bg-amber-100 text-amber-800'
  },
  must_see: {
    value: 'must_see',
    label: 'Must See',
    emoji: '📷',
    color: 'bg-purple-100 text-purple-800'
  },
  accommodation: {
    value: 'accommodation',
    label: 'Accommodation',
    emoji: '💤',
    color: 'bg-blue-100 text-blue-800'
  },
  nature: {
    value: 'nature',
    label: 'Nature',
    emoji: '🌱',
    color: 'bg-green-100 text-green-800'
  },
  airport: {
    value: 'airport',
    label: 'Airport',
    emoji: '✈️',
    color: 'bg-sky-100 text-sky-800'
  },
  food: {
    value: 'food',
    label: 'Food & Dining',
    emoji: '🍽️',
    color: 'bg-orange-100 text-orange-800'
  },
  attraction: {
    value: 'attraction',
    label: 'Attraction',
    emoji: '💸',
    color: 'bg-indigo-100 text-indigo-800'
  },
  train_station: {
    value: 'train_station',
    label: 'Train Station',
    emoji: '🚄',
    color: 'bg-gray-100 text-gray-800'
  }
};

// Helper function to get tag info
export const getAttractionTagInfo = (tag?: AttractionTag): AttractionTagInfo | null => {
  if (!tag) return null;
  return ATTRACTION_TAGS[tag] || null;
};

// Get all available tags as array
export const getAvailableAttractionTags = (): AttractionTagInfo[] => {
  return Object.values(ATTRACTION_TAGS);
};
