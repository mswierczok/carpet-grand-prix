// Only the explicitly authorized, optional new renderer branch is excluded
// from the historical Bahrain source check. The old renderer stays byte-guarded.
export function withoutCalendarBranch(source) {
  return source.replace('    if (A.TrackEnvironments?.get(surface.id) && A.CalendarWorld3D)\n      return A.CalendarWorld3D.create(surface, materials);\n','');
}
