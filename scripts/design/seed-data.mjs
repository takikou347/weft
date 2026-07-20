// 画面撮影用のデモデータ。ペルソナごとに「そのユーザーに見える行」を持つ
// (= RLS適用後の世界を手書きで再現)。本番コードからは参照されない。

const T = "u-tsumugi";
const K = "u-koharu";
const KO = "u-kota";
const H = "u-hana";
const M = "u-matsuri";

const ts = (d, t = "09:00:00") => `${d}T${t}+09:00`;

const PROFILES = [
  { id: T, display_name: "つむぎ", avatar_url: null },
  { id: K, display_name: "こはる", avatar_url: null },
  { id: KO, display_name: "こうた", avatar_url: null },
  { id: H, display_name: "はな", avatar_url: null },
];

const CATEGORIES = (uid) =>
  ["食費", "日用品", "交通", "交際", "住まい", "娯楽", "その他", "収入"].map(
    (name, i) => ({
      id: `cat-${uid}-${i}`,
      user_id: uid,
      name,
      position: i + 1,
      created_at: ts("2026-07-01"),
    }),
  );

// ---- スペース -----------------------------------------------------------

const SPACES = {
  per: {
    id: "sp-per",
    type: "personal",
    name: "わたしの帳面",
    parent_space_id: null,
    settings: {},
    created_by: T,
    created_at: ts("2026-07-01"),
    updated_at: ts("2026-07-01"),
  },
  yama: {
    id: "sp-yama",
    type: "group",
    name: "山歩きの会",
    parent_space_id: null,
    settings: { color: "#4b6b3f" },
    created_by: T,
    created_at: ts("2026-07-05"),
    updated_at: ts("2026-07-05"),
  },
  bungudo: {
    id: "sp-bungudo",
    type: "organization",
    name: "文具堂",
    parent_space_id: null,
    settings: { color: "#7d6a3f" },
    created_by: T,
    created_at: ts("2026-07-08"),
    updated_at: ts("2026-07-08"),
  },
  techo: {
    id: "sp-techo",
    type: "project",
    name: "新柄手帳",
    parent_space_id: "sp-bungudo",
    settings: {},
    created_by: T,
    created_at: ts("2026-07-10"),
    updated_at: ts("2026-07-10"),
  },
};

const MEMBERS = [
  { space_id: "sp-per", user_id: T, role: "owner", joined_at: ts("2026-07-01") },
  { space_id: "sp-yama", user_id: T, role: "owner", joined_at: ts("2026-07-05") },
  { space_id: "sp-yama", user_id: K, role: "member", joined_at: ts("2026-07-06") },
  { space_id: "sp-bungudo", user_id: T, role: "owner", joined_at: ts("2026-07-08") },
  { space_id: "sp-bungudo", user_id: KO, role: "member", joined_at: ts("2026-07-09") },
  { space_id: "sp-bungudo", user_id: H, role: "member", joined_at: ts("2026-07-09") },
  { space_id: "sp-techo", user_id: T, role: "owner", joined_at: ts("2026-07-10") },
  { space_id: "sp-techo", user_id: KO, role: "member", joined_at: ts("2026-07-11") },
];

// ---- アイテム -----------------------------------------------------------

const item = (id, type, owner, origin, date, title, body, payload, created = "10:00:00") => ({
  id,
  type,
  owner_id: owner,
  origin_space_id: origin,
  occurred_on: date,
  title,
  body,
  payload,
  created_at: ts(date, created),
  updated_at: ts(date, created),
});

