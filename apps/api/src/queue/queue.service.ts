import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class QueueService implements OnModuleInit {
  private connection: Redis;
  private mediaQueue: Queue;
  private icalSyncQueue: Queue;
  private notificationQueue: Queue;

  onModuleInit() {
    this.connection = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
    });

    // Initialize queues
    this.mediaQueue = new Queue('media-processing', { connection: this.connection });
    this.icalSyncQueue = new Queue('ical-sync', { connection: this.connection });
    this.notificationQueue = new Queue('notifications', { connection: this.connection });

    // Initialize workers
    this.initializeWorkers();
  }

  private initializeWorkers() {
    // Media processing worker
    new Worker(
      'media-processing',
      async (job) => {
        console.log(`Processing media job ${job.id}:`, job.data);
        // Implement image/video processing
      },
      { connection: this.connection },
    );

    // iCal sync worker
    new Worker(
      'ical-sync',
      async (job) => {
        console.log(`Processing iCal sync job ${job.id}:`, job.data);
        // Implement iCal sync
      },
      { connection: this.connection },
    );

    // Notification worker
    new Worker(
      'notifications',
      async (job) => {
        console.log(`Processing notification job ${job.id}:`, job.data);
        // Implement notification sending
      },
      { connection: this.connection },
    );
  }

  async addMediaProcessingJob(data: any) {
    await this.mediaQueue.add('process', data);
  }

  async addICalSyncJob(data: any) {
    await this.icalSyncQueue.add('sync', data, {
      repeat: { pattern: '0 */6 * * *' }, // Every 6 hours
    });
  }

  async addNotificationJob(data: any) {
    await this.notificationQueue.add('send', data);
  }
}


