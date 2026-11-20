import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

interface ColorItem {
  label: string;
  hex: string;
  hook: string;
  fallback?: string;
}

interface ColorGroup {
  id: string;
  title: string;
  desc: string;
  accent: string;
  items: ColorItem[];
  strip?: boolean;
  plain?: boolean;
  checker?: boolean;
}

interface Semantic {
  hook: string;
  light: string;
  dark: string;
  usage: string;
  verified: boolean;
  against?: "surface" | "inverse";
}

interface SemanticGroup {
  id: string;
  title: string;
  desc: string;
  accent: string;
  items: Semantic[];
  contrast?: boolean;
}

type CopyFormat = "var" | "varplain" | "name" | "hex" | "rgb";
type CopyFn = (text: string, key: string, label?: string) => void;

const STEPS = [10, 15, 20, 30, 40, 50, 60, 65, 70, 80, 90, 95] as const;

const RAW: Record<string, string> = {
  blue: "001639 03234D 032D60 014486 0B5CAB 0176D3 1B96FF 57A3FD 78B0FD AACBFF D8E6FE EEF4FF",
  "cloud-blue": "001A28 0A2636 023248 084968 05628A 107CAD 0D9DDA 08ABED 1AB9FF 90D0FE CFE9FE EAF5FE",
  green: "071B12 0C2912 1C3326 194E31 396547 2E844A 3BA755 41B658 45C65A 91DB8B CDEFC4 EBF7E6",
  "hot-orange": "281202 421604 4A2413 7E2600 AA3001 D83A00 FF5D2D FF784F FF906E FEB9A5 FFDED5 FEF1ED",
  indigo: "200647 1F0974 321D71 2F2CB7 3A49DA 5867E8 7F8CED 8E9BEF 9EA9F1 BEC7F6 E0E5F8 F1F3FB",
  orange: "201600 371E03 3E2B02 5F3E02 825101 A96404 DD7A01 F38303 FE9339 FFBA90 FEDFD0 FFF1EA",
  pink: "370114 4B0620 61022A 8A033E B60554 E3066A FF538A FE7298 FE8AA7 FDB6C5 FDDDE3 FEF0F3",
  purple: "240643 300B60 401075 5A1BA9 7526E3 9050E9 AD7BEE B78DEF C29EF1 D7BFF2 ECE1F9 F6F2FB",
  red: "300C01 4A0C04 640103 8E030F BA0517 EA001E FE5C4C FE7765 FE8F7D FEB8AB FEDED8 FEF1EE",
  teal: "071B12 072825 023434 024D4C 056764 0B827C 06A59A 03B4A7 01C3B3 04E1CB ACF3E4 DEF9F3",
  violet: "2E0039 3D0157 481A54 730394 9602C7 BA01FF CB65FF D17DFE D892FE E5B9FE F2DEFE F9F0FF",
  yellow: "281202 2E2204 4F2100 6F3400 8C4B02 A86403 CA8501 D79304 E4A201 FCC003 F9E3B6 FBF3E0",
  neutral: "181818 242424 2E2E2E 444444 5C5C5C 747474 939393 A0A0A0 AEAEAE C9C9C9 E5E5E5 F3F3F3 FFFFFF",
};

const PALETTE: Record<string, Record<number, string>> = Object.fromEntries(
  Object.entries(RAW).map(([name, str]) => {
    const steps: number[] = name === "neutral" ? [...STEPS, 100] : [...STEPS];
    return [name, Object.fromEntries(str.split(" ").map((h, i) => [steps[i], "#" + h]))];
  })
);

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const paletteGroup = (name: string): ColorGroup => ({
  id: `palette-${name}`,
  title: titleCase(name),
  desc: `--slds-g-color-palette-${name}-*`,
  accent: PALETTE[name][50] ?? PALETTE[name][100],
  strip: true,
  items: Object.entries(PALETTE[name]).map(([n, hex]) => ({
    label: n,
    hex,
    hook: `--slds-g-color-palette-${name}-${n}`,
  })),
});

const systemGroup = (
  id: string,
  title: string,
  desc: string,
  palette: string,
  steps: number[],
  accent: string
): ColorGroup => ({
  id,
  title,
  desc,
  accent,
  items: steps.map((n) => ({
    label: String(n),
    hex: n === 100 ? "#FFFFFF" : PALETTE[palette][n],
    hook: `--slds-g-color-${id}-base-${n}`,
  })),
});

const OPACITY_ITEMS: ColorItem[] = (
  [
    ["10", "24, 24, 24"],
    ["100", "255, 255, 255"],
  ] as const
).flatMap(([base, rgb]) =>
  [10, 25, 50, 75].map((o) => ({
    label: `${base}/${o}`,
    hex: `rgba(${rgb}, ${o / 100})`,
    hook: `--slds-g-color-neutral-${base}-opacity-${o}`,
  }))
);

const BORDER_ITEMS: ColorItem[] = [
  ...(
    [
      ["border-base-1", "#C9C9C9"],
      ["border-base-2", "#AEAEAE"],
      ["border-base-3", "#939393"],
      ["border-base-4", "#747474"],
      ["border-brand-1", "#78B0FD"],
      ["border-brand-2", "#1B96FF"],
    ] as const
  ).map(([n, hex]) => ({ label: n, hex, hook: `--slds-g-color-${n}` })),
  ...(
    [
      ["link-color", "#0B5CAB"],
      ["link-color-hover", "#014486"],
      ["link-color-focus", "#014486"],
      ["link-color-active", "#032D60"],
    ] as const
  ).map(([n, hex]) => ({ label: n, hex, hook: `--slds-g-${n}` })),
];

const BASE_STEPS = [100, 95, 90, 80, 70, 65, 60, 50, 40, 30, 20, 15, 10];
const STATUS_STEPS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];

const SYSTEM: ColorGroup[] = [
  systemGroup("brand", "Brand", "Primary actions, selected states and focus. Maps to Blue.", "blue", BASE_STEPS, "#0176D3"),
  systemGroup("neutral", "Neutral", "Surfaces, text and dividers.", "neutral", BASE_STEPS, "#747474"),
  systemGroup("error", "Error", "Destructive actions and validation errors. Maps to Red.", "red", STATUS_STEPS, "#EA001E"),
  systemGroup("warning", "Warning", "Cautions and pending states. Maps to Orange.", "orange", STATUS_STEPS, "#DD7A01"),
  systemGroup("success", "Success", "Positive outcomes and completion. Maps to Green.", "green", STATUS_STEPS, "#2E844A"),
  {
    id: "border",
    title: "Border & link",
    desc: "Dividers, input outlines, brand borders and link states.",
    accent: "#939393",
    plain: true,
    items: BORDER_ITEMS,
  },
  {
    id: "opacity",
    title: "Opacity overlays",
    desc: "Scrims and translucent layers.",
    accent: "#2E2E2E",
    checker: true,
    items: OPACITY_ITEMS,
  },
];

