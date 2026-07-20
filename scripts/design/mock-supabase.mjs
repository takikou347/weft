// 画面設計書のスクリーンショット撮影用モックSupabase。
// PostgREST / GoTrue / Storage の「本アプリが使う範囲」だけを模倣する。
// データはペルソナ(ユーザー)ごとに「そのユーザーに見える行」を持ち、
// RLS適用後の世界を再現する。本番コードからは一切参照されない。
import http from "node:http";
import { personas, emailToPersona } from "./seed-data.mjs";

const PORT = Number(process.env.MOCK_PORT ?? 54321);

function json(res, status, body, headers = {}) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "*",
    "access-control-allow-methods": "*",
    "access-control-expose-headers": "content-range",
    ...headers,
  });
  res.end(data);
}

function personaFromAuth(req) {
  const auth = req.headers.authorization ?? "";
  const m = auth.match(/^Bearer tok-(\w+)$/);
  return m ? personas[m[1]] : null;
}

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ---- PostgREST風フィルタエンジン --------------------------------------

function parseValue(op, raw) {
  if (op === "is" && raw === "null") return null;
  if (op === "in") {
    return raw
      .replace(/^\(/, "")
      .replace(/\)$/, "")
      .split(",")
      .map((v) => v.replace(/^"|"$/g, ""));
  }
  return raw;
}

function matches(row, col, op, value) {
  const v = row[col];
  switch (op) {
    case "eq":
      return String(v) === String(value);
    case "neq":
      return String(v) !== String(value);
    case "gt":
      return v != null && String(v) > String(value);
    case "gte":
      return v != null && String(v) >= String(value);
    case "lt":
      return v != null && String(v) < String(value);
    case "lte":
      return v != null && String(v) <= String(value);
    case "is":
      return value === null ? v == null : String(v) === String(value);
    case "in":
      return value.some((x) => String(x) === String(v));
    case "ilike": {
      const pat = String(value).replaceAll("*", "").toLowerCase();
      return String(v ?? "").toLowerCase().includes(pat);
    }
    default:
      return true;
  }
}

// item_shares!items 等の埋め込みFK定義
const EMBED_FK = {
  item_shares: { items: "item_id" },
};

function handleRest(req, res, persona, url) {
  const table = url.pathname.replace("/rest/v1/", "");
  let rows = [...(persona.tables[table] ?? [])];

  const select = url.searchParams.get("select") ?? "*";
  const embedMatch = select.match(/(\w+)!inner\(\*\)/);
  const embedTable = embedMatch?.[1];

  // 埋め込み(inner join)
  if (embedTable) {
    const fk = EMBED_FK[table]?.[embedTable];
    const foreign = persona.tables[embedTable] ?? [];
    rows = rows
      .map((r) => {
        const hit = foreign.find((f) => f.id === r[fk]);
        return hit ? { ...r, [embedTable]: hit } : null;
      })
      .filter(Boolean);
  }

  // フィルタ
  const orParams = [];
  for (const [key, raw] of url.searchParams.entries()) {
    if (["select", "order", "limit", "offset"].includes(key)) continue;
    if (key === "or") {
      orParams.push(raw);
      continue;
    }
    const m = raw.match(/^(\w+)\.(.*)$/s);
    if (!m) continue;
    const [, op, valRaw] = m;
    const value = parseValue(op, valRaw);
    if (key.includes(".")) {
      const [emb, col] = key.split(".");
      rows = rows.filter((r) => r[emb] && matches(r[emb], col, op, value));
    } else {
      rows = rows.filter((r) => matches(r, key, op, value));
    }
  }
  for (const orRaw of orParams) {
    const conds = orRaw
      .replace(/^\(/, "")
      .replace(/\)$/, "")
      .split(",")
      .map((c) => c.match(/^([\w.]+)\.(\w+)\.(.*)$/))
      .filter(Boolean);
    rows = rows.filter((r) =>
      conds.some(([, col, op, valRaw]) =>
        matches(r, col, op, parseValue(op, valRaw)),
      ),
    );
  }

  // 並び替え(order=col.desc,col2.asc)
  const orderRaw = url.searchParams.get("order");
  if (orderRaw) {
    const orders = orderRaw.split(",").map((o) => {
      const [col, dir] = o.split(".");
      return { col, desc: dir === "desc" };
    });
    rows.sort((a, b) => {
      for (const { col, desc } of orders) {
        const x = String(a[col] ?? "");
        const y = String(b[col] ?? "");
        if (x !== y) return (x < y ? -1 : 1) * (desc ? -1 : 1);
      }
      return 0;
    });
  }

  const total = rows.length;
  const offset = Number(url.searchParams.get("offset") ?? 0);
  const limit = url.searchParams.get("limit");
  if (offset || limit) {
    rows = rows.slice(offset, limit ? offset + Number(limit) : undefined);
  }

  const countHeader = {
    "content-range": `${offset}-${Math.max(offset + rows.length - 1, 0)}/${total}`,
  };

  if (req.method === "HEAD") {
    res.writeHead(200, {
      "content-type": "application/json",
      "content-range": countHeader["content-range"],
      "access-control-expose-headers": "content-range",
    });
    res.end();
    return;
  }

  const accept = req.headers.accept ?? "";
  if (accept.includes("vnd.pgrst.object")) {
    if (rows.length === 0) {
      json(res, 406, {
        code: "PGRST116",
        message: "JSON object requested, multiple (or no) rows returned",
      });
      return;
    }
    json(res, 200, rows[0], countHeader);
    return;
  }
  json(res, 200, rows, countHeader);
}

