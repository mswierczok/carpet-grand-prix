// Normalize only the explicitly authorized main-menu handoff; guard all legacy code.
export const mainEntryTag = '<script src="./src/ui/main-entry.js?v=pov-menu-1"></script>\n';
export function withoutMainEntry(html) {
  if (html.split(mainEntryTag).length !== 2) throw Error("Exakter POV-Einstieg fehlt oder ist doppelt.");
  return html.replace(mainEntryTag, "");
}