const PALETTES: ColorGroup[] = Object.keys(PALETTE).map(paletteGroup);

const sem = (row: string): Semantic => {
  const [hook, light, dark, flag, usage, against] = row.split("|");
  return {
    hook: `--slds-g-color-${hook}`,
    light: "#" + light,
    dark: "#" + dark,
    verified: flag === "v",
    usage,
    against: against === "i" ? "inverse" : against === "s" ? "surface" : undefined,
  };
};

const SEMANTIC: SemanticGroup[] = [
  {
    id: "sem-surfaces",
    title: "Surfaces & containers",
    desc: "Layered backgrounds for page canvas, cards, modals and inverse regions.",
    accent: "#E5E5E5",
    items: [
      "surface-1|FFFFFF|242424|v|Primary page background.",
      "surface-2|F3F3F3|181818|u|Secondary surface and recessed canvas.",
      "surface-3|F3F3F3|2E2E2E|u|Tertiary surface for wells and zebra rows.",
      "surface-inverse-1|032D60|F3F3F3|u|Primary inverse surface for navigation bars and tooltips.",
      "surface-inverse-2|014486|E5E5E5|u|Secondary inverse surface for active items.",
      "surface-container-1|FFFFFF|242424|v|Primary container background for cards and modals.",
      "surface-container-2|F3F3F3|181818|v|Secondary container for subtle depth variation.",
      "surface-container-3|E5E5E5|2E2E2E|v|Tertiary container with the strongest visual containment.",
      "surface-container-inverse-2|03234D|78B0FD|v|Secondary inverse container for nesting within inverse containers.",
    ].map(sem),
  },
  {
    id: "sem-on-surface",
    title: "On-surface text & icons",
    desc: "Foreground colors for text and icons, with live WCAG contrast against the matching surface.",
    accent: "#444444",
    contrast: true,
    items: [
      "on-surface-1|5C5C5C|AEAEAE|u|Lightest text: placeholders and hints.|s",
      "on-surface-2|2E2E2E|E5E5E5|u|Darker text: labels and metadata.|s",
      "on-surface-3|03234D|D8E6FE|u|Titles and primary values.|s",
      "on-surface-inverse-1|FFFFFF|181818|u|Primary text and icons on inverse surfaces.|i",
      "on-surface-inverse-2|C9C9C9|444444|u|Secondary text on inverse surfaces.|i",
    ].map(sem),
  },
  {
    id: "sem-accent",
    title: "Accent",
    desc: "Interactive brand colors for links, active tabs, selection and focus.",
    accent: "#0176D3",
    items: [
      "accent-1|0176D3|57A3FD|u|Primary accent for links, active tabs and brand fills.",
      "accent-2|014486|78B0FD|u|Hover state for the primary accent.",
      "accent-3|022AC0|A8CBFF|v|Tertiary accent used for interactive states.",
      "accent-container-1|EEF4FF|03234D|u|Container fill for selected rows and pills.",
      "accent-container-2|D8E6FE|032D60|u|Medium container fill for active chips.",
      "on-accent-1|FFFFFF|FFFFFF|v|Text and icons displayed on accent fills.",
      "on-accent-2|FFFFFF|0250D9|v|Text and icons displayed with accent-container-2.",
      "on-accent-3|FFFFFF|022AC0|v|Text and icons displayed with accent-container-3.",
    ].map(sem),
  },
  {
    id: "sem-borders",
    title: "Borders",
    desc: "Structural strokes and accent outlines.",
    accent: "#747474",
    items: [
      "border-1|E5E5E5|383838|u|Subtle card outlines and dividers.",
      "border-2|747474|747474|u|Accessible 3:1 border for inputs and controls.",
      "border-3|444444|AEAEAE|u|Strong structural emphasis.",
      "border-accent-1|066AFE|066AFE|v|Primary brand accent border: focus rings and selection.",
      "border-accent-2|0250D9|7CB1FE|v|Secondary brand accent border.",
      "border-inverse-1|444444|C9C9C9|u|Dividers inside inverse regions.",
    ].map(sem),
  },
  {
    id: "sem-feedback",
    title: "Feedback & status",
    desc: "Error, success, warning and info sets. Error values are confirmed; the others are not.",
    accent: "#B60554",
    items: [
      "error-1|B60554|FE8AA7|v|Primary color for error text and icons.",
      "error-container-1|FDDDE3|8A033E|v|Primary error container background.",
      "error-container-2|FDB6C5|B60554|v|Secondary error container background.",
      "border-error-1|B60554|FE8AA7|v|Primary boundary for error components.",
      "border-error-2|8A033E|FDB6C5|v|Secondary boundary for error components.",
      "on-error-1|B60554|FDDDE3|v|Text and icons on error-container-1.",
      "on-error-2|8A033E|FEF0F3|v|Text and icons on error-container-2.",
      "success-1|2E844A|45C65A|u|Success icon and status dot.",
      "success-container-1|EBF7E6|0E3522|u|Success banner and badge background.",
      "border-success-1|2E844A|45C65A|u|Success outline and valid field border.",
      "on-success-1|194E31|CDEFC4|u|Text and icons on success-container-1.",
      "warning-1|A86403|FCC003|u|Warning icon and caution dot.",
      "warning-container-1|FBF3E0|3A1C03|u|Warning banner and badge background.",
      "border-warning-1|A86403|FCC003|u|Warning outline.",
      "on-warning-1|4F2100|F9E3B6|u|Text and icons on warning-container-1.",
      "info-1|0176D3|57A3FD|u|Informational icon and accent.",
      "info-container-1|EEF4FF|03234D|u|Informational banner background.",
      "border-info-1|0176D3|57A3FD|u|Informational outline.",
      "on-info-1|032D60|D8E6FE|u|Text and icons on info-container-1.",
    ].map(sem),
  },
];

