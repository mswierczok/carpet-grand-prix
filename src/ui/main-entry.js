(() => {
  "use strict";
  // The former entry remains available for existing saves, outside the new flow.
  if (new URLSearchParams(location.search).get("legacy") === "1") return;
  location.replace(new URL("./play.html", location.href).href);
})();
