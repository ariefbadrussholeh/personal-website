// A small stand-in for Supabase (PostgREST + Storage) for local smoke tests.
// It implements only what this app uses and mirrors supabase/schema.sql
// (defaults, unique slugs, cascade deletes, Postgres NULL ordering).
// Not a substitute for the real thing: run against a real project before launch.
//
//   node test/fake-supabase.mjs        # listens on :54321
import http from "node:http";

const PORT = Number(process.env.PORT || 54321);
const now = () => new Date().toISOString();

const SCHEMA = {
  posts: {
    pk: "id",
    unique: ["slug"],
    defaults: () => ({
      slug_auto: true, title: "", excerpt: "", content: "", cover: "", tags: [],
      published: false, published_at: null, created_at: now(), updated_at: now(),
    }),
  },
  projects: {
    pk: "id",
    unique: ["slug"],
    defaults: () => ({
      slug_auto: true, title: "", summary: "", content: "", cover: "", tech: [],
      live_url: "", repo_url: "", year: "", role: "", featured: false,
      published: false, published_at: null, created_at: now(), updated_at: now(),
    }),
  },
  albums: {
    pk: "id",
    unique: ["slug"],
    defaults: () => ({
      slug_auto: true, title: "", description: "", cover: "", date: "",
      published: false, published_at: null, created_at: now(), updated_at: now(),
    }),
  },
  photos: {
    pk: "id",
    required: ["album_id", "url"],
    defaults: () => ({ caption: "", width: 0, height: 0, position: 0, created_at: now() }),
    fk: { album_id: "albums" },
  },
  settings: { pk: "key", defaults: () => ({}), required: ["value"] },
  experiences: {
    pk: "id",
    defaults: () => ({
      company: "", role: "", location: "", url: "", icon: "", start_date: "", end_date: "",
      is_current: false, highlights: [], tech: [], created_at: now(), updated_at: now(),
    }),
  },
  messages: {
    pk: "id",
    required: ["name", "email", "message"],
    defaults: () => ({ subject: "", read: false, created_at: now() }),
  },
  comments: {
    pk: "id",
    required: ["post_id", "name", "body"],
    defaults: () => ({ approved: true, visitor: "", created_at: now() }),
    fk: { post_id: "posts" },
  },
  likes: {
    pk: "id",
    required: ["target", "visitor"],
    defaults: () => ({ created_at: now() }),
  },
  page_views: {
    pk: "id",
    required: ["path"],
    defaults: () => ({ referrer: "", device: "", browser: "", country: "", visitor: "", created_at: now() }),
  },
};

const db = Object.fromEntries(Object.keys(SCHEMA).map((t) => [t, []]));
const seq = Object.fromEntries(Object.keys(SCHEMA).map((t) => [t, 0]));
const files = new Map(); // storage objects: name -> { buf, type }

class PgError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/* ----- filtering ----------------------------------------------------- */

function parseList(v) {
  return v.replace(/^\(|\)$/g, "").split(",").map((s) => s.replace(/^"|"$/g, ""));
}

function matcher(col, expr) {
  const dot = expr.indexOf(".");
  const op = expr.slice(0, dot);
  const val = expr.slice(dot + 1);
  const str = (v) => (v === null || v === undefined ? null : String(v));
  switch (op) {
    case "eq": return (r) => str(r[col]) === val;
    case "neq": return (r) => str(r[col]) !== val;
    case "in": { const set = new Set(parseList(val)); return (r) => set.has(str(r[col])); }
    case "cs": { const need = parseList(val.replace(/^\{|\}$/g, "")); return (r) => Array.isArray(r[col]) && need.every((n) => r[col].includes(n)); }
    case "ilike": {
      const re = new RegExp("^" + val.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/[%*]/g, ".*") + "$", "is");
      return (r) => re.test(str(r[col]) ?? "");
    }
    case "is": return (r) => (val === "null" ? r[col] === null : String(r[col]) === val);
    case "gte": return (r) => str(r[col]) !== null && str(r[col]) >= val;
    case "gt": return (r) => str(r[col]) !== null && str(r[col]) > val;
    case "lte": return (r) => str(r[col]) !== null && str(r[col]) <= val;
    case "lt": return (r) => str(r[col]) !== null && str(r[col]) < val;
    default: throw new PgError(400, "PGRST100", `unsupported operator ${op}`);
  }
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function select(table, params) {
  let rows = db[table].filter((row) => {
    for (const [k, v] of params) if (!RESERVED.has(k) && !matcher(k, v)(row)) return false;
    return true;
  });
  const order = params.get("order");
  if (order) {
    const keys = order.split(",").map((o) => {
      const [col, dir = "asc"] = o.split(".");
      return { col, desc: dir === "desc" };
    });
    rows = [...rows].sort((a, b) => {
      for (const { col, desc } of keys) {
        const x = a[col], y = b[col];
        if (x === y) continue;
        // Postgres: NULLs sort as larger than any value.
        if (x === null || x === undefined) return desc ? -1 : 1;
        if (y === null || y === undefined) return desc ? 1 : -1;
        const c = x < y ? -1 : 1;
        return desc ? -c : c;
      }
      return 0;
    });
  }
  const offset = Number(params.get("offset") || 0);
  const limit = params.get("limit") ? Number(params.get("limit")) : undefined;
  select.lastTotal = rows.length;
  select.lastOffset = offset;
  return rows.slice(offset, limit === undefined ? undefined : offset + limit);
}

