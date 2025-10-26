export interface Review {
  id: string;
  bookingId: string;
  authorId: string;
  targetUserId: string; // Host or guest being reviewed
  targetType: 'host' | 'guest';
  rating: number; // 1-5
  comment: string;
  categories?: {
    cleanliness?: number;
    communication?: number;
    checkIn?: number;
    accuracy?: number;
    location?: number;
    value?: number;
  };
  response?: {
    body: string;
    respondedAt: Date;
  };
  createdAt: Date;
}

export interface ReviewStats {
  userId: string;
  averageRating: number;
  totalReviews: number;
  categoryAverages: {
    cleanliness: number;
    communication: number;
    checkIn: number;
    accuracy: number;
    location: number;
    value: number;
  };
}