const ITEMS = [
  item("ev1", "event", T, "sp-per", "2026-07-24", "沢渡りの下見", null, {
    all_day: false,
    start_time: "09:00",
    end_time: "15:00",
    place: "奥多摩・軍畑",
    memo: "雨天なら翌週に順延。地下足袋を忘れずに。",
  }),
  item(
    "d1",
    "diary",
    T,
    "sp-per",
    "2026-07-20",
    "山道具の手入れ",
    "梅雨明けの晴れ間に、ザックと靴をベランダに広げて干した。\n泥を落として油を差すと、道具は答えてくれる。次の沢が楽しみになる午後だった。",
    { decoration: { paper: "lined", stamp: "花丸" } },
    "18:30:00",
  ),
  item(
    "d2",
    "diary",
    T,
    "sp-per",
    "2026-07-18",
    "静かな雨の日",
    "一日じゅう雨。窓の外を眺めながら、地図を広げて次の山行の計画を練った。",
    { decoration: { paper: "washi" } },
  ),
  item("ex1", "expense", T, "sp-per", "2026-07-19", "バス往復", null, {
    amount: 1840,
    kind: "expense",
    category: "交通",
  }),
  item("ex2", "expense", T, "sp-per", "2026-07-15", "山の会の打ち上げ", null, {
    amount: 3260,
    kind: "expense",
    category: "食費",
  }),
  item("ex3", "expense", T, "sp-per", "2026-07-10", "七月分の給料", null, {
    amount: 250000,
    kind: "income",
    category: "収入",
  }),
  item("ex4", "expense", T, "sp-per", "2026-07-20", "登山靴の張り替え", null, {
    amount: 12800,
    kind: "expense",
    category: "娯楽",
  }),
  item("t1", "task", T, "sp-per", "2026-07-22", "ザックの腰ベルトを補修する", null, {
    status: "doing",
  }),
  item("ph1", "photo", T, "sp-per", "2026-07-20", "尾根からの眺め", null, {
    path: "u-tsumugi/ph1.jpg",
  }),
  item("ph2", "photo", K, "sp-kper", "2026-07-12", "沢のせせらぎ", null, {
    path: "u-koharu/ph2.jpg",
  }),
  item(
    "kd1",
    "diary",
    K,
    "sp-kper",
    "2026-07-12",
    "はじめての沢歩き",
    "冷たい水に足を入れた瞬間、夏が来たと思った。連れて行ってくれたみんなに感謝。",
    { decoration: { paper: "plain" } },
  ),
  // プロジェクト(新柄手帳)のアイテム
  item("pt1", "task", T, "sp-techo", "2026-07-28", "中紙の紙見本を選定する", null, {
    status: "todo",
    assignee: KO,
  }),
  item("pt2", "task", KO, "sp-techo", "2026-07-24", "表紙の図案おこし", null, {
    status: "doing",
    assignee: T,
  }),
  item(
    "pdoc1",
    "document",
    T,
    "sp-techo",
    "2026-07-17",
    "打合せおぼえ(七月十七日)",
    "・中紙は生成り80g/㎡で進める\n・表紙の題字は活版で試す\n・見本市の反応は上々。九月納品で逆算する",
    {},
  ),
  item("pex1", "expense", T, "sp-techo", "2026-07-16", "見本市への出張", null, {
    amount: 28000,
    kind: "expense",
    category: "交通",
  }),
];

const SHARES = [
  { item_id: "kd1", space_id: "sp-yama", shared_by: K, shared_at: ts("2026-07-12", "20:00:00") },
  { item_id: "ph2", space_id: "sp-yama", shared_by: K, shared_at: ts("2026-07-12", "20:05:00") },
  { item_id: "ev1", space_id: "sp-yama", shared_by: T, shared_at: ts("2026-07-19", "08:00:00") },
  { item_id: "d1", space_id: "sp-yama", shared_by: T, shared_at: ts("2026-07-20", "19:00:00") },
  { item_id: "ph1", space_id: "sp-yama", shared_by: T, shared_at: ts("2026-07-20", "19:01:00") },
  { item_id: "pt1", space_id: "sp-techo", shared_by: T, shared_at: ts("2026-07-14") },
  { item_id: "pt2", space_id: "sp-techo", shared_by: KO, shared_at: ts("2026-07-14") },
  { item_id: "pdoc1", space_id: "sp-techo", shared_by: T, shared_at: ts("2026-07-17") },
  { item_id: "pex1", space_id: "sp-techo", shared_by: T, shared_at: ts("2026-07-16") },
];

