/// <reference path="../pb_data/types.d.ts" />
/**
 * Restaurant Casestudy — server-side rules.
 *
 * Everything in this file runs inside PocketBase, not in the browser. This is
 * where tool permissions are actually enforced: the frontend uses the same
 * answers to decide what to show, but a user editing their own JavaScript
 * cannot change what happens here.
 *
 * Written against PocketBase v0.22.x (the installer pins that version).
 */

// ---------------------------------------------------------------- helpers

/**
 * The DAO returns a Go slice, not a JavaScript array. Array methods like
 * .map() and .forEach() are not reliably available on it, so everything goes
 * through here first and comes back as a real JS array.
 */
function toArray(slice) {
  const out = [];
  if (!slice) return out;
  const n = slice.length || 0;
  for (let i = 0; i < n; i++) out.push(slice[i]);
  return out;
}

/**
 * Wrap a route handler so an unexpected error comes back as a readable
 * message instead of PocketBase's generic 400. Without this, a one-line
 * mistake in here looks identical to a misconfigured server from the browser.
 */
function route(handler) {
  return (c) => {
    try {
      return handler(c);
    } catch (e) {
      const msg = (e && (e.message || e.toString())) || "unknown error";
      try { $app.logger().error("rcs route failed", "error", "" + msg); } catch (_) {}
      return c.json(500, { message: "Server error: " + msg });
    }
  };
}

/** Read the tools collection into a plain array, ordered. */
function loadTools() {
  const records = toArray($app.dao().findRecordsByFilter("tools", "1=1", "position", 200, 0));
  const out = [];
  for (let i = 0; i < records.length; i++) {
    const r = records[i];
    out.push({
      slug: r.getString("slug"),
      title: r.getString("title"),
      icon: r.getString("icon"),
      blurb: r.getString("blurb"),
      position: r.getInt("position"),
      visibility: r.getString("visibility"),
      enabled: r.getBool("enabled"),
      locked_message: r.getString("locked_message"),
    });
  }
  return out;
}

/** Parse a user's per-tool overrides: { "menu": "allow", "sop": "deny" } */
function overridesFor(user) {
  if (!user) return {};
  try {
    const raw = user.get("tool_overrides");
    if (!raw) return {};
    const parsed = typeof raw === "string" ? JSON.parse(raw) : JSON.parse(JSON.stringify(raw));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_) {
    return {};
  }
}

/**
 * Decide what a given user may do with a given tool.
 * Returns { access: "full" | "preview" | "none", reason: string }
 *
 *   full    — may open the tool and save answers
 *   preview — may open and use it, but not save (drives signup)
 *   none    — may not open it at all
 */
function accessFor(tool, user) {
  const plan = user ? user.getString("plan") : "";
  const isStaff = plan === "staff";

  // Staff see everything, always. Useful for support and for your own testing.
  if (isStaff) return { access: "full", reason: "staff" };

  if (user && user.getBool("suspended")) {
    return { access: "none", reason: "Your account is suspended. Please get in touch." };
  }

  if (!tool.enabled) {
    return { access: "none", reason: tool.locked_message || "This tool is temporarily unavailable." };
  }

  // An explicit per-user decision beats the tool's general visibility setting.
  const ov = overridesFor(user)[tool.slug];
  if (ov === "deny") {
    return { access: "none", reason: tool.locked_message || "This tool isn't available on your account." };
  }
  if (ov === "allow") return { access: "full", reason: "granted" };

  switch (tool.visibility) {
    case "public":
      return { access: "full", reason: "public" };

    case "preview":
      return user
        ? { access: "full", reason: "signed in" }
        : { access: "preview", reason: "Create a free account to save your answers." };

    case "login":
      return user
        ? { access: "full", reason: "signed in" }
        : { access: "none", reason: "Sign in to use this tool." };

    case "pro":
      if (!user) return { access: "none", reason: "Sign in with a Pro account to use this tool." };
      if (plan === "pro") {
        const exp = user.getDateTime("plan_expires");
        if (exp && !exp.isZero() && exp.time() < new Date().getTime()) {
          return { access: "none", reason: "Your Pro plan has expired." };
        }
        return { access: "full", reason: "pro" };
      }
      return { access: "none", reason: tool.locked_message || "This tool is part of the Pro plan." };

    case "invite":
      return { access: "none", reason: tool.locked_message || "This tool is invite-only." };

    case "hidden":
    default:
      return { access: "none", reason: "This tool isn't available." };
  }
}

/** The authenticated user for a request, or null. */
function authUser(c) {
  try {
    const info = c.get("authRecord");
    if (!info) return null;
    if (info.collection().name !== "users") return null;
    return info;
  } catch (_) {
    return null;
  }
}