function project(rows, params) {
  const sel = params.get("select");
  if (!sel || sel === "*") return rows.map((r) => ({ ...r }));
  const cols = sel.split(",").map((c) => c.trim());
  return rows.map((r) => Object.fromEntries(cols.map((c) => [c, r[c]])));
}

/* ----- writes -------------------------------------------------------- */

function checkRow(table, row, ignore) {
  const cfg = SCHEMA[table];
  for (const col of cfg.required || []) {
    if (row[col] === undefined || row[col] === null) {
      throw new PgError(400, "23502", `null value in column "${col}" violates not-null constraint`);
    }
  }
  for (const set of cfg.uniqueSets || []) {
    if (db[table].some((r) => r !== ignore && set.every((c) => r[c] === row[c]))) {
      throw new PgError(409, "23505", `duplicate key value violates unique constraint "${table}_${set.join("_")}_key"`);
    }
  }
  for (const col of cfg.unique || []) {
    if (db[table].some((r) => r !== ignore && r[col] === row[col])) {
      throw new PgError(409, "23505", `duplicate key value violates unique constraint "${table}_${col}_key"`);
    }
  }
  for (const [col, ref] of Object.entries(cfg.fk || {})) {
    if (!db[ref].some((r) => r.id === row[col])) {
      throw new PgError(409, "23503", `insert or update on table "${table}" violates foreign key constraint`);
    }
  }
  for (const [k, v] of Object.entries(row)) {
    if (/_at$/.test(k) && v !== null && Number.isNaN(Date.parse(v))) {
      throw new PgError(400, "22007", `invalid input syntax for type timestamp: "${v}"`);
    }
    if (["tags", "tech"].includes(k) && !Array.isArray(v)) {
      throw new PgError(400, "22P02", `malformed array literal for column "${k}"`);
    }
  }
}

function insert(table, body, params, prefer) {
  const cfg = SCHEMA[table];
  const list = Array.isArray(body) ? body : [body];
  const out = [];
  const merge = /resolution=merge-duplicates/.test(prefer);
  for (const input of list) {
    const existing = merge && db[table].find((r) => r[cfg.pk] === input[cfg.pk]);
    if (existing) {
      const next = { ...existing, ...input };
      checkRow(table, next, existing);
      Object.assign(existing, next);
      out.push(existing);
      continue;
    }
    const row = { ...cfg.defaults(), ...input };
    if (cfg.pk === "id") row.id = ++seq[table];
    checkRow(table, row);
    db[table].push(row);
    out.push(row);
  }
  return out;
}

function update(table, body, params) {
  const targets = select(table, params);
  for (const row of targets) {
    const next = { ...row, ...body };
    checkRow(table, next, row);
    Object.assign(row, next);
  }
  return targets;
}

function remove(table, params) {
  const targets = select(table, params);
  const ids = new Set(targets);
  db[table] = db[table].filter((r) => !ids.has(r));
  if (table === "albums") {
    const gone = new Set(targets.map((a) => a.id));
    db.photos = db.photos.filter((p) => !gone.has(p.album_id));
  }
  if (table === "posts") {
    const gone = new Set(targets.map((a) => a.id));
    db.comments = db.comments.filter((c) => !gone.has(c.post_id));
  }
  return targets;
}

/* ----- http ---------------------------------------------------------- */

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return Buffer.concat(chunks);
}

