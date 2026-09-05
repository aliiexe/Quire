"use client";

import { type MouseEventHandler, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { QUIRE_DOWNLOADS_URL } from "@/lib/links";

type Platform = "windows" | "macos" | "other";

interface PlatformDownloadLinkProps {
  className: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  showIcon?: boolean;
}

function detectPlatform(): Platform {
  const agent = window.navigator.userAgent.toLowerCase();
  if (agent.includes("windows")) return "windows";
  if (agent.includes("macintosh") || agent.includes("mac os")) return "macos";
  return "other";
}

export function PlatformDownloadLink({ className, onClick, showIcon = false }: PlatformDownloadLinkProps) {
  const [platform, setPlatform] = useState<Platform>("other");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const label = platform === "windows"
    ? "Download for Windows"
    : platform === "macos"
      ? "Download for macOS"
      : "Download Quire";

  return (
    <a
      href={QUIRE_DOWNLOADS_URL}
      className={className}
      onClick={onClick}
      aria-label={`${label} from GitHub Releases`}
    >
      {label} {showIcon ? <Download size={16} strokeWidth={2.3} aria-hidden="true" /> : null}
    </a>
  );
}
