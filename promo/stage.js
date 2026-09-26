// TaskList promo: every frame is a pure function of time, so render.mjs can
// seek to any t and screenshot. Times below are "base" seconds on a 45 s
// storyboard; window.CUTS can warp them so scene cuts land on music beats.

// ---------------------------------------------------------------------------
// Helpers
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const E = {
  lin: (t) => t,
  out: (t) => 1 - Math.pow(1 - t, 3),
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  back: (t) => {
    const c1 = 1.5, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};
const prog = (t, a, b, e = E.inOut) => e(clamp((t - a) / (b - a)));
/** 0→1 over [a, a+fi], hold, 1→0 over [b-fo, b]. */
const window01 = (t, a, b, fi = 0.3, fo = 0.3) => Math.min(prog(t, a, a + fi, E.out), 1 - prog(t, b - fo, b, E.inOut));
const $ = (sel, root = document) => root.querySelector(sel);
const h = (html) => {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
};

const ICON = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  grip: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2" fill="currentColor"/><circle cx="4.5" cy="12" r="1.2" fill="currentColor"/><circle cx="4.5" cy="18" r="1.2" fill="currentColor"/></svg>',
  done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16.5 9.5"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>',
  sheet: '<svg width="86" height="86" viewBox="0 0 24 24" fill="none"><rect x="4" y="2.5" width="16" height="19" rx="2.5" fill="#1f9d57"/><rect x="7" y="8" width="10" height="9" rx="1" fill="#fff"/><path d="M7 11h10M7 14h10M11 8v9" stroke="#1f9d57" stroke-width="1.2"/></svg>',
};

// ---------------------------------------------------------------------------
// Data
const PEOPLE = { R: { name: 'Rob', color: '#2a78d6' }, B: { name: 'Rebecca', color: '#eb6834' } };
const PCOLOR = { high: 'var(--p-high)', med: 'var(--p-med)', low: 'var(--p-low)' };
const LANES = ['high', 'med', 'low'];
const LANE_LABEL = { high: 'High', med: 'Medium', low: 'Low' };
const TASKS = {
  drain: { t: 'Unclog master bath drain', who: 'R', cat: 'Home Repair' },
  fridge: { t: 'Clean beer fridge', who: 'R', cat: 'Kitchen' },
  mop: { t: 'Mop floors', who: 'B', cat: 'Hire out' },
  grocery: { t: 'Grocery shop', who: 'B', cat: 'Errands' },
  deer: { t: 'Spray for deer', who: 'B', cat: 'Yard' },
  bulbs: { t: 'Change foyer light bulbs', who: 'R', cat: 'Home Repair' },
  walk: { t: 'Walk the dog', who: 'R', cat: 'Pets' },
  weed: { t: 'Weed flower beds', who: 'B', cat: 'Yard' },
  gutter: { t: 'Fix gutter', who: 'B', cat: 'Home Repair' },
  food: { t: 'Pick up dog food', who: 'B', cat: 'Errands' },
};

const O0 = { high: ['drain', 'fridge', 'mop'], med: ['grocery', 'deer', 'bulbs'], low: ['walk', 'weed'] };
const O1 = { ...O0, high: [...O0.high, 'gutter'] }; //                       added
const O2 = { ...O1, high: ['mop', 'drain', 'fridge', 'gutter'] }; //         reordered
const O3 = { high: O2.high, med: ['grocery', 'deer', 'weed', 'bulbs'], low: ['walk'] }; // moved to Medium
const O4 = { ...O3, high: ['mop', 'drain', 'gutter'] }; //                   fridge done
const O5 = { ...O4, low: [] }; //                                             walk deleted
const O6 = { ...O5, low: ['food'] }; //                                       synced from the other phone

const T_TRANS = 0.5;
const ORDERS_A = [[0, O0], [14.9, O1], [18.25, O2], [21.35, O3], [24.5, O4], [30.85, O5], [35.4, O6]];
const ORDERS_B = [[0, O5], [34.0, O6]];

const CARD_Y = 156, DIV = 34, ROW = 54, EMPTY = 44, CARD_X = 16, CARD_W = 358;

function layout(order) {
  let y = 0;
  const rows = {}, divs = {}, empties = {}, idx = {};
  for (const lane of LANES) {
    divs[lane] = y;
    y += DIV;
    order[lane].forEach((id, i) => {
      rows[id] = { y, lane };
      idx[id] = i;
      y += ROW;
    });
    if (!order[lane].length) {
      empties[lane] = y;
      y += EMPTY;
    }
  }
  return { rows, divs, empties, idx, h: y, order };
}
const cy = (L, id) => CARD_Y + L.rows[id].y + ROW / 2;
const L0 = layout(O0), L1 = layout(O1), L2 = layout(O2), L3 = layout(O3), L4 = layout(O4);
const GRIP_X = CARD_X + CARD_W - 8 - 13, CHECK_X = CARD_X + 14 + 10.5;