const ALL_SEMANTIC: Semantic[] = SEMANTIC.flatMap((g) => g.items);

const COPY_FORMATS: { id: CopyFormat; label: string }[] = [
  { id: "var", label: "var(--hook, #hex)" },
  { id: "varplain", label: "var(--hook)" },
  { id: "name", label: "Hook name" },
  { id: "hex", label: "Hex" },
  { id: "rgb", label: "RGB" },
];

const hexToRgbString = (hex: string): string => {
  if (!hex.startsWith("#")) return hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

const formatItem = (item: ColorItem, fmt: CopyFormat): string => {
  switch (fmt) {
    case "var":
      return `var(${item.hook}, ${item.fallback ?? item.hex})`;
    case "varplain":
      return `var(${item.hook})`;
    case "name":
      return item.hook;
    case "hex":
      return item.hex;
    case "rgb":
      return hexToRgbString(item.hex);
  }
};

const groupToCss = (g: ColorGroup): string =>
  `:root {\n${g.items.map((i) => `  ${i.hook}: ${i.hex};`).join("\n")}\n}`;

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

interface CopyState {
  message: string;
  ok: boolean;
  key: string | null;
}

function useCopy() {
  const [state, setState] = useState<CopyState>({ message: "", ok: true, key: null });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback<CopyFn>(async (text, key, label) => {
    const ok = await writeClipboard(text);
    const preview = text.length > 44 ? text.slice(0, 44).replace(/\n/g, " ") + "…" : text;
    setState({
      ok,
      key: ok ? key : null,
      message: ok ? `Copied ${label ?? preview}` : "Copy failed — select and copy manually",
    });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState({ message: "", ok: true, key: null }), 1500);
  }, []);

  return { ...state, copy };
}