// ---------------------------------------------------------------- routes

/**
 * GET /api/rcs/bootstrap
 * One call that tells the frontend everything it needs to render correctly:
 * who you are, which tools you may use, the editable homepage copy, and any
 * live announcement.
 */
routerAdd("GET", "/api/rcs/bootstrap", route((c) => {
  const user = authUser(c);
  const all = loadTools();
  const tools = [];
  for (let i = 0; i < all.length; i++) {
    const t = all[i];
    const a = accessFor(t, user);
    tools.push({
      slug: t.slug,
      title: t.title,
      icon: t.icon,
      blurb: t.blurb,
      position: t.position,
      visibility: t.visibility,
      enabled: t.enabled,
      access: a.access,
      reason: a.reason,
    });
  }

  // Editable site copy
  const content = {};
  try {
    const rows = toArray($app.dao().findRecordsByFilter("site_content", "1=1", "position", 300, 0));
    for (let i = 0; i < rows.length; i++) {
      content[rows[i].getString("key")] = rows[i].getString("value");
    }
  } catch (_) {}

  // Live announcement for this audience
  let announcement = null;
  try {
    const rows = toArray($app.dao().findRecordsByFilter("announcements", "active = true", "-created", 10, 0));
    const plan = user ? user.getString("plan") : "";
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const aud = r.getString("audience") || "everyone";
      const match =
        aud === "everyone" ||
        (aud === "logged_out" && !user) ||
        (aud === "logged_in" && !!user) ||
        (aud === "free" && plan === "free") ||
        (aud === "pro" && plan === "pro");
      if (match) {
        announcement = {
          message: r.getString("message"),
          link_text: r.getString("link_text"),
          link_url: r.getString("link_url"),
          tone: r.getString("tone") || "info",
        };
        break;
      }
    }
  } catch (_) {}

  let me = null;
  if (user) {
    me = {
      id: user.id,
      email: user.email(),
      name: user.getString("name"),
      restaurant: user.getString("restaurant"),
      city: user.getString("city"),
      plan: user.getString("plan"),
      suspended: user.getBool("suspended"),
      outlet_limit: user.getInt("outlet_limit") || (user.getString("plan") === "free" ? 1 : 999),
    };
  }

  return c.json(200, { user: me, tools: tools, content: content, announcement: announcement });
}));

/**
 * GET /api/rcs/access/:slug
 * The single source of truth for "may this person use this tool".
 * Tool pages call this on load.
 */
routerAdd("GET", "/api/rcs/access/:slug", route((c) => {
  const slug = c.pathParam("slug");
  const user = authUser(c);
  let rec;
  try {
    rec = $app.dao().findFirstRecordByData("tools", "slug", slug);
  } catch (_) {
    return c.json(404, { access: "none", reason: "Unknown tool." });
  }
  const tool = {
    slug: rec.getString("slug"),
    title: rec.getString("title"),
    visibility: rec.getString("visibility"),
    enabled: rec.getBool("enabled"),
    locked_message: rec.getString("locked_message"),
  };
  const a = accessFor(tool, user);
  return c.json(200, { slug: slug, title: tool.title, access: a.access, reason: a.reason });
}));

/**
 * GET /api/rcs/admin/overview   (staff only)
 * Counts and recent activity for the admin dashboard.
 */
routerAdd("GET", "/api/rcs/admin/overview", route((c) => {
  const user = authUser(c);
  if (!user || user.getString("plan") !== "staff") {
    return c.json(403, { message: "Staff only." });
  }

  function count(collection, filter) {
    try { return toArray($app.dao().findRecordsByFilter(collection, filter || "1=1", "", 5000, 0)).length; }
    catch (_) { return 0; }
  }

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().replace("T", " ").slice(0, 19);

  const byTool = {};
  try {
    const evs = toArray($app.dao().findRecordsByFilter(
      "events", `created >= "${since}" && type = "tool_open"`, "-created", 5000, 0));
    for (let i = 0; i < evs.length; i++) {
      const t = evs[i].getString("tool") || "unknown";
      byTool[t] = (byTool[t] || 0) + 1;
    }
  } catch (_) {}

  return c.json(200, {
    users_total: count("users"),
    users_pro: count("users", 'plan = "pro"'),
    users_suspended: count("users", "suspended = true"),
    outlets: count("outlets"),
    worksheets: count("worksheets"),
    leads: count("leads"),
    opens_30d: byTool,
  });
}));

/**
 * GET /api/rcs/admin/users   (staff only)
 * The user list with everything the admin screen needs, including emails,
 * which the default users list rule deliberately hides from normal accounts.
 */
