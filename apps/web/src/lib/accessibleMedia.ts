/**
 * Media accessibility contract (WCAG 2.2 AA).
 * Any future <video> must include captions; any <audio> must provide a transcript.
 * Prefer using AccessibleMedia wrappers when adding media — do not ship silent video.
 */

export type AccessibleVideoProps = {
  src: string;
  /** Required for WCAG — captions track URL (WebVTT) */
  captionsSrc: string;
  captionsLabel?: string;
  title?: string;
};

export type AccessibleAudioProps = {
  src: string;
  /** Required transcript (page section id or plain text) */
  transcript: string;
  title?: string;
};
