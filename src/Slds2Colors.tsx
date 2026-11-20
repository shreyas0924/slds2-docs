import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface ColorItem {
  label: string;
  hex: string;
  hook: string;
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

type CopyFormat = "var" | "name" | "hex" | "rgb";

const STEPS = [10, 15, 20, 30, 40, 50, 60, 65, 70, 80, 90, 95] as const;

const RAW: Record<string, string> = {
  blue: "001639 03234D 032D60 014486 0B5CAB 0176D3 1B96FF 57A3FD 78B0FD AACBFF D8E6FE EEF4FF",
  "cloud-blue":
    "001A28 0A2636 023248 084968 05628A 107CAD 0D9DDA 08ABED 1AB9FF 90D0FE CFE9FE EAF5FE",
  green:
    "071B12 0C2912 1C3326 194E31 396547 2E844A 3BA755 41B658 45C65A 91DB8B CDEFC4 EBF7E6",
  "hot-orange":
    "281202 421604 4A2413 7E2600 AA3001 D83A00 FF5D2D FF784F FF906E FEB9A5 FFDED5 FEF1ED",
  indigo:
    "200647 1F0974 321D71 2F2CB7 3A49DA 5867E8 7F8CED 8E9BEF 9EA9F1 BEC7F6 E0E5F8 F1F3FB",
  orange:
    "201600 371E03 3E2B02 5F3E02 825101 A96404 DD7A01 F38303 FE9339 FFBA90 FEDFD0 FFF1EA",
  pink: "370114 4B0620 61022A 8A033E B60554 E3066A FF538A FE7298 FE8AA7 FDB6C5 FDDDE3 FEF0F3",
  purple:
    "240643 300B60 401075 5A1BA9 7526E3 9050E9 AD7BEE B78DEF C29EF1 D7BFF2 ECE1F9 F6F2FB",
  red: "300C01 4A0C04 640103 8E030F BA0517 EA001E FE5C4C FE7765 FE8F7D FEB8AB FEDED8 FEF1EE",
  teal: "071B12 072825 023434 024D4C 056764 0B827C 06A59A 03B4A7 01C3B3 04E1CB ACF3E4 DEF9F3",
  violet:
    "2E0039 3D0157 481A54 730394 9602C7 BA01FF CB65FF D17DFE D892FE E5B9FE F2DEFE F9F0FF",
  yellow:
    "281202 2E2204 4F2100 6F3400 8C4B02 A86403 CA8501 D79304 E4A201 FCC003 F9E3B6 FBF3E0",
  neutral:
    "181818 242424 2E2E2E 444444 5C5C5C 747474 939393 A0A0A0 AEAEAE C9C9C9 E5E5E5 F3F3F3 FFFFFF",
};

const PALETTE: Record<string, Record<number, string>> = Object.fromEntries(
  Object.entries(RAW).map(([name, str]) => {
    const steps: number[] = name === "neutral" ? [...STEPS, 100] : [...STEPS];
    return [
      name,
      Object.fromEntries(str.split(" ").map((h, i) => [steps[i], "#" + h])),
    ];
  }),
);

const titleCase = (s: string) =>
  s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

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
  accent: string,
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
  })),
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
  systemGroup(
    "brand",
    "Brand",
    "Primary actions, selected states and focus. Maps to Blue.",
    "blue",
    BASE_STEPS,
    "#0176D3",
  ),
  systemGroup(
    "neutral",
    "Neutral",
    "Surfaces, text and dividers.",
    "neutral",
    BASE_STEPS,
    "#747474",
  ),
  systemGroup(
    "error",
    "Error",
    "Destructive actions and validation errors. Maps to Red.",
    "red",
    STATUS_STEPS,
    "#EA001E",
  ),
  systemGroup(
    "warning",
    "Warning",
    "Cautions and pending states. Maps to Orange.",
    "orange",
    STATUS_STEPS,
    "#DD7A01",
  ),
  systemGroup(
    "success",
    "Success",
    "Positive outcomes and completion. Maps to Green.",
    "green",
    STATUS_STEPS,
    "#2E844A",
  ),
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