routerAdd("GET", "/api/rcs/admin/users", route((c) => {
  const me = authUser(c);
  if (!me || me.getString("plan") !== "staff") {
    return c.json(403, { message: "Staff only." });
  }
  const q = (c.queryParam("q") || "").trim();
  const filter = q ? `email ~ {:q} || name ~ {:q} || restaurant ~ {:q}` : "1=1";
  const params = q ? { q: q } : {};
  let rows = [];
  try {
    rows = toArray($app.dao().findRecordsByFilter("users", filter, "-created", 500, 0, params));
  } catch (e) {
    return c.json(500, { message: "" + e });
  }
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    items.push({
      id: r.id,
      email: r.email(),
      name: r.getString("name"),
      restaurant: r.getString("restaurant"),
      city: r.getString("city"),
      plan: r.getString("plan"),
      suspended: r.getBool("suspended"),
      tool_overrides: overridesFor(r),
      outlet_limit: r.getInt("outlet_limit"),
      admin_note: r.getString("admin_note"),
      created: r.getString("created"),
      last_seen: r.getString("last_seen"),
    });
  }
  return c.json(200, { items: items });
}));

/**
 * POST /api/rcs/admin/user/:id   (staff only)
 * Update a user's plan, suspension, per-tool overrides, outlet limit or note.
 */
routerAdd("POST", "/api/rcs/admin/user/:id", route((c) => {
  const me = authUser(c);
  if (!me || me.getString("plan") !== "staff") {
    return c.json(403, { message: "Staff only." });
  }
  const id = c.pathParam("id");
  const body = new DynamicModel({
    plan: "", suspended: false, tool_overrides: null,
    outlet_limit: 0, admin_note: "", plan_expires: "",
  });
  c.bind(body);

  let rec;
  try { rec = $app.dao().findRecordById("users", id); }
  catch (_) { return c.json(404, { message: "No such user." }); }

  // A staff member must not be able to lock themselves out by accident.
  if (rec.id === me.id && body.plan && body.plan !== "staff") {
    return c.json(400, { message: "You can't remove your own staff access here." });
  }

  if (body.plan) rec.set("plan", body.plan);
  rec.set("suspended", !!body.suspended);
  if (body.tool_overrides !== null && body.tool_overrides !== undefined) {
    rec.set("tool_overrides", body.tool_overrides);
  }
  if (body.outlet_limit) rec.set("outlet_limit", body.outlet_limit);
  rec.set("admin_note", body.admin_note || "");
  if (body.plan_expires) rec.set("plan_expires", body.plan_expires);

  $app.dao().saveRecord(rec);
  return c.json(200, { ok: true });
}));

/**
 * GET /api/rcs/admin/leads   (staff only)  — with ?format=csv for export
 */
routerAdd("GET", "/api/rcs/admin/leads", route((c) => {
  const me = authUser(c);
  if (!me || me.getString("plan") !== "staff") {
    return c.json(403, { message: "Staff only." });
  }
  let rows = [];
  try { rows = toArray($app.dao().findRecordsByFilter("leads", "1=1", "-created", 5000, 0)); } catch (_) {}
  const items = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    items.push({
      id: r.id, email: r.getString("email"), source: r.getString("source"),
      note: r.getString("note"), created: r.getString("created"),
    });
  }

  if (c.queryParam("format") === "csv") {
    let csv = "email,source,created\n";
    items.forEach((i) => {
      csv += `"${(i.email || "").replace(/"/g, '""')}","${(i.source || "").replace(/"/g, '""')}","${i.created}"\n`;
    });
    c.response().header().set("Content-Type", "text/csv; charset=utf-8");
    c.response().header().set("Content-Disposition", 'attachment; filename="leads.csv"');
    return c.string(200, csv);
  }
  return c.json(200, { items: items });
}));

/**
 * POST /api/rcs/admin/tools   (staff only) — save visibility settings
 * POST /api/rcs/admin/content (staff only) — save homepage copy
 * POST /api/rcs/admin/announcement (staff only)
 */
routerAdd("POST", "/api/rcs/admin/tools", route((c) => {
  const me = authUser(c);
  if (!me || me.getString("plan") !== "staff") return c.json(403, { message: "Staff only." });
  const body = new DynamicModel({ items: [] });
  c.bind(body);
  const items = toArray(body.items);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    try {
      const r = $app.dao().findFirstRecordByData("tools", "slug", it.slug);
      if (it.visibility) r.set("visibility", it.visibility);
      r.set("enabled", !!it.enabled);
      if (it.locked_message !== undefined) r.set("locked_message", it.locked_message || "");
      if (it.blurb !== undefined && it.blurb !== null) r.set("blurb", it.blurb);
      if (it.position !== undefined && it.position !== null) r.set("position", it.position);
      $app.dao().saveRecord(r);
    } catch (_) {}
  }
  return c.json(200, { ok: true });
}));

