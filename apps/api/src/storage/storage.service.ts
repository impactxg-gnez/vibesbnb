import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import sharp from 'sharp';
import { randomBytes } from 'crypto';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.bucket = process.env.AWS_S3_BUCKET || 'vibesbnb-media';
  }

  async uploadImage(
    file: Buffer,
    folder: string = 'images',
  ): Promise<{
    url: string;
    width: number;
    height: number;
    variants: Record<string, string>;
  }> {
    const filename = `${folder}/${Date.now()}-${randomBytes(16).toString('hex')}`;
    
    // Get original dimensions
    const metadata = await sharp(file).metadata();
    
    // Generate variants
    const variants = {
      thumbnail: await this.uploadVariant(file, filename, 'thumbnail', 200),
      small: await this.uploadVariant(file, filename, 'small', 400),
      medium: await this.uploadVariant(file, filename, 'medium', 800),
      large: await this.uploadVariant(file, filename, 'large', 1600),
    };

    // Upload original
    const originalKey = `${filename}-original.jpg`;
    await this.uploadToS3(
      await sharp(file).jpeg({ quality: 90 }).toBuffer(),
      originalKey,
      'image/jpeg',
    );

    const url = this.getPublicUrl(originalKey);

    return {
      url,
      width: metadata.width || 0,
      height: metadata.height || 0,
      variants,
    };
  }

  private async uploadVariant(
    file: Buffer,
    filename: string,
    size: string,
    width: number,
  ): Promise<string> {
    const key = `${filename}-${size}.jpg`;
    const resized = await sharp(file)
      .resize(width, null, {
        withoutEnlargement: true,
        fit: 'inside',
      })
      .jpeg({ quality: 80 })
      .toBuffer();

    await this.uploadToS3(resized, key, 'image/jpeg');
    return this.getPublicUrl(key);
  }

  private async uploadToS3(
    buffer: Buffer,
    key: string,
    contentType: string,
  ): Promise<void> {
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      }),
    );
  }

  private getPublicUrl(key: string): string {
    if (process.env.CDN_URL) {
      return `${process.env.CDN_URL}/${key}`;
    }
    return `https://${this.bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  async getSignedUploadUrl(
    folder: string = 'images',
    contentType: string = 'image/jpeg',
  ): Promise<{ uploadUrl: string; key: string }> {
    const key = `${folder}/${Date.now()}-${randomBytes(16).toString('hex')}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: 3600,
    });

    return { uploadUrl, key };
  }
}


