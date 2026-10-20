"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * First-party page view counter. No cookies, no third parties. It stays quiet
 * when the browser sends Do Not Track; the server also ignores bots and the admin.
 */
export default function Tracker() {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    if (navigator.doNotTrack === "1") return;
    // document.referrer is only meaningful for the first page of a visit.
    const referrer = first.current ? document.referrer : "";
    first.current = false;
    const payload = JSON.stringify({ path: pathname, referrer });
    const sent = navigator.sendBeacon?.("/api/public/track", new Blob([payload], { type: "application/json" }));
    if (!sent) {
      fetch("/api/public/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }
  }, [pathname]);

  return null;
}
