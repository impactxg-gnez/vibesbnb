import { Injectable, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { Firestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: Firestore;

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }

    this.firestore = admin.firestore();
    
    // Configure Firestore to use readable collection names
    this.firestore.settings({
      ignoreUndefinedProperties: true,
    });
  }

  getFirestore(): Firestore {
    return this.firestore;
  }

  // Collection helpers with readable names
  users() {
    return this.firestore.collection('users');
  }

  profiles() {
    return this.firestore.collection('user_profiles');
  }

  listings() {
    return this.firestore.collection('listings');
  }

  listingMedia() {
    return this.firestore.collection('listing_media');
  }

  calendars() {
    return this.firestore.collection('calendars');
  }

  availabilityBlocks() {
    return this.firestore.collection('availability_blocks');
  }

  priceOverrides() {
    return this.firestore.collection('price_overrides');
  }

  bookings() {
    return this.firestore.collection('bookings');
  }

  messageThreads() {
    return this.firestore.collection('message_threads');
  }

  messages() {
    return this.firestore.collection('messages');
  }

  reviews() {
    return this.firestore.collection('reviews');
  }

  payouts() {
    return this.firestore.collection('payouts');
  }

  reports() {
    return this.firestore.collection('reports');
  }

  auditLogs() {
    return this.firestore.collection('audit_logs');
  }

  notifications() {
    return this.firestore.collection('notifications');
  }

  // Generic CRUD helpers
  async create(collection: string, data: any): Promise<string> {
    const ref = await this.firestore.collection(collection).add({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return ref.id;
  }

  async update(collection: string, id: string, data: any): Promise<void> {
    await this.firestore
      .collection(collection)
      .doc(id)
      .update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  }

  async get(collection: string, id: string): Promise<any> {
    const doc = await this.firestore.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.firestore.collection(collection).doc(id).delete();
  }

  async query(
    collection: string,
    filters: Array<{ field: string; op: any; value: any }> = [],
    orderBy?: { field: string; direction: 'asc' | 'desc' },
    limit?: number,
  ): Promise<any[]> {
    let query: any = this.firestore.collection(collection);

    filters.forEach(({ field, op, value }) => {
      query = query.where(field, op, value);
    });

    if (orderBy) {
      query = query.orderBy(orderBy.field, orderBy.direction);
    }

    if (limit) {
      query = query.limit(limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  // Transaction support
  async runTransaction<T>(
    updateFunction: (transaction: admin.firestore.Transaction) => Promise<T>,
  ): Promise<T> {
    return this.firestore.runTransaction(updateFunction);
  }

  // Batch operations
  batch() {
    return this.firestore.batch();
  }

  timestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  increment(value: number) {
    return admin.firestore.FieldValue.increment(value);
  }
}


