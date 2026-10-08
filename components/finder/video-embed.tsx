"use client";

import { useEffect, useState } from "react";
import { preconnect } from "react-dom";
import { Play } from "lucide-react";

import { getYouTubeEmbedUrl, getYouTubeThumbnail } from "@/lib/youtube";

const EMBED_ORIGIN = "https://www.youtube-nocookie.com";

/**
 * Click-to-load YouTube embed. The real player is ~1 MB of third-party JS plus several
 * connections, so mounting it eagerly shows a blank white frame for seconds and competes with
 * hydration. Here the poster paints immediately from the thumbnail CDN, the YouTube origin is
 * warmed in the background, and the iframe is only created (with autoplay) on user intent.
 * Remount with `key={videoId}` to reset when the video changes.
 */
export function VideoEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    preconnect(EMBED_ORIGIN);
  }, []);

  if (active) {
    return (
      <iframe
        src={getYouTubeEmbedUrl(videoId, { autoplay: true })}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  return (
    <button type="button" className="fx-ew-poster" onClick={() => setActive(true)} aria-label={`Play video: ${title}`}>
      <img src={getYouTubeThumbnail(videoId)} alt="" decoding="async" fetchPriority="high" />
      <span className="fx-ew-play" aria-hidden="true"><Play size={26} fill="currentColor" /></span>
    </button>
  );
}