const channel = (v: number) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const contrast = (a: string, b: string): number => {
  const [l1, l2] = [luminance(a), luminance(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const isLight = (hex: string): boolean => {
  if (!hex.startsWith("#")) return false;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
};

const contrastBg = (t: Semantic, dark: boolean): string => {
  if (t.against === "inverse") return dark ? "#F3F3F3" : "#032D60";
  return dark ? "#242424" : "#FFFFFF";
};

const c = (name: string) => `var(--slds-g-color-${name})`;

interface SwatchProps {
  item: ColorItem;
  group: ColorGroup;
  copied: boolean;
  onCopy: (item: ColorItem) => void;
}

function Swatch({ item, group, copied, onCopy }: SwatchProps) {
  const fg = isLight(item.hex) ? "#181818" : "#fff";
  const showLabel = !group.checker && !group.plain;
  return (
    <button type="button" className="sw" onClick={() => onCopy(item)} aria-label={`Copy ${item.hook}`}>
      <div className={group.checker ? "chip checker" : "chip"}>
        <div className="fill" style={{ background: item.hex, color: fg }}>
          {copied ? "✓ Copied" : showLabel ? item.label : ""}
        </div>
      </div>
      <div className="meta">
        <b>{item.hex}</b>
        <code>{item.hook}</code>
      </div>
    </button>
  );
}

interface GroupViewProps {
  group: ColorGroup;
  filtered: boolean;
  copyFormat: CopyFormat;
  copiedKey: string | null;
  onCopy: CopyFn;
}

function GroupView({ group, filtered, copyFormat, copiedKey, onCopy }: GroupViewProps) {
  const exportKey = `export:${group.id}`;
  return (
    <section id={group.id}>
      <h2>
        {group.title}
        <button type="button" className="mini" onClick={() => onCopy(groupToCss(group), exportKey, `${group.title} as CSS`)}>
          {copiedKey === exportKey ? "✓ Copied" : "Copy CSS"}
        </button>
      </h2>
      <p className="desc">{group.desc}</p>
      {group.strip && !filtered && (
        <div className="strip">
          {group.items.map((i) => (
            <div key={i.hook} style={{ background: i.hex }} title={i.hex} />
          ))}
        </div>
      )}
      <div className="grid">
        {group.items.map((i) => (
          <Swatch
            key={i.hook}
            item={i}
            group={group}
            copied={copiedKey === i.hook}
            onCopy={(it) => onCopy(formatItem(it, copyFormat), it.hook)}
          />
        ))}
      </div>
    </section>
  );
}

interface SemanticCardProps {
  token: Semantic;
  dark: boolean;
  copyFormat: CopyFormat;
  showContrast?: boolean;
  copiedKey: string | null;
  onCopy: CopyFn;
}

function SemanticCard({ token, dark, copyFormat, showContrast, copiedKey, onCopy }: SemanticCardProps) {
  const active = dark ? token.dark : token.light;
  const item: ColorItem = { label: token.hook, hex: active, hook: token.hook, fallback: token.light };
  const ratio = showContrast ? contrast(active, contrastBg(token, dark)) : 0;
  const level = ratio >= 7 ? "AAA" : ratio >= 4.5 ? "AA" : ratio >= 3 ? "AA large" : "Low";
  return (
    <div className="scard">
      <div className="srow">
        <button
          type="button"
          className="sbig"
          style={{ background: active, color: isLight(active) ? "#181818" : "#fff" }}
          onClick={() => onCopy(formatItem(item, copyFormat), token.hook)}
          aria-label={`Copy ${token.hook}`}
        >
          <span>{copiedKey === token.hook ? "✓ Copied" : active}</span>
          {showContrast && (
            <span className="ratio">
              {ratio.toFixed(2)}:1 {level}
            </span>
          )}
        </button>
        <div className="pills">
          <button
            type="button"
            style={{ background: token.light, color: isLight(token.light) ? "#181818" : "#fff" }}
            onClick={() => onCopy(token.light, `${token.hook}:l`)}
            title="Copy light value"
          >
            Light {token.light}
          </button>
          <button
            type="button"
            style={{ background: token.dark, color: isLight(token.dark) ? "#181818" : "#fff" }}
            onClick={() => onCopy(token.dark, `${token.hook}:d`)}
            title="Copy dark value"
          >
            Dark {token.dark}
          </button>
        </div>
      </div>
      <button type="button" className="hook" onClick={() => onCopy(token.hook, `${token.hook}:n`)}>
        {token.hook}
      </button>
      <p className="usage">{token.usage}</p>
      {!token.verified && (
        <span className="unv" title="Value not confirmed against the SLDS 2 Styling Hook Index">
          Unverified value
        </span>
      )}
    </div>
  );
}

interface ExampleProps {
  title: string;
  badge?: string;
  css: string;
  html: string;
  onCopy: CopyFn;
  children: ReactNode;
}

function Example({ title, badge, css, html, onCopy, children }: ExampleProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"css" | "html">("css");
  const code = tab === "css" ? css : html;
  return (
    <div className="ex">
      <div className="ex-head">
        <div>
          <b>{title}</b>
          {badge && <code className="pill">{badge}</code>}
        </div>
        <button type="button" className="mini" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide LWC code" : "View LWC code"}
        </button>
      </div>
      <div className="ex-stage">{children}</div>
      {open && (
        <div className="ex-code">
          <div className="ex-tabs">
            <button type="button" className={tab === "css" ? "on" : ""} onClick={() => setTab("css")}>
              component.css
            </button>
            <button type="button" className={tab === "html" ? "on" : ""} onClick={() => setTab("html")}>
              component.html
            </button>
            <button type="button" className="mini push" onClick={() => onCopy(code, `code:${title}`, `${tab} snippet`)}>
              Copy code
            </button>
          </div>
          <pre>{code}</pre>
        </div>
      )}
    </div>
  );
}

function Examples({ id, onCopy }: { id: string; onCopy: CopyFn }) {
  const [row, setRow] = useState(1);
  const [tab, setTab] = useState("details");
  const [chips, setChips] = useState<string[]>(["Enterprise"]);
  const box = { background: c("surface-container-1"), border: `1px solid ${c("border-1")}`, borderRadius: 12 };

  if (id === "sem-surfaces") {
    return (
      <div className="exgrid">
        <Example
          title="Page canvas layering"
          badge="surface-2 → container-1 → surface-3"
          onCopy={onCopy}
          css={`.canvas {\n  background-color: var(--slds-g-color-surface-2, #f3f3f3);\n}\n.card {\n  background-color: var(--slds-g-color-surface-container-1, #ffffff);\n  border: 1px solid var(--slds-g-color-border-1, #e5e5e5);\n}\n.well {\n  background-color: var(--slds-g-color-surface-3, #f3f3f3);\n}`}
          html={`<div class="canvas">\n  <article class="card">\n    <h3>Acme Global Enterprise</h3>\n    <div class="well">Annual contract value: $480,000</div>\n  </article>\n</div>`}
        >
          <div style={{ background: c("surface-2"), border: `1px solid ${c("border-1")}`, borderRadius: 12, padding: 16 }}>
            <div style={{ ...box, padding: 14 }}>
              <div style={{ color: c("on-surface-3"), fontWeight: 700 }}>Acme Global Enterprise</div>
              <div style={{ background: c("surface-3"), color: c("on-surface-2"), borderRadius: 8, padding: 10, marginTop: 10, fontSize: 13 }}>
                Annual contract value: $480,000
              </div>
            </div>
          </div>
        </Example>
        <Example
          title="Inverse navigation bar"
          badge="surface-inverse-1 / inverse-2"
          onCopy={onCopy}
          css={`.nav-bar {\n  background-color: var(--slds-g-color-surface-inverse-1, #032d60);\n  color: var(--slds-g-color-on-surface-inverse-1, #ffffff);\n}\n.nav-item--active {\n  background-color: var(--slds-g-color-surface-inverse-2, #014486);\n}`}
          html={`<header class="nav-bar">\n  <span>Sales Console</span>\n  <a class="nav-item--active">Opportunities</a>\n  <a>Accounts</a>\n</header>`}
        >
          <div style={{ background: c("surface-inverse-1"), borderRadius: 12, padding: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <b style={{ color: c("on-surface-inverse-1"), fontSize: 13, marginRight: "auto" }}>Sales Console</b>
            <span style={{ background: c("surface-inverse-2"), color: c("on-surface-inverse-1"), borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
              Opportunities
            </span>
            <span style={{ color: c("on-surface-inverse-2"), fontSize: 12 }}>Accounts</span>
          </div>
        </Example>
        <Example
          title="Selectable data table"
          badge="surface-1 / accent-container-1"
          onCopy={onCopy}
          css={`.table-head {\n  background-color: var(--slds-g-color-surface-container-2, #f3f3f3);\n}\n.table-row {\n  background-color: var(--slds-g-color-surface-1, #ffffff);\n}\n.table-row[aria-selected="true"] {\n  background-color: var(--slds-g-color-accent-container-1, #eef4ff);\n}`}
          html={`<table>\n  <thead class="table-head"><tr><th>Opportunity</th><th>Stage</th></tr></thead>\n  <tbody>\n    <tr class="table-row" aria-selected="true"><td>Astro Robotics</td><td>Negotiation</td></tr>\n  </tbody>\n</table>`}
        >
          <div style={{ border: `1px solid ${c("border-1")}`, borderRadius: 12, overflow: "hidden", fontSize: 12 }}>
            <div style={{ background: c("surface-container-2"), color: c("on-surface-2"), padding: "8px 12px", display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr", fontWeight: 700 }}>
              <span>Opportunity</span>
              <span>Stage</span>
              <span style={{ textAlign: "right" }}>Amount</span>
            </div>
            {[
              ["Northern Trail Outfitters", "Qualification", "$85,000"],
              ["Astro Robotics Corp", "Negotiation", "$310,000"],
              ["Cumulus FinTech", "Proposal", "$142,000"],
            ].map((r, i) => (
              <button
                key={r[0]}
                type="button"
                onClick={() => setRow(i)}
                style={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "2fr 1.5fr 1fr",
                  textAlign: "left",
                  borderRadius: 0,
                  border: "none",
                  borderTop: `1px solid ${c("border-1")}`,
                  padding: "9px 12px",
                  background: row === i ? c("accent-container-1") : c("surface-1"),
                  color: c("on-surface-3"),
                }}
              >
                <span style={{ fontWeight: 600 }}>{r[0]}</span>
                <span style={{ color: c("on-surface-2") }}>{r[1]}</span>
                <span style={{ textAlign: "right" }}>{r[2]}</span>
              </button>
            ))}
          </div>
        </Example>
      </div>
    );
  }

  if (id === "sem-on-surface") {
    return (
      <div className="exgrid">
        <Example
          title="Record field hierarchy"
          badge="on-surface-1 / 2 / 3"
          onCopy={onCopy}
          css={`.field-label { color: var(--slds-g-color-on-surface-2, #2e2e2e); }\n.field-value { color: var(--slds-g-color-on-surface-3, #03234d); font-weight: 600; }\n.field-empty { color: var(--slds-g-color-on-surface-1, #5c5c5c); font-style: italic; }`}
          html={`<dl>\n  <dt class="field-label">Account owner</dt>\n  <dd class="field-value">Priya Nair</dd>\n  <dt class="field-label">Secondary contact</dt>\n  <dd class="field-empty">No value</dd>\n</dl>`}
        >
          <div style={{ ...box, padding: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[
              ["Account owner", "Priya Nair", "on-surface-3"],
              ["Annual revenue", "$14,500,000", "on-surface-3"],
              ["Billing region", "APAC — Bengaluru", "on-surface-3"],
              ["Secondary contact", "No value", "on-surface-1"],
            ].map(([l, v, tone]) => (
              <div key={l}>
                <div style={{ color: c("on-surface-2"), fontSize: 11 }}>{l}</div>
                <div style={{ color: c(tone), fontSize: 13, fontWeight: tone === "on-surface-3" ? 700 : 400, fontStyle: tone === "on-surface-1" ? "italic" : "normal" }}>{v}</div>
              </div>
            ))}
          </div>
        </Example>
        <Example
          title="Active vs. disabled input"
          badge="on-surface-3 vs on-surface-1"
          onCopy={onCopy}
          css={`.input { color: var(--slds-g-color-on-surface-3, #03234d); border: 1px solid var(--slds-g-color-border-2, #747474); }\n.input:disabled { color: var(--slds-g-color-on-surface-1, #5c5c5c); background-color: var(--slds-g-color-surface-2, #f3f3f3); }`}
          html={`<input class="input" value="Global Cloud Renewal" />\n<input class="input" disabled value="OPP-88410" />`}
        >
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            <input readOnly value="Global Cloud Renewal" style={{ background: c("surface-1"), color: c("on-surface-3"), border: `1px solid ${c("border-2")}` }} />
            <input disabled value="OPP-88410" style={{ background: c("surface-2"), color: c("on-surface-1"), border: `1px solid ${c("border-1")}`, cursor: "not-allowed" }} />
          </div>
        </Example>
      </div>
    );
  }

  if (id === "sem-accent") {
    return (
      <div className="exgrid">
        <Example
          title="Button states"
          badge="accent-1 / accent-container-1"
          onCopy={onCopy}
          css={`.btn-brand {\n  background-color: var(--slds-g-color-accent-1, #0176d3);\n  color: var(--slds-g-color-on-accent-1, #ffffff);\n}\n.btn-brand:hover { background-color: var(--slds-g-color-accent-2, #014486); }\n.btn-tint {\n  background-color: var(--slds-g-color-accent-container-1, #eef4ff);\n  color: var(--slds-g-color-accent-1, #0176d3);\n}`}
          html={`<button class="btn-brand">New opportunity</button>\n<button class="btn-tint">Quick action</button>`}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" style={{ background: c("accent-1"), color: c("on-accent-1"), border: "none", fontWeight: 700 }}>
              Brand
            </button>
            <button type="button" style={{ background: c("surface-1"), color: c("accent-1"), border: `1px solid ${c("border-accent-1")}`, fontWeight: 700 }}>
              Outline
            </button>
            <button type="button" style={{ background: c("accent-container-1"), color: c("accent-1"), border: "none", fontWeight: 700 }}>
              Tint
            </button>
            <button type="button" disabled style={{ background: c("surface-2"), color: c("on-surface-1"), border: `1px solid ${c("border-1")}`, cursor: "not-allowed" }}>
              Disabled
            </button>
          </div>
        </Example>
        <Example
          title="Tabs and filter chips"
          badge="border-accent-1 / accent-container-2"
          onCopy={onCopy}
          css={`.tab--active {\n  color: var(--slds-g-color-accent-1, #0176d3);\n  border-bottom: 2px solid var(--slds-g-color-border-accent-1, #066afe);\n}\n.chip--selected {\n  background-color: var(--slds-g-color-accent-container-2, #d8e6fe);\n  border-color: var(--slds-g-color-border-accent-1, #066afe);\n  color: var(--slds-g-color-accent-1, #0176d3);\n}`}
          html={`<div role="tablist">\n  <button class="tab--active">Details</button>\n  <button>Related</button>\n</div>\n<button class="chip--selected">Enterprise</button>`}
        >
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 16, borderBottom: `1px solid ${c("border-1")}` }}>
              {["details", "related", "activity"].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  style={{
                    background: "none",
                    border: "none",
                    borderRadius: 0,
                    padding: "0 0 8px",
                    textTransform: "capitalize",
                    fontWeight: 700,
                    color: tab === t ? c("accent-1") : c("on-surface-2"),
                    borderBottom: `2px solid ${tab === t ? c("border-accent-1") : "transparent"}`,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["Enterprise", "Q4 priority", "APAC", "Renewal"].map((ch) => {
                const on = chips.includes(ch);
                return (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChips((p) => (on ? p.filter((x) => x !== ch) : [...p, ch]))}
                    style={{
                      borderRadius: 999,
                      fontWeight: 600,
                      background: on ? c("accent-container-2") : c("surface-1"),
                      color: on ? c("accent-1") : c("on-surface-2"),
                      border: `1px solid ${on ? c("border-accent-1") : c("border-2")}`,
                    }}
                  >
                    {on ? "✓ " : ""}
                    {ch}
                  </button>
                );
              })}
            </div>
          </div>
        </Example>
      </div>
    );
  }

  if (id === "sem-borders") {
    return (
      <div className="exgrid">
        <Example
          title="Input border states"
          badge="border-2 / accent-1 / error-1 / success-1"
          onCopy={onCopy}
          css={`.input { border: 1px solid var(--slds-g-color-border-2, #747474); }\n.input:focus { border: 2px solid var(--slds-g-color-border-accent-1, #066afe); }\n.input[aria-invalid="true"] { border: 2px solid var(--slds-g-color-border-error-1, #b60554); }\n.input--valid { border: 2px solid var(--slds-g-color-border-success-1, #2e844a); }`}
          html={`<input class="input" placeholder="Default" />\n<input class="input" aria-invalid="true" value="Invalid" />\n<input class="input input--valid" value="Verified" />`}
        >
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
            {[
              ["Default", "1px solid " + c("border-2"), c("on-surface-3")],
              ["Focused", "2px solid " + c("border-accent-1"), c("on-surface-3")],
              ["Error", "2px solid " + c("border-error-1"), c("error-1")],
              ["Valid", "2px solid " + c("border-success-1"), c("success-1")],
            ].map(([l, b, col]) => (
              <div key={l} style={{ background: c("surface-1"), border: b, color: col, borderRadius: 8, padding: "7px 10px", fontSize: 12, fontWeight: 600 }}>
                {l}
              </div>
            ))}
          </div>
        </Example>
        <Example
          title="Dashed dropzone"
          badge="border-2 dashed"
          onCopy={onCopy}
          css={`.dropzone {\n  background-color: var(--slds-g-color-surface-2, #f3f3f3);\n  border: 2px dashed var(--slds-g-color-border-2, #747474);\n  border-radius: 0.75rem;\n}`}
          html={`<div class="dropzone">Drop files here or browse</div>`}
        >
          <div style={{ background: c("surface-2"), border: `2px dashed ${c("border-2")}`, borderRadius: 12, padding: 20, textAlign: "center", color: c("on-surface-3"), fontSize: 12, fontWeight: 600 }}>
            Drop contract files here or <span style={{ color: c("accent-1") }}>browse</span>
          </div>
        </Example>
      </div>
    );
  }

  if (id === "sem-feedback") {
    const toasts: [string, string, string][] = [
      ["error", "✕", "Validation failed: close date cannot be in the past."],
      ["success", "✓", "Opportunity “Acme Cloud Expansion” was saved."],
      ["warning", "!", "Contract renewal expires in 7 days."],
      ["info", "i", "Forecast updated 2 minutes ago."],
    ];
    return (
      <div className="exgrid">
        <Example
          title="Toast notifications"
          badge="*-container-1 / border-*-1 / on-*-1"
          onCopy={onCopy}
          css={`.toast--error {\n  background-color: var(--slds-g-color-error-container-1, #fddde3);\n  border: 1px solid var(--slds-g-color-border-error-1, #b60554);\n  color: var(--slds-g-color-on-error-1, #b60554);\n}\n.toast--success {\n  background-color: var(--slds-g-color-success-container-1, #ebf7e6);\n  border: 1px solid var(--slds-g-color-border-success-1, #2e844a);\n  color: var(--slds-g-color-on-success-1, #194e31);\n}`}
          html={`<div class="toast--error" role="alert">Validation failed.</div>\n<div class="toast--success" role="status">Opportunity saved.</div>`}
        >
          <div style={{ display: "grid", gap: 8 }}>
            {toasts.map(([k, icon, text]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  borderRadius: 10,
                  padding: "8px 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  background: c(`${k}-container-1`),
                  border: `1px solid ${c(`border-${k}-1`)}`,
                  color: c(`on-${k}-1`),
                }}
              >
                <span style={{ color: c(`${k}-1`), fontWeight: 800 }}>{icon}</span>
                {text}
              </div>
            ))}
          </div>
        </Example>
        <Example
          title="Status badges"
          badge="error / success / warning / info"
          onCopy={onCopy}
          css={`.badge--risk {\n  background-color: var(--slds-g-color-warning-container-1, #fbf3e0);\n  color: var(--slds-g-color-on-warning-1, #4f2100);\n  border: 1px solid var(--slds-g-color-border-warning-1, #a86403);\n}`}
          html={`<span class="badge--won">Closed won</span>\n<span class="badge--risk">At risk</span>`}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              ["success", "Closed won"],
              ["warning", "At risk"],
              ["error", "Escalated"],
              ["info", "In review"],
            ].map(([k, l]) => (
              <span
                key={k}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  borderRadius: 999,
                  padding: "3px 12px",
                  fontSize: 12,
                  fontWeight: 700,
                  background: c(`${k}-container-1`),
                  color: c(`on-${k}-1`),
                  border: `1px solid ${c(`border-${k}-1`)}`,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 4, background: c(`${k}-1`) }} />
                {l}
              </span>
            ))}
          </div>
        </Example>
      </div>
    );
  }

  return null;
}

const PLAY_HOOKS = [
  { label: "Accent-1", hook: "--slds-g-color-accent-1", fb: "#0176d3" },
  { label: "Success-1", hook: "--slds-g-color-success-1", fb: "#2e844a" },
  { label: "Error-1", hook: "--slds-g-color-error-1", fb: "#b60554" },
  { label: "Warning-1", hook: "--slds-g-color-warning-1", fb: "#a86403" },
];

function filterGroups(groups: ColorGroup[], q: string): ColorGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !q || (i.hook + i.hex).toLowerCase().includes(q)),
    }))
    .filter((g) => g.items.length > 0);
}

