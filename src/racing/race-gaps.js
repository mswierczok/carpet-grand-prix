(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    settings = Object.freeze({ sampleSeconds: 0.05, historySeconds: 90 });
  function create() {
    const cars = new Map();
    function observe(id, distance, time) {
      if (!Number.isFinite(distance) || !Number.isFinite(time)) return;
      let record = cars.get(id);
      if (!record) {
        record = { points: [], head: 0, expiredThrough: -Infinity,
          distance, lastSample: -Infinity, current: null };
        cars.set(id, record);
      }
      if (record.current && time < record.current.time) return;
      record.distance = Math.max(record.distance, distance);
      record.current = { distance: record.distance, time };
      // Retain repeated positions: first arrival measures the gap at a stop,
      // while its last repeated sample brackets the actual departure correctly.
      if (time - record.lastSample + 1e-9 >= settings.sampleSeconds) {
        record.points.push(record.current);
        record.lastSample = time;
      }
      while (record.head < record.points.length - 1 && record.points[record.head].time < time - settings.historySeconds)
        record.expiredThrough = record.points[record.head++].distance;
      if (record.head > 256) {
        record.points = record.points.slice(record.head);
        record.head = 0;
      }
    }
    function crossing(id, distance) {
      const record = cars.get(id);
      if (!record || distance <= record.expiredThrough || distance > record.distance) return null;
      const points = record.points;
      let lo = record.head, hi = points.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (points[mid].distance < distance) lo = mid + 1;
        else hi = mid;
      }
      const end = points[lo] || record.current;
      if (end.distance === distance) return end.time;
      const start = lo > record.head ? points[lo - 1] : null;
      if (!start || end.distance <= start.distance) return null;
      return start.time + (distance - start.distance) / (end.distance - start.distance) * (end.time - start.time);
    }
    return Object.freeze({ observe, crossing });
  }
  A.RaceGaps = Object.freeze({ settings, create });
})();
