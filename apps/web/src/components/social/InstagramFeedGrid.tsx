'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Instagram, Heart, MessageCircle, ExternalLink, Sparkles, MapPin } from 'lucide-react';
import { CURATED_INSTAGRAM_POSTS, INSTAGRAM_PROFILE, type InstagramPost } from '@/lib/instagram';

interface InstagramFeedGridProps {
  initialPosts?: InstagramPost[];
}

export function InstagramFeedGrid({ initialPosts = CURATED_INSTAGRAM_POSTS }: InstagramFeedGridProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedPost, setSelectedPost] = useState<InstagramPost | null>(null);

  const categories = [
    { id: 'all', label: 'All Posts' },
    { id: 'retreats', label: 'Retreats & Stays' },
    { id: 'wellness', label: 'Wellness & Reset' },
    { id: 'community', label: 'Community & Vibes' },
  ];

  const filteredPosts =
    activeCategory === 'all'
      ? initialPosts
      : initialPosts.filter((post) => post.category === activeCategory);

  return (
    <section className="container mx-auto px-4 sm:px-6 pb-24 max-w-5xl">
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-white/10 text-xs font-bold uppercase tracking-widest text-primary-400 mb-4">
          <Instagram className="w-4 h-4 text-pink-400" />
          <span>Follow Us On Instagram</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          Catch the Vibe <span className="text-primary-500">@vibesbnb</span>
        </h2>
        <p className="text-muted max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
          From sunset balcony sessions to mindful wellness amenities—see how guests and hosts live the
          sanctuary lifestyle across Miami.
        </p>

        {/* Profile Stats Bar */}
        <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-4 sm:gap-8 bg-surface/90 border border-white/10 rounded-2xl sm:rounded-full px-6 py-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="relative w-11 h-11 rounded-full p-[2px] bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600">
              <div className="w-full h-full rounded-full bg-surface-dark overflow-hidden flex items-center justify-center">
                <img
                  src={INSTAGRAM_PROFILE.avatarUrl}
                  alt={INSTAGRAM_PROFILE.handle}
                  className="w-7 h-7 object-contain"
                />
              </div>
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-sm">@{INSTAGRAM_PROFILE.handle}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-400" />
              </div>
              <p className="text-xs text-muted">{INSTAGRAM_PROFILE.displayName}</p>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-6 text-xs text-muted">
            <div>
              <span className="font-bold text-white text-sm mr-1">{INSTAGRAM_PROFILE.followersCount}</span>
              <span>Followers</span>
            </div>
            <div>
              <span className="font-bold text-white text-sm mr-1">{INSTAGRAM_PROFILE.postsCount}</span>
              <span>Posts</span>
            </div>
          </div>

          <a
            href={INSTAGRAM_PROFILE.profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl sm:rounded-full text-xs font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:opacity-95 text-white transition-all shadow-md shadow-pink-500/20 hover:scale-105 active:scale-95"
          >
            <Instagram className="w-3.5 h-3.5" />
            <span>Follow</span>
            <ExternalLink className="w-3 h-3 ml-0.5 opacity-80" />
          </a>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeCategory === cat.id
                ? 'bg-primary-500 text-black shadow-md shadow-primary-500/20'
                : 'bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Post Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {filteredPosts.map((post, idx) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: idx * 0.06 }}
            className="group relative rounded-2xl sm:rounded-3xl overflow-hidden bg-surface border border-white/10 aspect-square cursor-pointer shadow-lg hover:border-primary-500/40 transition-colors"
            onClick={() => setSelectedPost(post)}
          >
            {/* Post Image */}
            <Image
              src={post.media_url}
              alt={post.caption}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />

            {/* Top Badge (Location or Category) */}
            {post.location && (
              <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-medium text-white/90 border border-white/10">
                <MapPin className="w-3 h-3 text-primary-400" />
                <span className="truncate max-w-[130px]">{post.location}</span>
              </div>
            )}

            {/* Post Type Badge */}
            {post.media_type === 'CAROUSEL_ALBUM' && (
              <div className="absolute top-3 right-3 z-10 bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white/90 border border-white/10">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </div>
            )}

            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-5 flex flex-col justify-end text-white z-20">
              <div className="flex items-center gap-4 text-xs font-semibold mb-2.5">
                {post.like_count !== undefined && (
                  <span className="flex items-center gap-1 text-rose-400">
                    <Heart className="w-4 h-4 fill-current" />
                    {post.like_count}
                  </span>
                )}
                {post.comments_count !== undefined && (
                  <span className="flex items-center gap-1 text-white/90">
                    <MessageCircle className="w-4 h-4 fill-white/20" />
                    {post.comments_count}
                  </span>
                )}
                {post.timestamp && <span className="text-white/60 text-[11px] ml-auto">{post.timestamp}</span>}
              </div>

              <p className="text-xs text-white/90 line-clamp-2 leading-relaxed mb-3">
                {post.caption}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/15 text-xs font-bold text-primary-400">
                <span className="flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5" />
                  View post
                </span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tag Community Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-12 rounded-3xl bg-gradient-to-r from-primary-500/10 via-surface to-pink-500/10 border border-white/10 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left"
      >
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Share Your Sanctuary Experience</h3>
          <p className="text-sm text-muted max-w-xl">
            Tag <span className="text-primary-400 font-semibold">@vibesbnb</span> or use{' '}
            <span className="text-pink-400 font-semibold">#vibesbnb</span> on Instagram to be featured on
            our website and stories!
          </p>
        </div>
        <a
          href={INSTAGRAM_PROFILE.profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary !py-3 px-6 text-sm font-bold rounded-2xl whitespace-nowrap flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
        >
          <Instagram className="w-4 h-4" />
          <span>Visit @{INSTAGRAM_PROFILE.handle}</span>
        </a>
      </motion.div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={() => setSelectedPost(null)}
        >
          <div
            className="relative bg-surface-dark border border-white/15 rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Image */}
            <div className="relative aspect-square md:w-1/2 bg-black flex-shrink-0">
              <Image
                src={selectedPost.media_url}
                alt={selectedPost.caption}
                fill
                className="object-cover"
              />
            </div>

            {/* Modal Content */}
            <div className="p-6 flex flex-col justify-between flex-grow overflow-y-auto">
              <div>
                <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={INSTAGRAM_PROFILE.avatarUrl}
                      alt={INSTAGRAM_PROFILE.handle}
                      className="w-8 h-8 rounded-full border border-white/20 p-0.5 object-contain"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">@{INSTAGRAM_PROFILE.handle}</p>
                      {selectedPost.location && (
                        <p className="text-xs text-muted flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-primary-400" />
                          {selectedPost.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedPost(null)}
                    className="text-gray-400 hover:text-white text-lg font-bold p-1 leading-none"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-sm text-gray-200 mt-4 whitespace-pre-line leading-relaxed">
                  {selectedPost.caption}
                </p>

                <div className="flex items-center gap-4 mt-6 text-xs text-muted">
                  {selectedPost.like_count !== undefined && (
                    <span className="flex items-center gap-1.5 text-rose-400 font-semibold">
                      <Heart className="w-4 h-4 fill-current" />
                      {selectedPost.like_count} likes
                    </span>
                  )}
                  {selectedPost.comments_count !== undefined && (
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 fill-white/20" />
                      {selectedPost.comments_count} comments
                    </span>
                  )}
                  {selectedPost.timestamp && <span>{selectedPost.timestamp}</span>}
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-white/10 flex gap-3">
                <a
                  href={selectedPost.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full btn-primary !py-3 text-center text-xs font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  <Instagram className="w-4 h-4" />
                  <span>View on Instagram</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