// ---------------------------------------------------------------------------
// Phone-A choreography (all in base seconds, phone-screen coordinates 390×844)
const DRAGS_A = [
  { id: 'mop', from: 16.7, to: 18.25 },
  { id: 'weed', from: 19.5, to: 21.35 },
  { id: 'walk', from: 29.0, to: 30.85, trash: true },
];
const DROPLINES_A = [
  { from: 17.35, to: 18.25, y: CARD_Y + L1.rows.drain.y },
  { from: 20.55, to: 21.35, y: CARD_Y + L2.rows.bulbs.y },
];
const LANE_OVER_A = [{ lane: 'med', from: 20.3, to: 21.35 }];
const FLASH = [
  ['gutter', 14.9, 16.4],
  ['mop', 18.25, 19.2],
  ['weed', 21.35, 22.6],
  ['food', 35.4, 36.8],
];
const FLASH_B = [['food', 34.0, 35.4]];
const CHECKS = [['fridge', 23.8]];
const TOASTS_A = [
  [14.95, 16.3, 'Task added', false],
  [21.4, 23.0, 'Moved to Medium', true],
  [24.0, 25.7, 'Done', true],
  [30.9, 32.1, 'Task deleted', true],
];
const TOASTS_B = [[34.05, 35.3, 'Task added', false]];

const FAB = [348, 742];
const TAB_X = { tasks: 65, done: 195, reports: 325 };
const TAB_Y = 814;
// Finger keyframes: [t, x, y, down, visible]
const FINGER_A = [
  [9.9, 300, 620, 0, 0],
  [10.1, 300, 620, 0, 1],
  [10.7, ...FAB, 0, 1],
  [10.78, ...FAB, 1, 1],
  [10.95, ...FAB, 0, 1],
  [11.3, 320, 700, 0, 0],
  [13.7, 300, 330, 0, 0],
  [13.85, 300, 330, 0, 1],
  [14.1, 352, 243, 0, 1],
  [14.15, 352, 243, 1, 1],
  [14.3, 352, 243, 0, 1],
  [14.6, 330, 330, 0, 0],
  [15.9, 300, 520, 0, 0],
  [16.05, 300, 520, 0, 1],
  [16.6, GRIP_X, cy(L1, 'mop'), 0, 1],
  [16.7, GRIP_X, cy(L1, 'mop'), 1, 1],
  [17.8, GRIP_X, CARD_Y + L1.rows.drain.y + 8, 1, 1],
  [18.25, GRIP_X, CARD_Y + L1.rows.drain.y + 8, 0, 1],
  [18.9, GRIP_X, cy(L2, 'weed'), 0, 1],
  [19.5, GRIP_X, cy(L2, 'weed'), 1, 1],
  [20.9, GRIP_X, CARD_Y + L2.rows.bulbs.y + 10, 1, 1],
  [21.35, GRIP_X, CARD_Y + L2.rows.bulbs.y + 10, 0, 1],
  [21.8, 300, 560, 0, 0],
  [22.9, 200, 420, 0, 0],
  [23.05, 200, 420, 0, 1],
  [23.6, CHECK_X, cy(L3, 'fridge'), 0, 1],
  [23.7, CHECK_X, cy(L3, 'fridge'), 1, 1],
  [23.85, CHECK_X, cy(L3, 'fridge'), 0, 1],
  [24.3, 120, 420, 0, 0],
  [25.4, 250, 700, 0, 0],
  [25.55, 250, 700, 0, 1],
  [25.95, TAB_X.done, TAB_Y, 0, 1],
  [26.0, TAB_X.done, TAB_Y, 1, 1],
  [26.15, TAB_X.done, TAB_Y, 0, 1],
  [26.5, 230, 700, 0, 0],
  [27.3, 150, 700, 0, 0],
  [27.45, 150, 700, 0, 1],
  [27.8, TAB_X.tasks, TAB_Y, 0, 1],
  [27.85, TAB_X.tasks, TAB_Y, 1, 1],
  [28.0, TAB_X.tasks, TAB_Y, 0, 1],
  [28.4, 250, 600, 0, 1],
  [28.9, GRIP_X, cy(L4, 'walk'), 0, 1],
  [29.0, GRIP_X, cy(L4, 'walk'), 1, 1],
  [30.2, 215, 800, 1, 1],
  [30.85, 215, 800, 0, 1],
  [31.2, 250, 700, 0, 0],
];
const TAPS_A = [10.8, 14.18, 23.75, 26.02, 27.88];

// Add sheet
const SHEET_OPEN = [10.95, 11.45], SHEET_CLOSE = [14.3, 14.8];
const TYPE = [11.6, 13.65];
const TYPED = 'Fix gutter @Rebecca #Home !high';

// Screens and tabs
const SCREEN_DONE = [26.1, 28.0];
const SCREEN_REPORTS_AT = 37.3;
const TRASH_OVER_AT = 30.05;

// Captions: [in, out, title, sub]
const CAPTIONS = [
  [4.3, 9.8, 'Everything to do,<br>ranked by priority.', ''],
  [10.1, 15.8, 'Add in seconds.', 'Type <em>@name  #category  !priority</em>'],
  [16.1, 22.8, 'Drag to reorder', 'or move it to another priority'],
  [23.1, 27.8, 'Check it off.', 'Finished tasks move to Done'],
  [28.1, 31.8, 'Drag to delete.', 'Undo is always one tap away'],
  [32.1, 36.8, 'Shared between you.', 'Synced to your own Google Sheet'],
  [37.1, 40.8, 'See who’s doing what.', 'Simple reports, built in'],
];

