// backend/middleware/tenantMiddleware.js
export const requireTenant = (req, res, next) => {
  const user = req.user; // from auth
  if (!user || !user.tenant_id) {
    return res.status(403).json({ error: "Tenant not found for user" });
  }
  req.tenant_id = user.tenant_id;
  next();
};
