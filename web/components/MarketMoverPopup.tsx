"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MARKETMOVER_MARK, marketMoverHref } from "@/lib/marketmover";

const DISMISS_KEY = "f1slam.marketmover.dismissedAt";
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000;
const DELAY_MS = 1500;

/** Home and the flagship Season Simulator (tagged Main in the games catalogue). */
function isPromoPath(pathname: string) {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return path === "/" || path === "/games/season";
}

function dismissedRecently() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    return Number.isFinite(at) && Date.now() - at < DISMISS_MS;
  } catch {
    return false;
  }
}

export default function MarketMoverPopup() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPromoPath(pathname)) {
      setOpen(false);
      return;
    }
    if (dismissedRecently()) return;
    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* private mode — still close */
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="mm-pop-backdrop" onClick={dismiss}>
      <div
        ref={dialogRef}
        className="mm-pop pop"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mm-pop-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="mm-pop-close" onClick={dismiss} aria-label="Dismiss MarketMover">
          ×
        </button>
        <img src={MARKETMOVER_MARK} alt="" width={44} height={44} className="mm-mark" />
        <p id="mm-pop-title" className="mm-pop-copy">
          MarketMover — live prices and model markets in one place. More markets coming.
        </p>
        <div className="mm-pop-actions">
          <a
            className="btn btn-primary"
            href={marketMoverHref("popup")}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
          >
            Open MarketMover
          </a>
          <button type="button" className="btn" onClick={dismiss}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
