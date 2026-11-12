'use client';

import Image from 'next/image';
import { Instagram, Heart, ExternalLink } from 'lucide-react';
import { CURATED_INSTAGRAM_POSTS, INSTAGRAM_PROFILE } from '@/lib/instagram';

export function InstagramFooterStrip() {
  const posts = CURATED_INSTAGRAM_POSTS.slice(0, 6);

  return (
    <div className="border-b border-white/10 pb-8 mb-10">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-[2px]">
            <div className="w-full h-full bg-surface-dark rounded-[10px] flex items-center justify-center">
              <Instagram className="w-5 h-5 text-white" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-bold text-sm">Follow @{INSTAGRAM_PROFILE.handle}</h3>
              <span className="text-[10px] font-semibold bg-white/10 text-primary-400 px-2 py-0.5 rounded-full">
                {INSTAGRAM_PROFILE.followersCount} Followers
              </span>
            </div>
            <p className="text-muted text-xs">
              Live sanctuary updates, Miami retreats & wellness hospitality.
            </p>
          </div>
        </div>

        <a
          href={INSTAGRAM_PROFILE.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all group"
        >
          <Instagram className="w-3.5 h-3.5 text-pink-400 group-hover:scale-110 transition-transform" />
          <span>Follow on Instagram</span>
          <ExternalLink className="w-3 h-3 text-muted" />
        </a>
      </div>

      {/* 6 Post Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
        {posts.map((post) => (
          <a
            key={post.id}
            href={post.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative aspect-square rounded-xl overflow-hidden bg-surface border border-white/10 shadow-sm hover:border-primary-500/40 transition-colors"
          >
            <Image
              src={post.media_url}
              alt={post.caption}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-300"
              sizes="(max-width: 640px) 33vw, 16vw"
            />
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-semibold p-2 text-center">
              <Instagram className="w-4 h-4 text-pink-400 mb-0.5" />
              {post.like_count && (
                <span className="flex items-center gap-1 text-[11px] text-white/90">
                  <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                  {post.like_count}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