const COPY_FORMATS: { id: CopyFormat; label: string }[] = [
  { id: "var", label: "var()" },
  { id: "name", label: "Hook name" },
  { id: "hex", label: "Hex" },
  { id: "rgb", label: "RGB" },
];

const hexToRgb = (hex: string): string => {
  if (!hex.startsWith("#")) return hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgb(${r}, ${g}, ${b})`;
};

const formatItem = (item: ColorItem, fmt: CopyFormat): string => {
  switch (fmt) {
    case "var":
      return `var(${item.hook}, ${item.hex})`;
    case "name":
      return item.hook;
    case "hex":
      return item.hex;
    case "rgb":
      return hexToRgb(item.hex);
  }
};

const groupToCss = (g: ColorGroup): string =>
  `:root {\n${g.items.map((i) => `  ${i.hook}: ${i.hex};`).join("\n")}\n}`;

async function writeClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText =
      "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
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
  const [state, setState] = useState<CopyState>({
    message: "",
    ok: true,
    key: null,
  });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string, key: string, label?: string) => {
      const ok = await writeClipboard(text);
      const preview =
        text.length > 44 ? text.slice(0, 44).replace(/\n/g, " ") + "…" : text;
      setState({
        ok,
        key: ok ? key : null,
        message: ok
          ? `Copied ${label ?? preview}`
          : "Copy failed — select and copy manually",
      });
      clearTimeout(timer.current);
      timer.current = setTimeout(
        () => setState({ message: "", ok: true, key: null }),
        1500,
      );
    },
    [],
  );

  return { ...state, copy };
}

const isLight = (hex: string): boolean => {
  if (!hex.startsWith("#")) return false;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.55;
};

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
    <button
      type="button"
      className="sw"
      onClick={() => onCopy(item)}
      aria-label={`Copy ${item.hook}`}
    >
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
  onCopy: (text: string, key: string, label?: string) => void;
}

function GroupView({
  group,
  filtered,
  copyFormat,
  copiedKey,
  onCopy,
}: GroupViewProps) {
  const exportKey = `export:${group.id}`;
  return (
    <section id={group.id}>
      <h2>
        {group.title}
        <button
          type="button"
          className="mini"
          onClick={() =>
            onCopy(groupToCss(group), exportKey, `${group.title} as CSS`)
          }
        >
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

export default function Slds2Colors() {
  const [query, setQuery] = useState("");
  const [copyFormat, setCopyFormat] = useState<CopyFormat>("var");
  const [dark, setDark] = useState(false);
  const { message, ok, key: copiedKey, copy } = useCopy();

  useEffect(() => {
    const bg = dark ? "#181818" : "#ffffff";
    const prev = [
      document.documentElement.style.background,
      document.body.style.background,
    ];
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    return () => {
      document.documentElement.style.background = prev[0];
      document.body.style.background = prev[1];
    };
  }, [dark]);

  const q = query.trim().toLowerCase();

  const system = useMemo(() => filterGroups(SYSTEM, q), [q]);
  const palettes = useMemo(() => filterGroups(PALETTES, q), [q]);

  const common = { filtered: !!q, copyFormat, copiedKey, onCopy: copy };

  return (
    <div className={`slds-docs ${dark ? "dark" : ""}`}>
      <style>{CSS}</style>
      <header>
        <h1>SLDS 2 Color Reference</h1>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search e.g. blue-50, #0176D3"
          aria-label="Search colors"
        />
        <label>
          Swatch copies
          <select
            value={copyFormat}
            onChange={(e) => setCopyFormat(e.target.value as CopyFormat)}
          >
            {COPY_FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={() => setDark((d) => !d)}>
          {dark ? "Light" : "Dark"}
        </button>
      </header>

      <div className="wrap">
        <nav>
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
        </nav>

        <main>
          <section>
            <h2>Getting started</h2>
            <p className="desc">
              SLDS 2 exposes color as CSS custom properties in the{" "}
              <code>--slds-g-</code> namespace. Click a swatch to copy it in the
              chosen format, or use a group's Copy CSS button to copy the whole
              group as a <code>:root</code> block.
            </p>
            <pre>{`.card {
  background: var(--slds-g-color-neutral-base-100, #FFFFFF);
  color: var(--slds-g-color-neutral-base-10, #181818);
  border: 1px solid var(--slds-g-color-border-base-1, #C9C9C9);
}
a { color: var(--slds-g-link-color, #0B5CAB); }`}</pre>
          </section>

          {system.length > 0 && (
            <h3 className="part">Accessible system colors</h3>
          )}
          {system.map((g) => (
            <GroupView key={g.id} group={g} {...common} />
          ))}

          {palettes.length > 0 && <h3 className="part">Palette colors</h3>}
          {palettes.map((g) => (
            <GroupView key={g.id} group={g} {...common} />
          ))}

          {!system.length && !palettes.length && (
            <p className="desc">No colors match “{query}”.</p>
          )}
        </main>
      </div>

      <div
        className={`toast ${message ? "on" : ""} ${ok ? "" : "err"}`}
        role="status"
        aria-live="polite"
      >
        {message}
      </div>
    </div>
  );
}

function filterGroups(groups: ColorGroup[], q: string): ColorGroup[] {
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) => !q || (i.hook + i.hex).toLowerCase().includes(q),
      ),
    }))
    .filter((g) => g.items.length > 0);
}