const LINKS = [
  { item_id_a: "d1", item_id_b: "ev1", created_by: T, created_at: ts("2026-07-20") },
  { item_id_a: "d1", item_id_b: "ph1", created_by: T, created_at: ts("2026-07-20") },
  { item_id_a: "d1", item_id_b: "ex4", created_by: T, created_at: ts("2026-07-20") },
];

const COMMENTS = [
  {
    id: "c1",
    item_id: "d1",
    space_id: "sp-yama",
    author_id: K,
    body: "手入れの行き届いた道具は、見ていて気持ちがいいですね。",
    created_at: ts("2026-07-20", "19:30:00"),
  },
  {
    id: "c2",
    item_id: "d1",
    space_id: "sp-yama",
    author_id: T,
    body: "ありがとう。次の沢で試すのが楽しみです。",
    created_at: ts("2026-07-20", "19:45:00"),
  },
];

const REACTIONS = [
  { item_id: "d1", space_id: "sp-yama", user_id: K, emoji: "🌸", created_at: ts("2026-07-20") },
  { item_id: "d1", space_id: "sp-yama", user_id: K, emoji: "👏", created_at: ts("2026-07-20") },
];

const INVITATIONS = [
  {
    id: "inv1",
    space_id: "sp-yama",
    token: "demoinvitetoken0001",
    expires_at: ts("2026-07-26", "00:00:00"),
    created_by: T,
    created_at: ts("2026-07-19"),
  },
];

const SETTLEMENTS = [
  {
    id: "s1",
    space_id: "sp-yama",
    event_item_id: null,
    title: "山小屋の宿代",
    payer_id: K,
    amount: 24000,
    participants: [T, K],
    status: "open",
    created_by: K,
    created_at: ts("2026-07-19", "21:00:00"),
    updated_at: ts("2026-07-19", "21:00:00"),
  },
  {
    id: "s2",
    space_id: "sp-yama",
    event_item_id: null,
    title: "貸切バス代",
    payer_id: T,
    amount: 9000,
    participants: [T, K],
    status: "settled",
    created_by: T,
    created_at: ts("2026-07-12"),
    updated_at: ts("2026-07-13"),
  },
];

const NOTIFICATIONS_T = [
  {
    id: "n1",
    user_id: T,
    type: "comment",
    payload: { item_id: "d1", space_id: "sp-yama", actor_id: K },
    read_at: null,
    created_at: ts("2026-07-20", "19:30:00"),
  },
  {
    id: "n2",
    user_id: T,
    type: "reaction",
    payload: { item_id: "d1", space_id: "sp-yama", actor_id: K, emoji: "🌸" },
    read_at: null,
    created_at: ts("2026-07-20", "19:20:00"),
  },
  {
    id: "n3",
    user_id: T,
    type: "shared",
    payload: { item_id: "kd1", space_id: "sp-yama", actor_id: K },
    read_at: ts("2026-07-13"),
    created_at: ts("2026-07-12", "20:00:00"),
  },
  {
    id: "n4",
    user_id: T,
    type: "settlement",
    payload: { settlement_id: "s1", space_id: "sp-yama", actor_id: K },
    read_at: ts("2026-07-20"),
    created_at: ts("2026-07-19", "21:00:00"),
  },
];

const user = (id, email, name) => ({
  id,
  aud: "authenticated",
  role: "authenticated",
  email,
  app_metadata: { provider: "email" },
  user_metadata: { display_name: name },
  created_at: ts("2026-07-01"),
});

const MONTHLY_SUMMARY_T = [
  { category: "娯楽", kind: "expense", total: 12800, entry_count: 1 },
  { category: "食費", kind: "expense", total: 3260, entry_count: 1 },
  { category: "交通", kind: "expense", total: 1840, entry_count: 1 },
  { category: "収入", kind: "income", total: 250000, entry_count: 1 },
];

const invitationPreview = ({ invite_token }) => {
  if (invite_token === "demoinvitetoken0001") {
    return [{ space_name: "山歩きの会", space_type: "group", expired: false }];
  }
  if (invite_token === "expiredtoken00000000") {
    return [{ space_name: "山歩きの会", space_type: "group", expired: true }];
  }
  return [];
};

