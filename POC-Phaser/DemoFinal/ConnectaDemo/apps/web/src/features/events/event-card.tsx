import { Tag } from "@/components/ui";
import type { Showcase } from "@/domain/catalog";
import { asset } from "@/lib/assets";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import Link from "next/link";
export function EventCard({ event }: { event: Showcase }) {
  return (
    <Link href={`/events/${event.id}`} className="event-card">
      <div className={`event-art ${event.color}`}>
        {event.id === "senior-showcase" ? (
          <img
            src={asset("assets/maps/exhibition/minimap.png")}
            alt="A top-down view of the exhibition hall"
          />
        ) : (
          <>
            <span className="event-art-shape" />
            <span className="event-art-title">
              {event.color === "green" ? (
                <>
                  Good ideas.
                  <br />
                  Greener futures.
                </>
              ) : (
                <>
                  Built to make
                  <br />a difference.
                </>
              )}
            </span>
            <ArrowUpRight className="event-art-arrow" size={40} />
          </>
        )}
        <Tag tone={event.status === "live" ? "live" : ""}>
          {event.status === "live"
            ? "● Live now"
            : event.status === "ended"
              ? "Gallery open"
              : "Coming up"}
        </Tag>
      </div>
      <div className="event-card-body">
        <p className="eyebrow">{event.category}</p>
        <h3>{event.title}</h3>
        <p className="small row">
          <CalendarDays size={15} />
          {event.date} · {event.time.split(" – ")[0]}
        </p>
        <div className="row between event-card-footer">
          <span className="small row">
            <MapPin size={15} />
            Virtual showcase
          </span>
          <ArrowRight size={19} />
        </div>
      </div>
    </Link>
  );
}
