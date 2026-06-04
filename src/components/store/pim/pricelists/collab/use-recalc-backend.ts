"use client";

import { useEffect, useRef } from "react";
import {
  BACKEND_LATENCY_MS,
  computeTargetHash,
  computeTargetValue,
  type RecalcDeps,
} from "../pricelist-recalc";
import type { PricelistsCollab } from "./use-yjs-pricelists";

/** Safety-net poll so a freshly elected leader picks up orphaned requests. */
const BACKEND_POLL_MS = 400;

/**
 * Simulated pricing backend. Exactly one client — the leader, elected as the
 * lowest active awareness id — owns the shared `computed` cache. It drains the
 * request queue, marks targets pending (so every client shows a loading state),
 * waits out a fake server latency, then commits the freshly computed values.
 *
 * Because results are written to the shared collab doc, other clients only ever
 * read the cache; they never compute. If the leader leaves, the next-lowest id
 * takes over and reprocesses any still-queued requests.
 */
export const useRecalcBackend = (collab: PricelistsCollab, deps: RecalcDeps): void => {
  const { backend } = collab;
  const inFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const inFlight = inFlightRef.current;

    const isLeader = (): boolean => {
      const active = backend.getActiveClientIds();
      if (backend.clientId < 0 || active.length === 0) {
        return false;
      }
      return backend.clientId === Math.min(...active);
    };

    const process = () => {
      if (!isLeader()) {
        return;
      }
      const queued = backend.getComputeRequests().filter(([id]) => !inFlight.has(id));
      if (queued.length === 0) {
        return;
      }

      queued.forEach(([id]) => inFlight.add(id));
      backend.markComputedPending(queued.map(([id, hash]) => ({ id, hash })));

      window.setTimeout(() => {
        // Recompute from the latest inputs in case an edit landed mid-flight.
        const results = queued.map(([id]) => ({
          id,
          value: computeTargetValue(id, deps),
          hash: computeTargetHash(id, deps),
        }));
        backend.commitComputed(results);
        backend.clearComputeRequests(queued.map(([id]) => id));
        queued.forEach(([id]) => inFlight.delete(id));
      }, BACKEND_LATENCY_MS);
    };

    const unobserve = backend.observe(process);
    const poll = window.setInterval(process, BACKEND_POLL_MS);
    process();

    return () => {
      unobserve();
      window.clearInterval(poll);
    };
  }, [backend, deps]);
};