function filterSemantic(groups: SemanticGroup[], q: string): SemanticGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((t) => !q || (t.hook + t.light + t.dark + t.usage).toLowerCase().includes(q)),
    }))
    .filter((g) => g.items.length > 0);
}

export default function Slds2Colors() {
  const [query, setQuery] = useState("");
  const [copyFormat, setCopyFormat] = useState<CopyFormat>("var");
  const [dark, setDark] = useState(false);
  const [menu, setMenu] = useState(false);
  const [play, setPlay] = useState(PLAY_HOOKS[0]);
  const { message, ok, key: copiedKey, copy } = useCopy();

  useEffect(() => {
    const bg = dark ? "#181818" : "#ffffff";
    const prev = [document.documentElement.style.background, document.body.style.background];
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    return () => {
      document.documentElement.style.background = prev[0];
      document.body.style.background = prev[1];
    };
  }, [dark]);

  const themeVars = useMemo(
    () => Object.fromEntries(ALL_SEMANTIC.map((t) => [t.hook, dark ? t.dark : t.light])),
    [dark]
  );

  const q = query.trim().toLowerCase();
  const semantic = useMemo(() => filterSemantic(SEMANTIC, q), [q]);
  const system = useMemo(() => filterGroups(SYSTEM, q), [q]);
  const palettes = useMemo(() => filterGroups(PALETTES, q), [q]);

  const common = { filtered: !!q, copyFormat, copiedKey, onCopy: copy };

  const playCss = `.record-card {\n  background-color: var(--slds-g-color-surface-container-1, #ffffff);\n  color: var(--slds-g-color-on-surface-3, #03234d);\n  border: 1px solid var(--slds-g-color-border-1, #e5e5e5);\n}\n.record-card__cta {\n  background-color: var(${play.hook}, ${play.fb});\n  color: var(--slds-g-color-on-accent-1, #ffffff);\n}`;

  return (
    <div className={`slds-docs ${dark ? "dark" : ""}`} style={themeVars as CSSProperties}>
      <style>{CSS}</style>
      <header>
        <button type="button" className="menu" onClick={() => setMenu((m) => !m)} aria-label="Toggle navigation">
          {menu ? "✕" : "☰"}
        </button>
        <h1>SLDS 2 Color Reference</h1>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search hook, #hex or usage"
          aria-label="Search colors"
        />
        <label>
          Copy as
          <select value={copyFormat} onChange={(e) => setCopyFormat(e.target.value as CopyFormat)}>
            {COPY_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setDark((d) => !d)}>
          {dark ? "Light mode" : "Dark mode"}
        </button>
      </header>

      <div className="wrap">
        <nav className={menu ? "open" : ""} onClick={() => setMenu(false)}>
          <h4>Semantic</h4>
          {SEMANTIC.map((g) => (
            <a key={g.id} href={`#${g.id}`}>
              <i style={{ background: g.accent }} />
              {g.title}
            </a>
          ))}
          <h4>System</h4>
          {SYSTEM.map((g) => (
            <a key={g.id} href={`#${g.id}`}>
              <i style={{ background: g.accent }} />
              {g.title}
            </a>
          ))}
          <h4>Palette</h4>
          {PALETTES.map((g) => (
            <a key={g.id} href={`#${g.id}`}>
              <i style={{ background: g.accent }} />
              {g.title}
            </a>
          ))}
          <h4>Tools</h4>
          <a href="#playground">
            <i style={{ background: "#0176D3" }} />
            LWC playground
          </a>
        </nav>

        <main>
          <section>
            <h2>Getting started</h2>
            <p className="desc">
              SLDS 2 exposes color as CSS custom properties in the <code>--slds-g-</code> namespace. Prefer semantic hooks
              (surface, on-surface, accent, border, feedback) because their values change with light and dark mode. Click a
              swatch to copy it in the chosen format. Always keep a fallback value and never reassign a global hook.
            </p>
            <pre>{`.card {
  background: var(--slds-g-color-surface-container-1, #FFFFFF);
  color: var(--slds-g-color-on-surface-3, #03234D);
  border: 1px solid var(--slds-g-color-border-1, #E5E5E5);
}`}</pre>
            <p className="desc">
              Values marked “Unverified” come from a secondary source and have not been confirmed against Salesforce’s
              Styling Hook Index.
            </p>
          </section>

          {semantic.length > 0 && <h3 className="part">Semantic colors (light and dark)</h3>}
          {semantic.map((g) => (
            <section key={g.id} id={g.id}>
              <h2>{g.title}</h2>
              <p className="desc">{g.desc}</p>
              <div className="sgrid">
                {g.items.map((t) => (
                  <SemanticCard
                    key={t.hook}
                    token={t}
                    dark={dark}
                    copyFormat={copyFormat}
                    showContrast={g.contrast}
                    copiedKey={copiedKey}
                    onCopy={copy}
                  />
                ))}
              </div>
              {!q && <Examples id={g.id} onCopy={copy} />}
            </section>
          ))}

          {system.length > 0 && <h3 className="part">Accessible system colors</h3>}
          {system.map((g) => (
            <GroupView key={g.id} group={g} {...common} />
          ))}

          {palettes.length > 0 && <h3 className="part">Palette colors</h3>}
          {palettes.map((g) => (
            <GroupView key={g.id} group={g} {...common} />
          ))}

          {!semantic.length && !system.length && !palettes.length && <p className="desc">No colors match “{query}”.</p>}

          {!q && (
            <section id="playground">
              <h2>LWC playground</h2>
              <p className="desc">Pick a hook for the primary action and copy the resulting stylesheet.</p>
              <div className="play-pick">
                {PLAY_HOOKS.map((p) => (
                  <button key={p.hook} type="button" className={play.hook === p.hook ? "on" : ""} onClick={() => setPlay(p)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="exgrid">
                <div className="ex">
                  <div className="ex-stage">
                    <div style={{ background: c("surface-2"), border: `1px solid ${c("border-1")}`, borderRadius: 12, padding: 16 }}>
                      <div style={{ background: c("surface-container-1"), border: `1px solid ${c("border-1")}`, borderRadius: 12, padding: 16, display: "grid", gap: 12 }}>
                        <b style={{ color: c("on-surface-3") }}>LWC custom record summary</b>
                        <span style={{ color: c("on-surface-2"), fontSize: 12 }}>
                          Surfaces, borders and text adapt when you switch between light and dark mode.
                        </span>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: `1px solid ${c("border-1")}`, paddingTop: 12 }}>
                          <button type="button" style={{ background: c("surface-1"), color: c("on-surface-3"), border: `1px solid ${c("border-2")}` }}>
                            Cancel
                          </button>
                          <button type="button" style={{ background: `var(${play.hook})`, color: c("on-accent-1"), border: "none", fontWeight: 700 }}>
                            Execute action
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="ex">
                  <div className="ex-tabs">
                    <span className="file">customRecordSummary.css</span>
                    <button type="button" className="mini push" onClick={() => copy(playCss, "play", "LWC CSS")}>
                      {copiedKey === "play" ? "✓ Copied" : "Copy LWC CSS"}
                    </button>
                  </div>
                  <pre className="flat">{playCss}</pre>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>

      <div className={`toast ${message ? "on" : ""} ${ok ? "" : "err"}`} role="status" aria-live="polite">
        {message}
      </div>
    </div>
  );
}

const CSS = `
html,body,#root,#__next{margin:0!important;padding:0!important;max-width:none!important;width:100%;min-height:100vh;display:block!important;text-align:left!important;place-items:initial!important;overflow-x:hidden}
.slds-docs{width:100%;--bg:#fff;--fg:#181818;--mut:#5c5c5c;--line:#e5e5e5;--card:#f3f3f3;--acc:#0b5cab;background:var(--bg);color:var(--fg);min-height:100vh;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.slds-docs.dark{--bg:#181818;--fg:#f3f3f3;--mut:#aeaeae;--line:#2e2e2e;--card:#242424;--acc:#78b0fd}
.slds-docs *{box-sizing:border-box}
.slds-docs header{position:sticky;top:0;z-index:6;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.slds-docs h1{font-size:17px;margin:0;flex:1;min-width:160px}
.slds-docs label{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mut)}
.slds-docs input,.slds-docs button,.slds-docs select{font:inherit;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 10px}
.slds-docs button,.slds-docs select{cursor:pointer}
.slds-docs button:hover,.slds-docs button:focus-visible,.slds-docs select:focus-visible,.slds-docs input:focus-visible{border-color:var(--acc);outline:none}
.slds-docs .menu{display:none}
@supports (appearance:base-select){
.slds-docs select,.slds-docs select::picker(select){appearance:base-select}
.slds-docs select::picker(select){background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:4px}
.slds-docs select option{cursor:pointer;padding:6px 10px;border-radius:6px;color:var(--fg)}
.slds-docs select option:hover,.slds-docs select option:focus-visible{background:var(--line)}
.slds-docs select option:checked{font-weight:600}
}
.slds-docs .wrap{display:flex;max-width:1280px;margin:0 auto}
.slds-docs nav{width:210px;flex:none;position:sticky;top:58px;align-self:flex-start;max-height:calc(100vh - 70px);overflow:auto;padding:16px 8px 16px 20px}
.slds-docs nav a{display:flex;align-items:center;gap:8px;padding:4px 0;color:var(--mut);text-decoration:none;font-size:14px}
.slds-docs nav a:hover{color:var(--fg)}
.slds-docs nav i{width:12px;height:12px;border-radius:3px;display:inline-block;border:1px solid var(--line)}
.slds-docs nav h4{margin:14px 0 4px;font-size:12px;color:var(--mut)}
.slds-docs main{flex:1;min-width:0;padding:20px}
.slds-docs section{margin-bottom:36px;scroll-margin-top:70px}
.slds-docs h2{font-size:20px;margin:0 0 2px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.slds-docs h3.part{font-size:14px;color:var(--mut);margin:0 0 16px;padding-bottom:6px;border-bottom:1px solid var(--line)}
.slds-docs .mini{font-size:12px;padding:3px 8px}
.slds-docs .desc{color:var(--mut);margin:2px 0 12px}
.slds-docs .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(128px,1fr));gap:10px}
.slds-docs .sw{padding:0;text-align:left;border-radius:10px;overflow:hidden;display:block;width:100%}
.slds-docs .chip{height:64px}
.slds-docs .chip.checker{background-image:linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%),linear-gradient(45deg,#ccc 25%,transparent 25%,transparent 75%,#ccc 75%);background-size:12px 12px;background-position:0 0,6px 6px}
.slds-docs .fill{height:100%;display:flex;align-items:flex-end;padding:6px 8px;font-weight:600;font-size:13px}
.slds-docs .meta{padding:6px 8px;font-size:11px;line-height:1.35}
.slds-docs .meta b{display:block;font-size:12px}
.slds-docs code{font-family:ui-monospace,Menlo,Consolas,monospace}
.slds-docs .meta code{color:var(--mut);word-break:break-all}
.slds-docs .strip{display:flex;height:44px;border-radius:10px;overflow:hidden;margin-bottom:12px;border:1px solid var(--line)}
.slds-docs .strip div{flex:1}
.slds-docs pre{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:12px;overflow-x:auto;font:12.5px/1.5 ui-monospace,Menlo,Consolas,monospace}
.slds-docs .sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.slds-docs .scard{border:1px solid var(--line);border-radius:12px;padding:12px;background:var(--card);display:flex;flex-direction:column;gap:8px}
.slds-docs .srow{display:flex;gap:8px}
.slds-docs .sbig{flex:1;height:68px;border-radius:10px;padding:6px 8px;font-weight:700;font-size:12px;display:flex;flex-direction:column;justify-content:space-between;align-items:flex-start;text-align:left;border:1px solid var(--line)}
.slds-docs .ratio{font-size:10px;font-weight:700;background:rgba(127,127,127,.25);border-radius:6px;padding:1px 6px}
.slds-docs .pills{display:flex;flex-direction:column;gap:6px;width:96px}
.slds-docs .pills button{flex:1;font-size:10.5px;padding:2px 4px;border-radius:8px;font-weight:600}
.slds-docs .hook{background:none;border:none;padding:0;text-align:left;font:600 12px ui-monospace,Menlo,Consolas,monospace;word-break:break-all}
.slds-docs .hook:hover{color:var(--acc)}
.slds-docs .usage{margin:0;font-size:12px;color:var(--mut)}
.slds-docs .unv{align-self:flex-start;font-size:10.5px;font-weight:700;border-radius:6px;padding:1px 7px;background:rgba(221,122,1,.18);color:#a96404;border:1px solid rgba(221,122,1,.4)}
.slds-docs.dark .unv{color:#fe9339}
.slds-docs .exgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-top:20px;align-items:start}
.slds-docs .ex{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--bg)}
.slds-docs .ex-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid var(--line);background:var(--card);font-size:13px}
.slds-docs .pill{margin-left:8px;font-size:11px;color:var(--mut)}
.slds-docs .ex-stage{padding:14px;background:var(--card)}
.slds-docs .ex-code{border-top:1px solid var(--line)}
.slds-docs .ex-tabs{display:flex;gap:6px;align-items:center;padding:8px 12px;border-bottom:1px solid var(--line)}
.slds-docs .ex-tabs button.on{border-color:var(--acc);color:var(--acc)}
.slds-docs .ex-tabs .push{margin-left:auto}
.slds-docs .ex-tabs .file{font:12px ui-monospace,Menlo,Consolas,monospace;color:var(--mut)}
.slds-docs .ex-code pre,.slds-docs pre.flat{border:none;border-radius:0;margin:0}
.slds-docs .play-pick{display:flex;gap:8px;flex-wrap:wrap}
.slds-docs .play-pick button.on{border-color:var(--acc);color:var(--acc);font-weight:700}
.slds-docs .toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#181818;color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .2s;max-width:90vw;z-index:9}
.slds-docs .toast.on{opacity:1}
.slds-docs .toast.err{background:#ba0517}
@media(max-width:760px){
.slds-docs .menu{display:inline-block}
.slds-docs nav{display:none}
.slds-docs nav.open{display:block;position:fixed;top:58px;left:0;right:0;bottom:0;max-height:none;z-index:5;background:var(--bg);padding:16px 20px}
.slds-docs main{padding:14px}
}
`;