const CSS = `
html,body,#root,#__next{margin:0!important;padding:0!important;max-width:none!important;width:100%;min-height:100vh;display:block!important;text-align:left!important;place-items:initial!important;overflow-x:hidden}
.slds-docs{width:100%;--bg:#fff;--fg:#181818;--mut:#5c5c5c;--line:#e5e5e5;--card:#f3f3f3;--acc:#0b5cab;background:var(--bg);color:var(--fg);min-height:100vh;font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.slds-docs.dark{--bg:#181818;--fg:#f3f3f3;--mut:#aeaeae;--line:#2e2e2e;--card:#242424;--acc:#78b0fd}
.slds-docs *{box-sizing:border-box}
.slds-docs header{position:sticky;top:0;z-index:5;background:var(--bg);border-bottom:1px solid var(--line);padding:10px 20px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.slds-docs h1{font-size:17px;margin:0;flex:1;min-width:180px}
.slds-docs label{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--mut)}
.slds-docs input,.slds-docs button,.slds-docs select{font:inherit;color:var(--fg);background:var(--card);border:1px solid var(--line);border-radius:8px;padding:6px 10px}
.slds-docs button,.slds-docs select{cursor:pointer}
.slds-docs button:hover,.slds-docs button:focus-visible,.slds-docs select:focus-visible,.slds-docs input:focus-visible{border-color:var(--acc);outline:none}
@supports (appearance:base-select){
.slds-docs select,.slds-docs select::picker(select){appearance:base-select}
.slds-docs select::picker(select){background:var(--card);color:var(--fg);border:1px solid var(--line);border-radius:8px;padding:4px}
.slds-docs select option{cursor:pointer;padding:6px 10px;border-radius:6px;color:var(--fg)}
.slds-docs select option:hover,.slds-docs select option:focus-visible{background:var(--line)}
.slds-docs select option:checked{font-weight:600}
}
.slds-docs .wrap{display:flex;max-width:1280px;margin:0 auto}
.slds-docs nav{width:200px;flex:none;position:sticky;top:58px;align-self:flex-start;max-height:calc(100vh - 70px);overflow:auto;padding:16px 8px 16px 20px}
.slds-docs nav a{display:flex;align-items:center;gap:8px;padding:4px 0;color:var(--mut);text-decoration:none;font-size:14px}
.slds-docs nav a:hover{color:var(--fg)}
.slds-docs nav i{width:12px;height:12px;border-radius:3px;display:inline-block}
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
.slds-docs .toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);background:#181818;color:#fff;padding:8px 14px;border-radius:8px;font-size:13px;opacity:0;pointer-events:none;transition:opacity .2s;max-width:90vw}
.slds-docs .toast.on{opacity:1}
.slds-docs .toast.err{background:#ba0517}
@media(max-width:760px){.slds-docs nav{display:none}.slds-docs main{padding:14px}}
`;