function send(res, status, body, headers = {}) {
  const isBuf = Buffer.isBuffer(body);
  res.writeHead(status, {
    "Content-Type": isBuf ? headers["Content-Type"] || "application/octet-stream" : "application/json",
    ...headers,
  });
  res.end(body === undefined ? undefined : isBuf ? body : JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const path = url.pathname;
  try {
    /* Storage */
    let m;
    if ((m = /^\/storage\/v1\/object\/public\/uploads\/(.+)$/.exec(path)) && req.method === "GET") {
      const f = files.get(decodeURIComponent(m[1]));
      if (!f) return send(res, 404, { message: "Object not found" });
      return send(res, 200, f.buf, { "Content-Type": f.type });
    }
    if ((m = /^\/storage\/v1\/object\/uploads\/(.+)$/.exec(path)) && req.method === "POST") {
      const name = decodeURIComponent(m[1]);
      if (files.has(name) && req.headers["x-upsert"] !== "true") {
        return send(res, 400, { statusCode: "409", error: "Duplicate", message: "The resource already exists" });
      }
      let buf = await readBody(req);
      let type = req.headers["content-type"] || "application/octet-stream";
      if (type.startsWith("multipart/form-data")) {
        // storage-js sends FormData when given a Blob/File; Buffer goes raw. Handle both.
        const boundary = type.split("boundary=")[1];
        const start = buf.indexOf("\r\n\r\n") + 4;
        const end = buf.lastIndexOf(`\r\n--${boundary}`);
        const head = buf.slice(0, start).toString();
        type = /Content-Type: (.+)\r\n/i.exec(head)?.[1] || "application/octet-stream";
        buf = buf.slice(start, end);
      }
      files.set(name, { buf, type });
      return send(res, 200, { Key: `uploads/${name}`, Id: name });
    }
    if (path === "/storage/v1/object/uploads" && req.method === "DELETE") {
      const { prefixes = [] } = JSON.parse((await readBody(req)).toString() || "{}");
      const gone = prefixes.filter((p) => files.delete(p));
      return send(res, 200, gone.map((name) => ({ name })));
    }

    /* Test helpers */
    if (path === "/__state") {
      return send(res, 200, { files: [...files.keys()], counts: Object.fromEntries(Object.entries(db).map(([k, v]) => [k, v.length])) });
    }

    /* REST */
    if ((m = /^\/rest\/v1\/(\w+)$/.exec(path))) {
      const table = m[1];
      if (!SCHEMA[table]) throw new PgError(404, "42P01", `relation "public.${table}" does not exist`);
      const params = url.searchParams;
      const prefer = req.headers["prefer"] || "";
      const wantsObject = /vnd\.pgrst\.object/.test(req.headers["accept"] || "");
      const wantsRows = /return=representation/.test(prefer);
      let rows;

      if (req.method === "GET" || req.method === "HEAD") {
        rows = project(select(table, params), params);
        const total = select.lastTotal;
        const countHeader = /count=exact/.test(prefer)
          ? { "Content-Range": rows.length ? `${select.lastOffset}-${select.lastOffset + rows.length - 1}/${total}` : `*/${total}` }
          : {};
        if (req.method === "HEAD") {
          res.writeHead(200, { "Content-Type": "application/json", ...countHeader });
          return res.end();
        }
        if (wantsObject) {
          if (rows.length !== 1) throw new PgError(406, "PGRST116", "JSON object requested, multiple (or no) rows returned");
          return send(res, 200, rows[0], countHeader);
        }
        return send(res, 200, rows, countHeader);
      }
      {
        const raw = (await readBody(req)).toString();
        const body = raw ? JSON.parse(raw) : undefined;
        if (req.method === "POST") rows = insert(table, body, params, prefer);
        else if (req.method === "PATCH") rows = update(table, body, params);
        else if (req.method === "DELETE") rows = remove(table, params);
        else throw new PgError(405, "PGRST000", "method not allowed");
        rows = project(rows, params);
        if (!wantsRows) return send(res, req.method === "POST" ? 201 : 204);
      }

      if (wantsObject) {
        if (rows.length !== 1) {
          throw new PgError(406, "PGRST116", "JSON object requested, multiple (or no) rows returned");
        }
        return send(res, req.method === "POST" ? 201 : 200, rows[0]);
      }
      return send(res, req.method === "POST" ? 201 : 200, rows);
    }

    send(res, 404, { message: "not found" });
  } catch (e) {
    if (e instanceof PgError) return send(res, e.status, { code: e.code, message: e.message, details: null, hint: null });
    console.error(e);
    send(res, 500, { code: "XX000", message: String(e.message) });
  }
});

server.listen(PORT, () => console.log(`fake supabase on :${PORT}`));
