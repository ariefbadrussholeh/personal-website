import { ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { experienceDuration, experienceRange } from "@/lib/format";
import { getBrandIcon } from "@/lib/icons";
import TechIcon from "./TechIcon";
import Reveal from "./Reveal";

/** Work history on a vertical rail. `compact` trims highlights for the home page. */
export default function ExperienceTimeline({ items, compact = false }) {
  return (
    <ol className="timeline relative ml-1 border-l border-line-strong">
      {items.map((job, i) => {
        const highlights = compact ? job.highlights.slice(0, 2) : job.highlights;
        const duration = experienceDuration(job);
        const brandIcon = job.icon ? getBrandIcon(job.icon) : null;
        const hasIcon = Boolean(job.icon);
        return (
          <li key={job.id} className="relative pb-8 pl-8 last:pb-0 md:pl-10">
            <span className="absolute left-0 top-[2.1rem] h-px w-6 bg-line-strong md:w-8" aria-hidden />
            <Reveal delay={i * 0.05} y={12}>
              <div
                data-spotlight
                className="spot t-item grid gap-x-10 gap-y-3 rounded-[10px] p-5 md:grid-cols-[10.5rem_1fr] md:p-6"
              >
                <div className="font-mono text-sm leading-relaxed text-faint">
                  <p>{experienceRange(job)}</p>
                  {duration && <p className="mt-1 text-muted">{duration}</p>}
                </div>

                <div className="flex items-start gap-4">
                  {hasIcon && (
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[8px] border border-line bg-surface-2 p-1.5 text-ink">
                      {brandIcon ? (
                        <TechIcon icon={brandIcon} size={22} />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={job.icon} alt="" className="h-full w-full object-contain" />
                      )}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-semibold tracking-tight">{job.role || "Role"}</h3>
                    <p className="mt-1 text-[15px] text-muted">
                      {job.url ? (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-ink transition-colors hover:text-accent"
                        >
                          {job.company} <ArrowUpRight size={14} />
                        </a>
                      ) : (
                        <span className="text-ink">{job.company}</span>
                      )}
                      {job.location && <span>, {job.location}</span>}
                    </p>

                    {highlights.length > 0 && (
                      <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-muted">
                        {highlights.map((h) => (
                          <li key={h} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-px before:w-3 before:bg-accent">
                            {h}
                          </li>
                        ))}
                      </ul>
                    )}

                    {job.tech.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {job.tech.map((t) => (
                          <span key={t} className="chip">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Reveal>
          </li>
        );
      })}
    </ol>
  );
}