// ---------------------------------------------------------------------------
// DOM
const avatar = (who, cls = '') =>
  who === 'both'
    ? `<span class="av-both"><span class="av ${cls}" style="background:${PEOPLE.R.color}">R</span><span class="av ${cls}" style="background:${PEOPLE.B.color}">R</span></span>`
    : `<span class="av ${cls}" style="background:${PEOPLE[who].color}">${PEOPLE[who].name[0]}</span>`;

function statusBar() {
  return `<div class="status"><span>9:41</span><span class="icons"><span class="bars"><i style="height:4px"></i><i style="height:6px"></i><i style="height:8px"></i><i style="height:11px"></i></span><span class="bat"></span></span></div>`;
}

function tabBar() {
  return `<div class="tabs">
    <div class="tb" data-tab="tasks">${ICON.list}Tasks</div>
    <div class="tb" data-tab="done">${ICON.done}Done</div>
    <div class="tb" data-tab="reports">${ICON.chart}Reports</div>
  </div><div class="homebar"></div>`;
}

/** A Tasks screen with an animated ranked list. */
class ListView {
  constructor(root, me, orders, opts = {}) {
    this.orders = orders;
    this.opts = opts;
    this.el = h(`<div class="scr scr-tasks">
      ${statusBar()}
      <div class="hdr"><h1>Tasks</h1>${avatar(me, 'lg')}</div>
      <div class="seg2"><span>Mine</span><span class="on">Everyone</span></div>
      <div class="card"></div>
    </div>`);
    root.appendChild(this.el);
    this.card = $('.card', this.el);
    this.card.style.top = CARD_Y + 'px';
    this.lanebg = {};
    this.divs = {};
    this.empties = {};
    for (const lane of LANES) {
      this.lanebg[lane] = this.card.appendChild(h(`<div class="lanebg"></div>`));
      this.divs[lane] = this.card.appendChild(
        h(`<div class="divr"><span class="sw" style="background:${PCOLOR[lane]}"></span>${LANE_LABEL[lane]}<span class="ct"></span></div>`),
      );
      this.empties[lane] = this.card.appendChild(h(`<div class="empty-row">No ${LANE_LABEL[lane].toLowerCase()} priority tasks</div>`));
    }
    this.rows = {};
    for (const [id, task] of Object.entries(TASKS)) {
      const r = h(`<div class="row">
        <span class="flash"></span><span class="sep"></span><span class="rail"></span>
        <span class="chk">${ICON.check}</span>
        <div class="txt"><div class="ttl">${task.t}<span class="strike"></span></div><div class="meta">${task.cat}</div></div>
        ${avatar(task.who)}<span class="grip">${ICON.grip}</span>
      </div>`);
      this.card.appendChild(r);
      this.rows[id] = r;
    }
    this.dropline = this.el.appendChild(h(`<div class="dropline"></div>`));
    this.ghost = this.el.appendChild(h(`<div class="ghost"><span class="rail"></span><span class="gt"></span></div>`));
  }

  state(t) {
    let k = 0;
    for (let i = 0; i < this.orders.length; i++) if (this.orders[i][0] <= t) k = i;
    const [start, order] = this.orders[k];
    const N = layout(order);
    if (k > 0 && t < start + T_TRANS) {
      return { P: layout(this.orders[k - 1][1]), N, q: E.inOut((t - start) / T_TRANS) };
    }
    return { P: N, N, q: 1 };
  }

