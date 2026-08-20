"use client";

import { useEffect, useRef, useState } from "react";
import { driveClock } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import type { Clock } from "@/lib/types";

/** « 1:23.4 » — dixièmes seulement : au dixième près, l'œil suit encore. */
function format(total: number): string {
  const ms = Math.max(0, total);
  const tenths = Math.floor((ms % 1000) / 100);
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60_000) % 60;
  const hours = Math.floor(ms / 3_600_000);

  const pad = (value: number) => String(value).padStart(2, "0");

  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}.${tenths}`;

  return `${minutes}:${pad(seconds)}.${tenths}`;
}

/**
 * Le chronomètre d'un écran, piloté depuis le dashboard.
 *
 * Le temps s'affiche ici aussi, et non plus seulement sur l'écran : un
 * organisateur n'a pas toujours la tribune dans son champ de vision, et
 * appuyer sur Pause sans voir ce qu'on arrête n'inspire rien de bon.
 *
 * Ce n'est pas une seconde horloge pour autant : elle repart de la même origine
 * que l'écran et compte de la même façon. Les deux ne peuvent pas se
 * contredire, puisqu'elles ne mesurent rien — elles affichent.
 */
export function ClockControls({
  displayId,
  eventId,
  clock,
}: {
  displayId: string;
  eventId: string;
  clock: Clock;
}) {
  const [text, setText] = useState(() => format(clock.elapsed_ms));
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!clock.running) {
      setText(format(clock.elapsed_ms));

      return;
    }

    const receivedAt = performance.now();

    const tick = () => {
      setText(format(clock.elapsed_ms + (performance.now() - receivedAt)));
      frame.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [clock]);

  const hidden = (
    <>
      <input type="hidden" name="display_id" value={displayId} />
      <input type="hidden" name="event_id" value={eventId} />
    </>
  );

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="size-2 rounded-full"
          style={{
            background: clock.running
              ? "var(--vsrun-orange)"
              : "var(--muted-foreground)",
            boxShadow: clock.running ? "0 0 8px var(--vsrun-orange)" : "none",
            animation: clock.running
              ? "vsrun-pulse 1.6s ease-in-out infinite"
              : undefined,
          }}
        />

        <span
          className="font-mono text-3xl leading-none font-bold tabular-nums"
          style={{ color: clock.running ? "var(--vsrun-orange)" : undefined }}
        >
          {text}
        </span>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-2">
        <form action={driveClock}>
          {hidden}
          <input type="hidden" name="clock_action" value="countdown" />
          <input type="hidden" name="go_ms" value={5000} />
          <Button size="sm" type="submit">
            Compte à rebours
          </Button>
        </form>

        <form action={driveClock}>
          {hidden}
          <input
            type="hidden"
            name="clock_action"
            value={clock.running ? "pause" : "start"}
          />
          <Button variant="outline" size="sm" type="submit">
            {clock.running ? "Pause" : "Lancer"}
          </Button>
        </form>

        <form action={driveClock}>
          {hidden}
          <input type="hidden" name="clock_action" value="reset" />
          <Button variant="outline" size="sm" type="submit">
            Remise à zéro
          </Button>
        </form>
      </div>
    </div>
  );
}
