import { AUTHOR_LINKS } from "../templates";

export function SocialLinks({ align = "center" }: { align?: "center" | "left" }) {
  return (
    <div className={`flex flex-wrap gap-2.5 ${align === "left" ? "justify-start" : "justify-center"}`}>
      <a
        className="inline-flex items-center gap-1.5 rounded-full border border-[#293856] bg-[#131c31] px-3.5 py-[7px] text-[12.5px] font-semibold text-slate-100 no-underline transition hover:border-sky-400 hover:bg-[#1e2d4a]"
        href={AUTHOR_LINKS.github}
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg className="block shrink-0" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 2C6.48 2 2 6.58 2 12.26c0 4.53 2.87 8.37 6.84 9.73.5.09.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.64-1.38-2.22-.26-4.56-1.14-4.56-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.72 0 0 .84-.27 2.75 1.05A9.38 9.38 0 0 1 12 6.84c.85 0 1.7.12 2.5.35 1.91-1.32 2.75-1.05 2.75-1.05.55 1.42.2 2.46.1 2.72.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.8-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.59.69.49A10.02 10.02 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z" />
        </svg>
        <span>GitHub 开源仓库</span>
      </a>
      <a
        className="inline-flex items-center gap-1.5 rounded-full border border-[#293856] bg-[#131c31] px-3.5 py-[7px] text-[12.5px] font-semibold text-slate-100 no-underline transition hover:border-rose-400 hover:bg-[#1e2d4a]"
        href={AUTHOR_LINKS.bilibili}
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg
          className="block shrink-0"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="6" width="18" height="14" rx="3" />
          <path d="m8 3 2.5 3" />
          <path d="m16 3-2.5 3" />
          <path d="M9 12v2" />
          <path d="M15 12v2" />
        </svg>
        <span>Bilibili 主页</span>
      </a>
    </div>
  );
}
