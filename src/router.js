import { handleHome } from './routes/home.js';
import { handleEventPage, handleEventIcs } from './routes/event.js';
import { handleArchive } from './routes/archive.js';
import { handleHarmReduction } from './routes/harmReduction.js';
import { handleCalendarFeed } from './routes/calendarFeed.js';
import { handleImg } from './routes/img.js';
import { handleGo } from './routes/go.js';
import { handleRobots } from './routes/robots.js';
import { notFound } from './lib/http.js';

/**
 * Simple path-based router. Section 6 lists every route; phase 1 covers the
 * public read-only pages, /img, /go and the calendar feed. Admin and the
 * public-write routes (submit, edit, crew, contact) land in later phases.
 * @param {Request} request
 * @param {import('./env.js').Env} env
 */
export async function router(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/') return handleHome(request, env);
  if (path === '/robots.txt') return handleRobots();
  if (path === '/calendar.ics') return handleCalendarFeed(request, env);
  if (path === '/look-after-each-other') return handleHarmReduction(request, env);
  if (path === '/archive') return handleArchive(request, env);

  const archiveYear = path.match(/^\/archive\/(\d{4})$/);
  if (archiveYear) return handleArchive(request, env, Number(archiveYear[1]));

  const eventIcs = path.match(/^\/e\/([^/]+)\.ics$/);
  if (eventIcs) return handleEventIcs(request, env, eventIcs[1]);

  const eventSlug = path.match(/^\/e\/([^/]+)$/);
  if (eventSlug) return handleEventPage(request, env, eventSlug[1]);

  const imgKey = path.match(/^\/img\/(.+)$/);
  if (imgKey) return handleImg(request, env, imgKey[1]);

  const goEventId = path.match(/^\/go\/([^/]+)$/);
  if (goEventId) return handleGo(request, env, goEventId[1]);

  return env.ASSETS.fetch(request).then((response) => {
    if (response.status !== 404) return response;
    return notFound();
  });
}
