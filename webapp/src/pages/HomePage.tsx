import { Bookmark, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate } from "react-router";
import { AppIcon } from "../components/Icon";
import { SocialLinks } from "../components/SocialLinks";
import { useApp } from "../context/useApp";
import { CATEGORIES, TEMPLATES, TOOL_LINKS, getTemplateById } from "../templates";
import type { CategoryId, SavedScheme, TemplateDef } from "../types";

const CAT_ICON_STYLE: Record<CategoryId, string> = {
  life: "border-red-500/25 bg-red-500/12 text-red-400",
  desk: "border-sky-400/25 bg-sky-400/12 text-sky-400",
  create: "border-amber-400/25 bg-amber-400/12 text-amber-400",
};

interface SavedSchemeItem {
  tpl: TemplateDef;
  scheme: SavedScheme;
}

export function HomePage() {
  const navigate = useNavigate();
  const { state, applyScheme, deleteScheme } = useApp();

  const savedItems = useMemo<SavedSchemeItem[]>(() => {
    const items: SavedSchemeItem[] = [];
    for (const [tplId, list] of Object.entries(state.savedSchemes)) {
      const tpl = getTemplateById(tplId);
      if (!tpl || !Array.isArray(list)) continue;
      for (const scheme of list) {
        items.push({ tpl, scheme });
      }
    }
    items.sort((a, b) => Number(b.scheme.id) - Number(a.scheme.id));
    return items;
  }, [state.savedSchemes]);

  function openScheme(item: SavedSchemeItem) {
    applyScheme(item.tpl, item.scheme);
    void navigate(`/editor/${item.tpl.id}`);
  }

  return (
    <main className="flex flex-col gap-5">
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2.5 px-0.5">
            <h2 className="m-0 flex items-center gap-1.5 text-[15px] font-bold tracking-wide text-slate-100">
              <Bookmark size={15} className="text-amber-400" />
              <span>我的方案</span>
              {savedItems.length > 0 && (
                <span className="rounded-full border border-amber-400/30 bg-amber-400/12 px-2 py-0.5 text-[10.5px] font-semibold text-amber-300">
                  {savedItems.length}
                </span>
              )}
            </h2>
            <span className="text-xs text-slate-400">
              {savedItems.length > 0 ? "点击直接打开并应用" : "常用卡片一键切换"}
            </span>
          </div>

          {savedItems.length === 0 ? (
            <div className="rounded-[14px] border border-dashed border-[#293856] bg-[#131c31]/60 px-3.5 py-3 text-center text-xs text-slate-400">
              暂无已保存方案 · 在任意模板页点击「存为方案」即可在此快速入口切换
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {savedItems.map((item) => (
                <div
                  key={`${item.tpl.id}-${item.scheme.id}`}
                  className="flex items-center gap-2 rounded-[14px] border border-[#293856] bg-[#131c31] px-3 py-2.5 transition hover:border-amber-400/50 hover:bg-[#1e2d4a]"
                >
                  <button
                    type="button"
                    onClick={() => openScheme(item)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 bg-transparent p-0 text-left text-slate-100"
                  >
                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-[10px] border ${CAT_ICON_STYLE[item.tpl.category]}`}
                    >
                      <AppIcon name={item.tpl.icon} size={18} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="truncate text-sm leading-snug font-bold">{item.scheme.name}</div>
                      <div className="flex items-center gap-1.5 text-[11.5px] text-slate-400">
                        <span className="truncate">{item.tpl.title}</span>
                        <span>·</span>
                        <span className="shrink-0">
                          {item.scheme.orientation === "portrait" ? "竖屏" : "横屏"}
                        </span>
                        {item.scheme.invert && (
                          <>
                            <span>·</span>
                            <span className="shrink-0">反色</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    title="删除方案"
                    aria-label={`删除方案 ${item.scheme.name}`}
                    onClick={() => deleteScheme(item.tpl.id, item.scheme.id)}
                    className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-500 transition hover:bg-red-500/15 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {CATEGORIES.map((cat) => {
          const items = TEMPLATES.filter((t) => t.category === cat.id);
          return (
            <section key={cat.id} className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between gap-2.5 px-0.5">
                <h2 className="m-0 text-[15px] font-bold tracking-wide text-slate-100">{cat.title}</h2>
                <span className="text-xs text-slate-400">{cat.desc}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {items.map((tpl) => (
                  <Link
                    key={tpl.id}
                    to={`/editor/${tpl.id}`}
                    className="odd-full-card flex cursor-pointer flex-col gap-2 rounded-2xl border border-[#293856] bg-gradient-to-b from-[#1c2842]/55 to-[#131c31] px-3.5 py-[15px] text-left text-slate-100 no-underline shadow-[0_4px_14px_rgba(0,0,0,0.18)] transition hover:border-red-500/50 hover:bg-[#1e2d4a] active:scale-[0.975]"
                  >
                    <div className="mb-0.5 flex items-center justify-between gap-2">
                      <span
                        className={`grid size-[38px] place-items-center rounded-[11px] border ${CAT_ICON_STYLE[tpl.category]}`}
                      >
                        <AppIcon name={tpl.icon} size={20} />
                      </span>
                      {tpl.badge && (
                        <span className="rounded-full border border-red-500/35 bg-red-500/15 px-2 py-0.5 text-[10.5px] font-bold text-red-300">
                          {tpl.badge}
                        </span>
                      )}
                    </div>
                    <div className="text-[15px] leading-tight font-bold">{tpl.title}</div>
                    <div className="text-xs leading-[1.4] text-slate-400">{tpl.desc}</div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}

        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-2.5 px-0.5">
            <h2 className="m-0 text-[15px] font-bold tracking-wide text-slate-100">硬件与开发工具</h2>
            <span className="text-xs text-slate-400">烧录、OTA 升级与双通道调试</span>
          </div>
          <div className="flex flex-col gap-2.5">
            {TOOL_LINKS.map((tool) => (
              <Link
                key={tool.to}
                to={tool.to}
                className="flex items-center gap-3 rounded-[14px] border border-[#293856] bg-[#131c31] px-3.5 py-[13px] text-slate-100 no-underline transition hover:border-sky-400/50 hover:bg-[#1e2d4a]"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-white/[0.06] bg-white/[0.05] text-slate-300">
                  <AppIcon name={tool.icon} size={18} />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <div className="text-sm leading-snug font-bold">{tool.title}</div>
                  <div className="text-xs leading-snug text-slate-400">{tool.desc}</div>
                </div>
                <span className="shrink-0 rounded-full border border-sky-400/30 bg-sky-400/12 px-[9px] py-[3px] text-[10.5px] font-bold text-sky-400">
                  {tool.tag}
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <footer className="mt-1.5 flex flex-col items-center gap-3 border-t border-[#293856] pt-[18px] text-center">
        <SocialLinks />
        <div className="text-[11.5px] leading-relaxed text-slate-400">
          AESL0213C · TLSR8250 开源墨水屏工具集 · <span className="font-mono">v{__APP_VERSION__}</span>
          <br />
          支持电脑/安卓 Chrome/Edge，刷入 InkCard 固件后亦支持 iPhone（推荐 Safari + beacio 插件，请勿用 iOS 主屏幕 PWA）
        </div>
      </footer>
    </main>
  );
}