// ---- プレースホルダー写真(SVG) ---------------------------------------

const PHOTO_STYLES = {
  ridge: { sky: "#e8e2d0", far: "#9aa88f", near: "#5d6b52", sun: "#d9c27a" },
  stream: { sky: "#dfe4e2", far: "#8fa0a8", near: "#4f6068", sun: "#c9d4cf" },
  letter: { sky: "#f0e9dc", far: "#b8a78c", near: "#8c7a5e", sun: "#e0cfa8" },
};

function photoSvg(name) {
  const s = PHOTO_STYLES[name] ?? PHOTO_STYLES.ridge;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480">
  <rect width="640" height="480" fill="${s.sky}"/>
  <circle cx="500" cy="110" r="52" fill="${s.sun}"/>
  <path d="M0 320 L150 170 L260 300 L390 150 L520 310 L640 220 L640 480 L0 480 Z" fill="${s.far}"/>
  <path d="M0 400 L120 300 L280 410 L430 280 L640 420 L640 480 L0 480 Z" fill="${s.near}"/>
</svg>`;
}

// ---- サーバー ----------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "*",
      "access-control-allow-methods": "*",
    });
    res.end();
    return;
  }

  // ---- Auth (GoTrue) ----
  if (path === "/auth/v1/token") {
    const body = await readBody(req);
    const key = emailToPersona[body.email];
    const persona = key ? personas[key] : null;
    if (!persona || body.password !== persona.password) {
      json(res, 400, {
        code: 400,
        error_code: "invalid_credentials",
        msg: "Invalid login credentials",
      });
      return;
    }
    json(res, 200, {
      access_token: `tok-${key}`,
      token_type: "bearer",
      expires_in: 86400,
      expires_at: Math.floor(Date.now() / 1000) + 86400,
      refresh_token: `rt-${key}`,
      user: persona.user,
    });
    return;
  }
  if (path === "/auth/v1/signup") {
    // 撮影用: 常に「登録済み」を返してエラーパターンを見せる
    json(res, 422, {
      code: 422,
      error_code: "user_already_exists",
      msg: "User already registered",
    });
    return;
  }
  if (path === "/auth/v1/user") {
    const persona = personaFromAuth(req);
    if (!persona) {
      json(res, 401, { code: 401, msg: "invalid claim" });
      return;
    }
    json(res, 200, persona.user);
    return;
  }
  if (path === "/auth/v1/logout") {
    res.writeHead(204);
    res.end();
    return;
  }

  // ---- RPC ----
  if (path.startsWith("/rest/v1/rpc/")) {
    const fn = path.replace("/rest/v1/rpc/", "");
    const persona = personaFromAuth(req);
    const args = await readBody(req);
    const handler = persona?.rpc?.[fn];
    json(res, 200, typeof handler === "function" ? handler(args) : []);
    return;
  }

  // ---- PostgREST ----
  if (path.startsWith("/rest/v1/")) {
    const persona = personaFromAuth(req);
    if (!persona) {
      json(res, 200, []);
      return;
    }
    handleRest(req, res, persona, url);
    return;
  }

  // ---- Storage ----
  if (path.startsWith("/storage/v1/object/sign/photos/") && req.method === "POST") {
    const objectPath = path.replace("/storage/v1/object/sign/", "");
    json(res, 200, { signedURL: `/object/sign/${objectPath}?token=demo` });
    return;
  }
  if (path.startsWith("/storage/v1/object/sign/photos/") && req.method === "GET") {
    const name = path.includes("ph2") ? "stream" : path.includes("ph3") ? "letter" : "ridge";
    res.writeHead(200, { "content-type": "image/svg+xml" });
    res.end(photoSvg(name));
    return;
  }

  json(res, 404, { message: `mock: unhandled ${req.method} ${path}` });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock supabase listening on http://127.0.0.1:${PORT}`);
});
