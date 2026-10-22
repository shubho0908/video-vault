"use client";

import { useEffect, useState } from "react";
import { preconnect } from "react-dom";
import { Play } from "lucide-react";

import { getYouTubeEmbedUrl, getYouTubeThumbnail } from "@/lib/youtube";

const EMBED_ORIGIN = "https://www.youtube-nocookie.com";

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