routerAdd("POST", "/api/rcs/admin/content", route((c) => {
  const me = authUser(c);
  if (!me || me.getString("plan") !== "staff") return c.json(403, { message: "Staff only." });
  const body = new DynamicModel({ items: [] });
  c.bind(body);
  const items = toArray(body.items);
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    try {
      const r = $app.dao().findFirstRecordByData("site_content", "key", it.key);
      r.set("value", it.value === undefined || it.value === null ? "" : "" + it.value);
      $app.dao().saveRecord(r);
    } catch (_) {}
  }
  return c.json(200, { ok: true });
}));

routerAdd("POST", "/api/rcs/admin/announcement", route((c) => {
  const me = authUser(c);
  if (!me || me.getString("plan") !== "staff") return c.json(403, { message: "Staff only." });
  const body = new DynamicModel({
    message: "", link_text: "", link_url: "", tone: "info", active: false, audience: "everyone",
  });
  c.bind(body);

  // One announcement record, reused.
  let rec;
  try {
    const rows = toArray($app.dao().findRecordsByFilter("announcements", "1=1", "-created", 1, 0));
    rec = rows.length ? rows[0] : null;
  } catch (_) { rec = null; }
  if (!rec) {
    const col = $app.dao().findCollectionByNameOrId("announcements");
    rec = new Record(col);
  }
  rec.set("message", body.message || "");
  rec.set("link_text", body.link_text || "");
  rec.set("link_url", body.link_url || "");
  rec.set("tone", body.tone || "info");
  rec.set("active", !!body.active);
  rec.set("audience", body.audience || "everyone");
  $app.dao().saveRecord(rec);
  return c.json(200, { ok: true });
}));

// ---------------------------------------------------------------- guards

/**
 * The real permission gate. A user can call the worksheets API directly with
 * curl, so access is checked here rather than only in the interface.
 */
function guardWorksheet(e) {
  const c = e.httpContext;
  const user = authUser(c);
  if (!user) throw new BadRequestError("Sign in first.");
  if (user.getBool("suspended")) throw new ForbiddenError("Your account is suspended.");

  const slug = e.record.getString("tool");
  let rec;
  try { rec = $app.dao().findFirstRecordByData("tools", "slug", slug); }
  catch (_) { throw new BadRequestError("Unknown tool."); }

  const a = accessFor({
    slug: rec.getString("slug"),
    visibility: rec.getString("visibility"),
    enabled: rec.getBool("enabled"),
    locked_message: rec.getString("locked_message"),
  }, user);

  if (a.access !== "full") throw new ForbiddenError(a.reason || "You don't have access to this tool.");
}

onRecordBeforeCreateRequest((e) => { guardWorksheet(e); }, "worksheets");
onRecordBeforeUpdateRequest((e) => { guardWorksheet(e); }, "worksheets");
onRecordBeforeCreateRequest((e) => { guardWorksheet(e); }, "snapshots");

/** Enforce the outlet limit server-side, not just by hiding the button. */
onRecordBeforeCreateRequest((e) => {
  const user = authUser(e.httpContext);
  if (!user) throw new BadRequestError("Sign in first.");
  if (user.getString("plan") === "staff") return;

  const limit = user.getInt("outlet_limit") || (user.getString("plan") === "pro" ? 999 : 1);
  let existing = 0;
  try {
    existing = toArray($app.dao().findRecordsByFilter(
      "outlets", `user = "${user.id}" && archived != true`, "", 1000, 0
    )).length;
  } catch (_) {}
  if (existing >= limit) {
    throw new ForbiddenError(
      limit === 1
        ? "The free plan covers one outlet. Upgrade to Pro to add more."
        : `You've reached your limit of ${limit} outlets.`
    );
  }
}, "outlets");

/** New signups always start as free, never staff — whatever the request says. */
onRecordBeforeCreateRequest((e) => {
  e.record.set("plan", "free");
  e.record.set("suspended", false);
  e.record.set("tool_overrides", {});
  e.record.set("outlet_limit", 1);
}, "users");

/** Stop a normal user promoting themselves by PATCHing their own record. */
onRecordBeforeUpdateRequest((e) => {
  const c = e.httpContext;
  const user = authUser(c);
  if (!user) return;                                   // admin UI — allow
  if (user.getString("plan") === "staff") return;      // staff — allow

  const original = $app.dao().findRecordById("users", e.record.id);
  ["plan", "suspended", "tool_overrides", "outlet_limit", "plan_expires", "admin_note"].forEach((f) => {
    e.record.set(f, original.get(f));
  });
}, "users");