  render(t, intro = 1) {
    const { P, N, q } = this.state(t);
    const o = this.opts;
    let order = 0;
    const stagger = (i) => (intro >= 1 ? 1 : E.out(clamp(intro * 6 - i * 0.35)));

    this.card.style.height = lerp(P.h, N.h, q) + 'px';
    for (const lane of LANES) {
      const d = this.divs[lane];
      const y = lerp(P.divs[lane], N.divs[lane], q);
      const s = stagger(order++);
      d.style.transform = `translateY(${y + (1 - s) * 14}px)`;
      d.style.opacity = s;
      $('.ct', d).textContent = (q > 0.5 ? N : P).order[lane].length;
      const over = (o.laneOver || []).some((w) => w.lane === lane && t >= w.from && t < w.to);
      d.classList.toggle('over', over);
      // Lane highlight (the whole group) while dragging over it or in the overview pulse.
      const nextDiv = LANES.indexOf(lane) < 2 ? N.divs[LANES[LANES.indexOf(lane) + 1]] : N.h;
      const bg = this.lanebg[lane];
      bg.style.top = N.divs[lane] + 'px';
      bg.style.height = nextDiv - N.divs[lane] + 'px';
      const pulse = (o.pulses || []).reduce((m, [ln, a, b]) => (ln === lane ? Math.max(m, window01(t, a, b, 0.25, 0.35)) : m), 0);
      bg.style.opacity = over ? 0.9 : pulse * 0.9;

      const em = this.empties[lane];
      const eShown = N.empties[lane] !== undefined, eWas = P.empties[lane] !== undefined;
      em.style.opacity = eShown ? (eWas ? 1 : q) : eWas ? 1 - q : 0;
      em.style.transform = `translateY(${eShown ? N.empties[lane] : P.empties[lane] ?? 0}px)`;
    }

    for (const [id, r] of Object.entries(this.rows)) {
      const a = P.rows[id], b = N.rows[id];
      let y = 0, op = 0, dx = 0;
      if (a && b) {
        y = lerp(a.y, b.y, q);
        op = 1;
      } else if (b) {
        y = b.y;
        op = q;
        dx = (1 - q) * 24;
      } else if (a) {
        y = a.y;
        op = 1 - q;
      }
      const lane = (b ?? a)?.lane;
      const i = (b ? N : P).idx[id] ?? 0;
      if (op > 0) {
        const s = stagger(order++);
        y += (1 - s) * 14;
        op *= s;
      }
      const drag = (o.drags || []).find((d) => d.id === id && t >= d.from && t < d.to);
      r.style.transform = `translate(${dx}px, ${y}px)`;
      r.style.opacity = op * (drag ? 0.3 : 1);
      r.style.visibility = op > 0 ? 'visible' : 'hidden';
      $('.rail', r).style.background = lane ? PCOLOR[lane] : 'transparent';
      $('.sep', r).style.display = i > 0 ? 'block' : 'none';
      const flash = (o.flash || []).reduce((m, [fid, fa, fb]) => (fid === id ? Math.max(m, window01(t, fa, fb, 0.15, 0.6)) : m), 0);
      $('.flash', r).style.opacity = flash;
      const chk = (o.checks || []).find(([cid]) => cid === id);
      const cp = chk ? prog(t, chk[1], chk[1] + 0.25, E.back) : 0;
      const c = $('.chk', r);
      c.style.background = cp > 0 ? 'var(--accent)' : 'transparent';
      c.style.borderColor = cp > 0 ? 'var(--accent)' : 'var(--line-strong)';
      c.style.transform = `scale(${cp > 0 ? 0.8 + 0.2 * cp : 1})`;
      $('svg', c).style.opacity = cp;
      const strike = chk ? prog(t, chk[1] + 0.1, chk[1] + 0.45) : 0;
      $('.strike', r).style.width = strike * 100 + '%';
      $('.ttl', r).style.color = strike > 0.5 ? 'var(--text-3)' : '';
    }
  }

  renderDrag(t, finger) {
    const d = (this.opts.drags || []).find((x) => t >= x.from && t < x.to);
    const g = this.ghost;
    if (!d) {
      g.style.opacity = 0;
    } else {
      const task = TASKS[d.id];
      const lift = prog(t, d.from, d.from + 0.18, E.out);
      $('.gt', g).textContent = task.t;
      const overTrash = d.trash && t >= TRASH_OVER_AT;
      const lane = (this.opts.laneOver || []).find((w) => t >= w.from && t < w.to)?.lane;
      const src = this.state(d.from).N.rows[d.id].lane;
      $('.rail', g).style.background = PCOLOR[lane ?? src];
      g.style.width = CARD_W + 'px';
      g.style.left = CARD_X + Math.max(-24, Math.min(24, finger.x - GRIP_X)) + 'px';
      g.style.top = finger.y - 64 * lift - 25 + 'px';
      g.style.opacity = lift * (overTrash ? 0.8 : 1);
      g.style.boxShadow = overTrash ? '0 0 0 2px var(--danger), 0 14px 40px rgb(16 16 20 / 0.2)' : '';
    }
    const dl = (this.opts.droplines || []).find((x) => t >= x.from && t < x.to);
    this.dropline.style.opacity = dl ? 1 : 0;
    if (dl) this.dropline.style.top = CARD_X + dl.y - CARD_X - 1.5 + 'px';
  }
}

function toastEl(root) {
  return root.appendChild(h(`<div class="toast"><span class="tt"></span><u>Undo</u></div>`));
}
function renderToast(el, list, t) {
  const cur = list.find(([a, b]) => t >= a && t < b);
  if (!cur) {
    el.style.opacity = 0;
    return;
  }
  const [a, b, text, undo] = cur;
  const v = window01(t, a, b, 0.2, 0.25);
  $('.tt', el).textContent = text;
  $('u', el).style.display = undo ? 'inline' : 'none';
  el.style.opacity = v;
  el.style.transform = `translateX(-50%) translateY(${(1 - v) * 10}px)`;
}

function fingerAt(keys, t) {
  if (t <= keys[0][0]) return { x: keys[0][1], y: keys[0][2], down: 0, vis: keys[0][4] };
  for (let i = 0; i < keys.length - 1; i++) {
    const [ta, xa, ya, da, va] = keys[i];
    const [tb, xb, yb, , vb] = keys[i + 1];
    if (t >= ta && t < tb) {
      const p = E.inOut((t - ta) / (tb - ta));
      return { x: lerp(xa, xb, p), y: lerp(ya, yb, p), down: da, vis: lerp(va, vb, clamp((t - ta) / Math.min(0.15, tb - ta))) };
    }
  }
  const k = keys[keys.length - 1];
  return { x: k[1], y: k[2], down: 0, vis: k[4] };
}