export const personas = {
  tsumugi: {
    password: "demo-tsumugi",
    user: user(T, "tsumugi@example.com", "つむぎ"),
    tables: {
      profiles: PROFILES,
      spaces: Object.values(SPACES),
      space_members: MEMBERS,
      expense_categories: CATEGORIES(T),
      items: ITEMS,
      item_shares: SHARES,
      links: LINKS,
      comments: COMMENTS,
      reactions: REACTIONS,
      invitations: INVITATIONS,
      settlements: SETTLEMENTS,
      notifications: NOTIFICATIONS_T,
      projects_meta: [
        {
          space_id: "sp-techo",
          status: "active",
          start_on: "2026-07-01",
          end_on: "2026-09-30",
          budget_total: 300000,
          updated_at: ts("2026-07-10"),
        },
      ],
      budgets: [
        { id: "b1", space_id: "sp-techo", category: "交通", planned_amount: 50000, period: null, created_at: ts("2026-07-10") },
        { id: "b2", space_id: "sp-techo", category: "印刷", planned_amount: 120000, period: null, created_at: ts("2026-07-11") },
      ],
    },
    rpc: {
      expense_monthly_summary: ({ target_month }) =>
        String(target_month).startsWith("2026-07") ? MONTHLY_SUMMARY_T : [],
      space_expense_summary: ({ target_space_id }) =>
        target_space_id === "sp-techo"
          ? [{ kind: "expense", total: 28000, entry_count: 1 }]
          : [],
      invitation_preview: invitationPreview,
    },
  },

  koharu: {
    password: "demo-koharu",
    user: user(K, "koharu@example.com", "こはる"),
    tables: {
      profiles: PROFILES,
      spaces: [
        {
          id: "sp-kper",
          type: "personal",
          name: "わたしの帳面",
          parent_space_id: null,
          settings: {},
          created_by: K,
          created_at: ts("2026-07-02"),
          updated_at: ts("2026-07-02"),
        },
        SPACES.yama,
      ],
      space_members: [
        { space_id: "sp-kper", user_id: K, role: "owner", joined_at: ts("2026-07-02") },
        ...MEMBERS.filter((m) => m.space_id === "sp-yama"),
      ],
      expense_categories: CATEGORIES(K),
      items: ITEMS.filter((i) =>
        ["d1", "ev1", "ph1", "ph2", "kd1"].includes(i.id),
      ),
      item_shares: SHARES.filter((s) => s.space_id === "sp-yama"),
      links: [],
      comments: COMMENTS,
      reactions: REACTIONS,
      invitations: [],
      settlements: SETTLEMENTS,
      notifications: [],
      projects_meta: [],
      budgets: [],
    },
    rpc: {
      expense_monthly_summary: () => [],
      space_expense_summary: () => [],
      invitation_preview: invitationPreview,
    },
  },

  matsuri: {
    password: "demo-matsuri",
    user: user(M, "matsuri@example.com", "まつり"),
    tables: {
      profiles: [{ id: M, display_name: "まつり", avatar_url: null }],
      spaces: [
        {
          id: "sp-mper",
          type: "personal",
          name: "わたしの帳面",
          parent_space_id: null,
          settings: {},
          created_by: M,
          created_at: ts("2026-07-20"),
          updated_at: ts("2026-07-20"),
        },
      ],
      space_members: [
        { space_id: "sp-mper", user_id: M, role: "owner", joined_at: ts("2026-07-20") },
      ],
      expense_categories: CATEGORIES(M),
      items: [],
      item_shares: [],
      links: [],
      comments: [],
      reactions: [],
      invitations: [],
      settlements: [],
      notifications: [],
      projects_meta: [],
      budgets: [],
    },
    rpc: {
      expense_monthly_summary: () => [],
      space_expense_summary: () => [],
      invitation_preview: invitationPreview,
    },
  },
};

export const emailToPersona = {
  "tsumugi@example.com": "tsumugi",
  "koharu@example.com": "koharu",
  "matsuri@example.com": "matsuri",
};
