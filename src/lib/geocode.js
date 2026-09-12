// Real-world terrain for the contour flyer template, owner request:
// "as close as realistically possible" for a disclosed venue, geocoded
// once (an explicit admin/crew action) rather than fetched live at
// render time, since flyer rendering must stay synchronous and
// deterministic. Never called for a location_tba event -- section 7's
// own rule for this template ("a real coordinate for a location-TBA
// event would be an actual problem, not just a design one") still holds.
//
// Geocoding: Nominatim (OpenStreetMap), free, no key, usage-policy
// compliant at this project's scale (one lookup per explicit action).
// Elevation: OpenTopoData's public srtm30m endpoint (SRTM, ~30m
// resolution), free, no key, single batched request per lookup.

const GRID_SIZE = 9;
const GRID_SPACING_METERS = 150;
const METERS_PER_DEGREE_LAT = 111320;

const USER_AGENT = 'CBR-EDM/1.0 (community EDM noticeboard; contact via cbredm.org)';

/**
 * @param {string|null} venueName
 * @param {string|null} venueAddress
 * @returns {Promise<{ lat: number, lng: number }|null>}
 */
export async function geocodeVenue(venueName, venueAddress) {
  const primary = venueAddress || venueName;
  if (!primary) return null;
  const query = [primary, 'Canberra', 'ACT', 'Australia'].join(', ');

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const results = await response.json();
    const first = results[0];
    if (!first) return null;

    return { lat: Number(first.lat), lng: Number(first.lon) };
  } catch {
    return null;
  }
}

/**
 * A GRID_SIZE x GRID_SIZE grid of real elevation samples centred on
 * (lat, lng), GRID_SPACING_METERS apart -- roughly a 1.2km square, real
 * but regional rather than a hyper-zoomed single point.
 * @param {number} lat
 * @param {number} lng
 * @returns {Promise<{ size: number, spacingMeters: number, values: number[] }|null>}
 */
export async function fetchElevationGrid(lat, lng) {
  const metersPerDegreeLng = METERS_PER_DEGREE_LAT * Math.cos((lat * Math.PI) / 180);
  const half = (GRID_SIZE - 1) / 2;

  const points = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const dLat = ((row - half) * GRID_SPACING_METERS) / METERS_PER_DEGREE_LAT;
      const dLng = ((col - half) * GRID_SPACING_METERS) / metersPerDegreeLng;
      points.push(`${(lat + dLat).toFixed(6)},${(lng + dLng).toFixed(6)}`);
    }
  }

  try {
    const url = `https://api.opentopodata.org/v1/srtm30m?locations=${points.join('|')}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;

    const body = await response.json();
    if (body.status !== 'OK' || !Array.isArray(body.results) || body.results.length !== points.length) return null;

    const values = body.results.map((r) => r.elevation);
    if (values.some((v) => v === null || v === undefined || Number.isNaN(v))) return null;

    return { size: GRID_SIZE, spacingMeters: GRID_SPACING_METERS, values };
  } catch {
    return null;
  }
}

/**
 * Geocodes a venue and fetches its real elevation grid in one call.
 * Returns null (never throws) if either step fails -- the caller falls
 * back to the template's fully synthetic generation, same as any other
 * missing optional field.
 * @param {string|null} venueName
 * @param {string|null} venueAddress
 */
export async function fetchRealTerrain(venueName, venueAddress) {
  const location = await geocodeVenue(venueName, venueAddress);
  if (!location) return null;

  const grid = await fetchElevationGrid(location.lat, location.lng);
  if (!grid) return null;

  return { lat: location.lat, lng: location.lng, grid };
}
