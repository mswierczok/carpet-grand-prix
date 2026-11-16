(() => {
  "use strict";
  const A = globalThis.CGPArcade,
    data = globalThis.CGPArcadeData,
    tracks = Object.freeze(
      Object.values(data.tracks).sort((a, b) => a.index - b.index),
    );
  function get(id) {
    const track = Object.hasOwn(data.tracks, id) && data.tracks[id];
    if (
      !track ||
      !data.boundaries[id] ||
      (track.bridgeU.length &&
        (data.boundaries[id].kind !== "bridges" || !A.BridgeSurface))
    )
      throw Error(
        "Diese Strecke ist noch nicht für den POV-Fahrmodus freigegeben.",
      );
    return track;
  }
  for (const track of tracks) get(track.id);
  A.TrackCatalog = Object.freeze({ tracks, get, defaultId: "bahrain" });
})();