// ---------------------------------------------------------------------------
// Build
const stage = $('#stage');

const intro = stage.appendChild(
  h(`<div class="hero" id="intro">
    <div class="mark"><img src="../public/icons/icon-512.png" alt=""></div>
    <h1>${'TaskList'.split('').map((c) => `<span>${c}</span>`).join('')}</h1>
    <p>Your household, on one list.</p>
  </div>`),
);
const outro = stage.appendChild(
  h(`<div class="hero" id="outro">
    <div class="mark"><img src="../public/icons/icon-512.png" alt=""></div>
    <h1>TaskList</h1>
    <p>Your household, on one list.</p>
    <div class="url">robh0369.github.io/TaskList</div>
    <div class="small">Open it on your phone, then tap Install</div>
  </div>`),
);
const caption = stage.appendChild(h(`<div id="caption"></div>`));
const caps = CAPTIONS.map(([, , title, sub]) => caption.appendChild(h(`<div class="cap"><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>`)));

function makePhone(label, dotColor) {
  const p = stage.appendChild(
    h(`<div class="phone"><div class="body"></div><div class="screen"></div><div class="notch"></div>
      <div class="phone-label"><i style="background:${dotColor}"></i>${label}</div></div>`),
  );
  return { el: p, screen: $('.screen', p), label: $('.phone-label', p) };
}

// Phone A (Rob)
const A = makePhone('Rob’s phone', PEOPLE.R.color);
const listA = new ListView(A.screen, 'R', ORDERS_A, {
  drags: DRAGS_A,
  droplines: DROPLINES_A,
  laneOver: LANE_OVER_A,
  flash: FLASH,
  checks: CHECKS,
  pulses: [['high', 7.0, 7.9], ['med', 7.8, 8.7], ['low', 8.6, 9.5]],
});
const doneScr = A.screen.appendChild(
  h(`<div class="scr" style="background:var(--bg)">${statusBar()}
    <div class="hdr"><h1>Done</h1>${avatar('R', 'lg')}</div>
    <div class="seg2"><span class="on">Mine</span><span>Everyone</span></div>
    <div class="sec-h" style="top:166px"><span>Today</span><span>1</span></div>
    <div class="card" style="top:188px;height:56px">
      <div class="row" style="transform:none"><span class="rail" style="background:transparent"></span>
        <span class="chk" style="background:var(--accent);border-color:var(--accent)">${ICON.check.replace('<svg', '<svg style="opacity:1"')}</span>
        <div class="txt"><div class="ttl" style="color:var(--text-3);text-decoration:line-through">Clean beer fridge</div><div class="meta">Kitchen</div></div>${avatar('R')}</div>
    </div>
    <div class="sec-h" style="top:268px"><span>Yesterday</span><span>2</span></div>
    <div class="card" style="top:290px;height:110px">
      <div class="row" style="transform:none"><span class="chk" style="background:var(--accent);border-color:var(--accent)">${ICON.check.replace('<svg', '<svg style="opacity:1"')}</span>
        <div class="txt"><div class="ttl" style="color:var(--text-3);text-decoration:line-through">Pressure wash driveway</div><div class="meta">Yard</div></div>${avatar('R')}</div>
      <div class="row" style="transform:translateY(54px)"><span class="sep"></span><span class="chk" style="background:var(--accent);border-color:var(--accent)">${ICON.check.replace('<svg', '<svg style="opacity:1"')}</span>
        <div class="txt"><div class="ttl" style="color:var(--text-3);text-decoration:line-through">Change light bulbs</div><div class="meta">Home Repair</div></div>${avatar('R')}</div>
    </div>
  </div>`),
);

const WEEKS = [[5, 4], [7, 6], [6, 7], [8, 7], [6, 8], [7, 9]];
const reportsScr = A.screen.appendChild(
  h(`<div class="scr" style="background:var(--bg)">${statusBar()}
    <div class="hdr"><h1>Reports</h1>${avatar('R', 'lg')}</div>
    <div class="seg2"><span>Week</span><span class="on">Month</span><span>90 days</span></div>
    <div class="stats">
      <div class="stat"><div class="l">Completed</div><div class="v" data-n="42">0</div></div>
      <div class="stat"><div class="l">Added</div><div class="v" data-n="39">0</div></div>
      <div class="stat"><div class="l">Open</div><div class="v" data-n="17">0</div></div>
    </div>
    <div class="rcard" style="top:250px">
      <h3>Workload split</h3><div class="sub">Tasks completed, last 30 days</div>
      <div class="split"><i class="sa" style="background:${PEOPLE.R.color}"></i><i class="sb" style="background:${PEOPLE.B.color}"></i></div>
      <div class="srow"><span class="sq" style="background:${PEOPLE.R.color}"></span>Rob<span class="n na">0</span><span class="pc pa">0%</span></div>
      <div class="srow"><span class="sq" style="background:${PEOPLE.B.color}"></span>Rebecca<span class="n nb">0</span><span class="pc pb">0%</span></div>
    </div>
    <div class="rcard" style="top:434px">
      <h3>Added vs done per week</h3><div class="sub">When done keeps up with added, the list isn't growing.</div>
      <div class="legend"><span><i style="background:var(--chart-muted)"></i>Added</span><span><i style="background:var(--seq)"></i>Done</span></div>
      <svg class="wk" viewBox="0 0 326 150" width="326" height="150">
        ${[0, 1, 2, 3, 4].map((k) => `<line x1="20" x2="326" y1="${10 + k * 30}" y2="${10 + k * 30}" stroke="var(--chart-grid)"/>`).join('')}
        ${[0, 2, 4, 6, 8].map((v, k) => `<text x="12" y="${130 - k * 30 + 4}" font-size="10" fill="var(--text-3)" text-anchor="end">${v}</text>`).join('')}
        ${WEEKS.map((_, i) => `<rect class="ba" data-i="${i}" x="${36 + i * 49}" width="16" rx="3" fill="var(--chart-muted)"/><rect class="bd" data-i="${i}" x="${54 + i * 49}" width="16" rx="3" fill="var(--seq)"/>`).join('')}
        ${WEEKS.map((_, i) => `<text x="${53 + i * 49}" y="146" font-size="10" fill="var(--text-3)" text-anchor="middle">${i === 5 ? 'This wk' : ['Aug 24', 'Aug 31', 'Sep 7', 'Sep 14', 'Sep 21'][i]}</text>`).join('')}
      </svg>
    </div>
  </div>`),
);

