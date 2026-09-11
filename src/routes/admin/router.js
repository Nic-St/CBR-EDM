import { requireAdmin } from '../../lib/auth.js';
import { handleAdminQueue } from './queue.js';
import {
  handleEventList, handleEventNewForm, handleEventEditForm, handleEventCreate, handleEventUpdate,
  handleEventPublish, handleEventReject, handleEventRemove, handleEventRestore, handleEventDelete,
  handleEventReissueEditLink, handleEventRevokeEditLink,
} from './events.js';
import { handleChangeList, handleChangeApprove, handleChangeReject } from './changes.js';
import { handleContactMessageList, handleContactMessageMarkDone } from './contactMessages.js';
import {
  handleCrewList, handleCrewNewForm, handleCrewEditForm, handleCrewCreate, handleCrewUpdate,
  handleCrewIssueKey, handleCrewRevokeKey,
} from './crews.js';
import { handleHarmReductionList, handleHarmReductionCreate, handleHarmReductionUpdate } from './harmReduction.js';
import { handleStats } from './stats.js';
import { handleFlyerUpload } from './flyerUpload.js';

/**
 * Handles every /admin* and /admin/api* route. Section 10.1: Access
 * protects these paths at the edge, but the Worker independently verifies
 * the JWT and rejects the request if that verification fails, even if
 * Access is misconfigured.
 * @param {Request} request
 * @param {import('../../env.js').Env} env
 */
export async function adminRouter(request, env) {
  const admin = await requireAdmin(request, env);
  if (!admin) {
    return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  }

  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (path === '/admin' && method === 'GET') return handleAdminQueue(request, env, admin);

  if (path === '/admin/events' && method === 'GET') return handleEventList(request, env, admin);
  if (path === '/admin/events/new' && method === 'GET') return handleEventNewForm(request, env, admin);
  if (path === '/admin/events/new' && method === 'POST') return handleEventCreate(request, env, admin);

  const eventEdit = path.match(/^\/admin\/events\/([^/]+)\/edit$/);
  if (eventEdit && method === 'GET') return handleEventEditForm(request, env, admin, eventEdit[1]);
  if (eventEdit && method === 'POST') return handleEventUpdate(request, env, admin, eventEdit[1]);

  const eventAction = path.match(/^\/admin\/events\/([^/]+)\/(publish|reject|remove|restore|delete|reissue-edit-link|revoke-edit-link)$/);
  if (eventAction && method === 'POST') {
    const [, id, action] = eventAction;
    const handlers = {
      publish: handleEventPublish, reject: handleEventReject, remove: handleEventRemove,
      restore: handleEventRestore, delete: handleEventDelete,
      'reissue-edit-link': handleEventReissueEditLink, 'revoke-edit-link': handleEventRevokeEditLink,
    };
    return handlers[action](request, env, admin, id);
  }

  if (path === '/admin/changes' && method === 'GET') return handleChangeList(request, env, admin);
  const changeAction = path.match(/^\/admin\/changes\/([^/]+)\/(approve|reject)$/);
  if (changeAction && method === 'POST') {
    const [, id, action] = changeAction;
    return action === 'approve' ? handleChangeApprove(request, env, admin, id) : handleChangeReject(request, env, admin, id);
  }

  if (path === '/admin/contact-messages' && method === 'GET') return handleContactMessageList(request, env, admin);
  const contactMessageDone = path.match(/^\/admin\/contact-messages\/([^/]+)\/done$/);
  if (contactMessageDone && method === 'POST') return handleContactMessageMarkDone(request, env, admin, contactMessageDone[1]);

  const flyerUpload = path.match(/^\/admin\/api\/events\/([^/]+)\/flyer$/);
  if (flyerUpload && method === 'POST') return handleFlyerUpload(request, env, flyerUpload[1]);

  if (path === '/admin/crews' && method === 'GET') return handleCrewList(request, env, admin);
  if (path === '/admin/crews/new' && method === 'GET') return handleCrewNewForm(request, env, admin);
  if (path === '/admin/crews/new' && method === 'POST') return handleCrewCreate(request, env, admin);

  const crewEdit = path.match(/^\/admin\/crews\/([^/]+)\/edit$/);
  if (crewEdit && method === 'GET') return handleCrewEditForm(request, env, admin, crewEdit[1]);
  if (crewEdit && method === 'POST') return handleCrewUpdate(request, env, admin, crewEdit[1]);

  const crewKeyAction = path.match(/^\/admin\/crews\/([^/]+)\/(issue-key|revoke-key)$/);
  if (crewKeyAction && method === 'POST') {
    const [, id, action] = crewKeyAction;
    return action === 'issue-key' ? handleCrewIssueKey(request, env, admin, id) : handleCrewRevokeKey(request, env, admin, id);
  }

  if (path === '/admin/harm-reduction' && method === 'GET') return handleHarmReductionList(request, env, admin);
  if (path === '/admin/harm-reduction/new' && method === 'POST') return handleHarmReductionCreate(request, env, admin);

  const harmReductionEdit = path.match(/^\/admin\/harm-reduction\/([^/]+)$/);
  if (harmReductionEdit && method === 'POST') return handleHarmReductionUpdate(request, env, admin, harmReductionEdit[1]);

  if (path === '/admin/stats' && method === 'GET') return handleStats(request, env, admin);

  return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
