"use client";

import { useEffect } from "react";
import { SERVICE_DETAILS } from "@/lib/serviceDetails";

type Service = { name: string; description: string | null; base_price_cents: number };

export default function ServiceDetailModal({ service, onClose }: { service: Service; onClose: () => void }) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const detail = SERVICE_DETAILS[service.name];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h3>
          {service.name} — ${(service.base_price_cents / 100).toFixed(0)}
        </h3>

        {detail?.summaryTag && <p className="summary-tag">{detail.summaryTag}</p>}

        {detail?.blocks?.map((block) => (
          <div key={block.heading}>
            <p className="room">{block.heading}</p>
            <ul className="chk">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}

        {detail?.paragraphs?.map((p) => (
          <p className="block-p" key={p}>
            {p}
          </p>
        ))}

        {!detail && service.description && <p className="block-p">{service.description}</p>}

        {detail?.footnote && <p className="footnote">{detail.footnote}</p>}
      </div>
    </div>
  );
}
