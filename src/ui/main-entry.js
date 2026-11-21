(() => {
  "use strict";
  const archived = new URLSearchParams(location.search).get("legacy") === "1";
  location.replace(new URL(archived ? "./archive.html" : "./play.html", location.href).href);
})();
