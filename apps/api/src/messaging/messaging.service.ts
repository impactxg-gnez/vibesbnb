import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import { Message, MessageThread, NotificationType } from '@vibesbnb/shared';

@Injectable()
export class MessagingService {
  constructor(private firebase: FirebaseService) {}

  async createOrGetThread(
    listingId: string,
    hostId: string,
    guestId: string,
    bookingId?: string,
  ): Promise<MessageThread> {
    // Check if thread already exists
    const existingThreads = await this.firebase.query('message_threads', [
      { field: 'listingId', op: '==', value: listingId },
      { field: 'hostId', op: '==', value: hostId },
      { field: 'guestId', op: '==', value: guestId },
    ]);

    if (existingThreads.length > 0) {
      return existingThreads[0];
    }

    // Create new thread
    const threadId = await this.firebase.create('message_threads', {
      listingId,
      hostId,
      guestId,
      bookingId,
      lastMessageAt: new Date(),
      unreadCountHost: 0,
      unreadCountGuest: 0,
    });

    return this.firebase.get('message_threads', threadId);
  }

  async sendMessage(
    threadId: string,
    senderId: string,
    body: string,
    attachments?: Array<{ url: string; type: string; name: string }>,
  ): Promise<Message> {
    const thread = await this.firebase.get('message_threads', threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    const messageId = await this.firebase.create('messages', {
      threadId,
      senderId,
      body,
      attachments,
      read: false,
    });

    // Update thread
    const isHost = senderId === thread.hostId;
    await this.firebase.update('message_threads', threadId, {
      lastMessageAt: new Date(),
      [isHost ? 'unreadCountGuest' : 'unreadCountHost']: this.firebase.increment(1),
    });

    // Create notification for recipient
    const recipientId = isHost ? thread.guestId : thread.hostId;
    await this.firebase.create('notifications', {
      userId: recipientId,
      type: NotificationType.NEW_MESSAGE,
      title: 'New Message',
      body: body.substring(0, 100),
      data: { threadId, messageId },
      read: false,
    });

    return this.firebase.get('messages', messageId);
  }

  async getThreadMessages(threadId: string, limit: number = 50): Promise<Message[]> {
    return this.firebase.query(
      'messages',
      [{ field: 'threadId', op: '==', value: threadId }],
      { field: 'sentAt', direction: 'desc' },
      limit,
    );
  }

  async getUserThreads(userId: string): Promise<MessageThread[]> {
    const hostThreads = await this.firebase.query('message_threads', [
      { field: 'hostId', op: '==', value: userId },
    ]);

    const guestThreads = await this.firebase.query('message_threads', [
      { field: 'guestId', op: '==', value: userId },
    ]);

    return [...hostThreads, ...guestThreads].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  }

  async markAsRead(threadId: string, userId: string): Promise<void> {
    const thread = await this.firebase.get('message_threads', threadId);
    if (!thread) return;

    const isHost = userId === thread.hostId;
    await this.firebase.update('message_threads', threadId, {
      [isHost ? 'unreadCountHost' : 'unreadCountGuest']: 0,
    });

    // Mark messages as read
    const messages = await this.firebase.query('messages', [
      { field: 'threadId', op: '==', value: threadId },
      { field: 'read', op: '==', value: false },
    ]);

    for (const message of messages) {
      if (message.senderId !== userId) {
        await this.firebase.update('messages', message.id, { read: true });
      }
    }
  }
}


