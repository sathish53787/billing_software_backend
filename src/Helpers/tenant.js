/**
 * Multi-tenant helpers (Digy HRMS pattern).
 * Prefer JWT cmpyId for reads/writes; fall back to userId for pre-company signup.
 */

export const getCmpyId = (req) => req.user?.cmpyId || null;

export const getUserId = (req) => req.user?.userId || null;

/** Query filter for tenant-scoped GET/list APIs */
export const tenantFilter = (req) => {
  const cmpyId = getCmpyId(req);
  if (cmpyId) return { company: cmpyId };
  return { userId: getUserId(req) };
};

/** Fields stamped on create for tenant ownership */
export const tenantStamp = (req) => {
  const cmpyId = getCmpyId(req);
  const userId = getUserId(req);
  const stamp = { userId };
  if (cmpyId) stamp.company = cmpyId;
  return stamp;
};

export const normalizeAccessUrl = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