// Shared chrome on phone A
A.screen.appendChild(h(`<div class="fab">${ICON.plus}</div>`));
A.screen.insertAdjacentHTML('beforeend', tabBar());
const trash = A.screen.appendChild(h(`<div class="trash">${ICON.trash}<span class="tl">Drag here to delete</span></div>`));
const toastA = toastEl(A.screen);
const scrim = A.screen.appendChild(h(`<div class="scrim"></div>`));
const sheet = A.screen.appendChild(
  h(`<div class="sheet">
    <div class="grab"></div>
    <div class="sh"><span class="x">×</span><span>New task</span><span class="add">Add</span></div>
    <div class="fld"><div class="input"></div><div class="hint"></div></div>
    <div class="lbl">Who</div>
    <div class="chips">
      <span class="chip" data-w="R">${avatar('R')} Rob</span>
      <span class="chip" data-w="B">${avatar('B')} Rebecca</span>
      <span class="chip" data-w="both">Both</span>
      <span class="chip" data-w="">Anyone</span>
    </div>
    <div class="lbl">Details</div>
    <div class="fld" style="padding:10px 12px">
      <div style="font-size:11.5px;color:var(--text-3);margin-bottom:6px">Priority</div>
      <div class="pseg"><span data-p="high">High</span><span data-p="med">Medium</span><span data-p="low">Low</span></div>
      <div style="font-size:11.5px;color:var(--text-3);margin:12px 0 4px">Category</div>
      <div class="catv">None</div>
    </div>
  </div>`),
);
const fingerA = A.screen.appendChild(h(`<div class="finger"></div>`));
const rippleA = A.screen.appendChild(h(`<div class="ripple"></div>`));

// Phone B (Rebecca), for the sync scene
const B = makePhone('Rebecca’s phone', PEOPLE.B.color);
const listB = new ListView(B.screen, 'B', ORDERS_B, { flash: FLASH_B });
B.screen.appendChild(h(`<div class="fab">${ICON.plus}</div>`));
B.screen.insertAdjacentHTML('beforeend', tabBar());
const toastB = toastEl(B.screen);
[...B.screen.querySelectorAll('.tb')].forEach((tb) => tb.classList.toggle('on', tb.dataset.tab === 'tasks'));

const sheetIcon = stage.appendChild(h(`<div class="sheeticon">${ICON.sheet}<div class="lbl2">Your Google Sheet</div></div>`));
const pulses = [0, 1, 2].map(() => stage.appendChild(h(`<div class="pulse"></div>`)));

// ---------------------------------------------------------------------------
// Render
const PHONE_W = 414, PHONE_H = 868;
const CENTER = { x: (1080 - PHONE_W * 1.78) / 2, y: 340, s: 1.78 };
const SYNC_A = { x: 36, y: 700, s: 1.06 };
const SYNC_B = { x: 1080 - 36 - PHONE_W * 1.06, y: 700, s: 1.06 };

function place(p, pos, opacity = 1) {
  p.el.style.transform = `translate(${pos.x}px, ${pos.y}px) scale(${pos.s})`;
  p.el.style.opacity = opacity;
  p.el.style.visibility = opacity > 0.001 ? 'visible' : 'hidden';
}
const mix = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), s: lerp(a.s, b.s, p) });

function renderBase(t) {
  // Intro
  const inMark = prog(t, 0.2, 1.1, E.back);
  const introOut = prog(t, 3.4, 4.1);
  intro.style.opacity = 1 - introOut;
  intro.style.transform = `translateY(${-introOut * 160}px)`;
  $('.mark', intro).style.transform = `scale(${0.4 + 0.6 * inMark}) rotate(${(1 - inMark) * -8}deg)`;
  $('.mark', intro).style.opacity = clamp(inMark * 1.5);
  [...intro.querySelectorAll('h1 span')].forEach((s, i) => {
    const p = prog(t, 0.75 + i * 0.07, 1.25 + i * 0.07, E.out);
    s.style.opacity = p;
    s.style.transform = `translateY(${(1 - p) * 40}px)`;
  });
  const tag = prog(t, 1.5, 2.1, E.out);
  $('p', intro).style.opacity = tag;
  $('p', intro).style.transform = `translateY(${(1 - tag) * 20}px)`;

  // Captions
  caps.forEach((c, i) => {
    const [a, b] = CAPTIONS[i];
    const v = window01(t, a, b, 0.45, 0.3);
    c.style.opacity = v;
    c.style.transform = `translateY(${(1 - v) * 24}px)`;
  });

  // Phone A position
  let posA = { ...CENTER, y: 1960 };
  let opA = 1;
  if (t >= 3.8) posA = mix({ ...CENTER, y: 1960 }, CENTER, prog(t, 3.8, 4.9, E.out));
  if (t >= 32.0) posA = mix(CENTER, SYNC_A, prog(t, 32.0, 32.9));
  if (t >= 36.8) posA = mix(SYNC_A, CENTER, prog(t, 36.8, 37.6));
  if (t >= 41.0) {
    const p = prog(t, 41.0, 41.9);
    posA = { ...CENTER, y: CENTER.y + p * 240, s: CENTER.s * (1 - 0.08 * p) };
    opA = 1 - p;
  }
  place(A, posA, opA);
  A.label.style.opacity = window01(t, 32.5, 37.0, 0.4, 0.3);

  // Phone B
  const inB = prog(t, 32.3, 33.2, E.out), outB = prog(t, 36.4, 37.0);
  place(B, { ...SYNC_B, x: lerp(1100, SYNC_B.x, inB) + outB * 600 }, t < 32.3 || t > 37 ? 0 : 1);
  B.label.style.opacity = window01(t, 32.6, 36.9, 0.4, 0.3);

  // Sync icon and pulses
  const iconV = window01(t, 32.7, 36.8, 0.4, 0.3);
  sheetIcon.style.opacity = iconV;
  sheetIcon.style.left = 540 - 75 + 'px';
  sheetIcon.style.top = 440 + (1 - iconV) * 20 + 'px';
  sheetIcon.style.transform = `scale(${1 + 0.06 * window01(t, 34.6, 35.2, 0.15, 0.4)})`;
  const bTop = { x: SYNC_B.x + (PHONE_W * 1.06) / 2, y: SYNC_B.y };
  const aTop = { x: SYNC_A.x + (PHONE_W * 1.06) / 2, y: SYNC_A.y };
  const ic = { x: 540, y: 515 };
  pulses.forEach((pl, i) => {
    const off = i * 0.09;
    const p1 = prog(t, 34.15 + off, 34.75 + off), p2 = prog(t, 34.85 + off, 35.45 + off);
    let x, y, v;
    if (t < 34.85 + off) {
      x = lerp(bTop.x, ic.x, p1);
      y = lerp(bTop.y, ic.y, p1) - Math.sin(p1 * Math.PI) * 60;
      v = p1 > 0 && p1 < 1 ? 1 : 0;
    } else {
      x = lerp(ic.x, aTop.x, p2);
      y = lerp(ic.y, aTop.y, p2) - Math.sin(p2 * Math.PI) * 60;
      v = p2 > 0 && p2 < 1 ? 1 : 0;
    }
    pl.style.left = x + 'px';
    pl.style.top = y + 'px';
    pl.style.opacity = v * (1 - i * 0.3);
  });

  // Phone A contents
  const introList = clamp((t - 4.9) / 1.6);
  listA.el.style.opacity = t >= SCREEN_REPORTS_AT ? 1 - prog(t, SCREEN_REPORTS_AT, SCREEN_REPORTS_AT + 0.3) : 1;
  listA.render(t, introList);
  const f = fingerAt(FINGER_A, t);
  listA.renderDrag(t, f);
  doneScr.style.opacity = window01(t, SCREEN_DONE[0], SCREEN_DONE[1], 0.25, 0.25);
  reportsScr.style.opacity = prog(t, SCREEN_REPORTS_AT, SCREEN_REPORTS_AT + 0.3);
  const tab = t >= SCREEN_REPORTS_AT ? 'reports' : t >= SCREEN_DONE[0] && t < SCREEN_DONE[1] ? 'done' : 'tasks';
  A.screen.querySelectorAll('.tb').forEach((tb) => tb.classList.toggle('on', tb.dataset.tab === tab));
  $('.fab', A.screen).style.opacity = tab === 'reports' || (t > 29.0 && t < 30.9) ? 0 : 1;

  // Reports animation
  const cnt = prog(t, 37.6, 38.8, E.out);
  reportsScr.querySelectorAll('.stat .v').forEach((v) => (v.textContent = Math.round(Number(v.dataset.n) * cnt)));
  const sp = prog(t, 38.0, 39.0, E.out);
  $('.sa', reportsScr).style.width = 48 * sp + '%';
  $('.sb', reportsScr).style.width = 52 * sp + '%';
  $('.na', reportsScr).textContent = Math.round(20 * sp);
  $('.nb', reportsScr).textContent = Math.round(22 * sp);
  $('.pa', reportsScr).textContent = Math.round(48 * sp) + '%';
  $('.pb', reportsScr).textContent = Math.round(52 * sp) + '%';
  reportsScr.querySelectorAll('.wk rect').forEach((r) => {
    const i = Number(r.dataset.i);
    const [added, done] = WEEKS[i];
    const v = r.classList.contains('ba') ? added : done;
    const g = prog(t, 38.4 + i * 0.16, 39.0 + i * 0.16, E.out);
    const hgt = (v / 8) * 120 * g;
    r.setAttribute('y', 130 - hgt);
    r.setAttribute('height', Math.max(0, hgt));
  });

  // Trash zone
  const tv = window01(t, 29.1, 30.95, 0.2, 0.15);
  trash.style.transform = `translateY(${(1 - tv) * 100}%)`;
  const over = t >= TRASH_OVER_AT && t < 30.95;
  trash.classList.toggle('over', over);
  $('.tl', trash).textContent = over ? 'Release to delete' : 'Drag here to delete';

  // Toasts
  renderToast(toastA, TOASTS_A, t);

  // Add sheet
  const open = prog(t, SHEET_OPEN[0], SHEET_OPEN[1], E.out) * (1 - prog(t, SHEET_CLOSE[0], SHEET_CLOSE[1], E.inOut));
  scrim.style.opacity = open;
  sheet.style.transform = `translateY(${lerp(844, 196, open)}px)`;
  const n = Math.round(clamp((t - TYPE[0]) / (TYPE[1] - TYPE[0])) * TYPED.length);
  const typed = TYPED.slice(0, n);
  const caretOn = t < 14.15 && Math.floor(t * 2.4) % 2 === 0;
  $('.input', sheet).innerHTML =
    (typed
      ? typed.replace(/([@#!]\w*)/g, '<span class="tok">$1</span>')
      : '<span class="ph">What needs doing?</span>') + (caretOn || (t > TYPE[0] && t < TYPE[1]) ? '<span class="caret"></span>' : '');
  const has = (s) => typed.includes(s);
  $('.hint', sheet).textContent = has('@') ? 'Will save as “Fix gutter”' : 'Tip: add @name, #category or !high';
  const who = has('@Rebecca') ? 'B' : 'R';
  sheet.querySelectorAll('.chip').forEach((c) => c.classList.toggle('on', c.dataset.w === who));
  const pr = has('!high') ? 'high' : 'med';
  sheet.querySelectorAll('.pseg span').forEach((s) => s.classList.toggle('on', s.dataset.p === pr));
  $('.catv', sheet).textContent = has('#Home') ? 'Home Repair' : 'None';

  // Finger + tap ripple
  fingerA.style.left = f.x + 'px';
  fingerA.style.top = f.y + 'px';
  fingerA.style.opacity = f.vis * (t > 31.5 ? 0 : 1);
  fingerA.style.transform = `scale(${f.down ? 0.82 : 1})`;
  const tap = TAPS_A.find((a) => t >= a && t < a + 0.45);
  if (tap !== undefined) {
    const p = (t - tap) / 0.45;
    const fp = fingerAt(FINGER_A, tap);
    rippleA.style.left = fp.x + 'px';
    rippleA.style.top = fp.y + 'px';
    rippleA.style.opacity = 1 - p;
    rippleA.style.transform = `scale(${1 + p * 1.6})`;
  } else rippleA.style.opacity = 0;

  // Phone B contents
  listB.render(t, 1);
  listB.renderDrag(t, { x: 0, y: 0 });
  renderToast(toastB, TOASTS_B, t);

  // Outro
  const oi = prog(t, 41.4, 42.4, E.out);
  outro.style.opacity = oi;
  $('.mark', outro).style.transform = `scale(${0.7 + 0.3 * prog(t, 41.4, 42.3, E.back)})`;
  $('h1', outro).style.transform = `translateY(${(1 - oi) * 30}px)`;
  const ui = prog(t, 42.1, 42.8, E.out);
  $('.url', outro).style.opacity = ui;
  $('.url', outro).style.transform = `translateY(${(1 - ui) * 20}px)`;
  $('.small', outro).style.opacity = prog(t, 42.5, 43.2);
  // Gentle final fade to the background colour.
  stage.style.opacity = 1 - prog(t, 44.4, 45.0);
}

// Beat warp: map real time → storyboard time, piecewise-linear between cuts.
const BASE_CUTS = [0, 4, 10, 16, 23, 28, 32, 37, 41, 45];
function toBase(t) {
  const cuts = window.CUTS;
  if (!cuts || cuts.length !== BASE_CUTS.length) return t;
  for (let i = 0; i < cuts.length - 1; i++) {
    if (t <= cuts[i + 1]) return lerp(BASE_CUTS[i], BASE_CUTS[i + 1], (t - cuts[i]) / (cuts[i + 1] - cuts[i]));
  }
  return BASE_CUTS[BASE_CUTS.length - 1];
}

window.BASE_CUTS = BASE_CUTS;
window.renderAt = (t) => renderBase(toBase(t));
window.renderAt(0);
