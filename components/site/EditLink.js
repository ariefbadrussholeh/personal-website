import Link from "next/link";
import { PencilSimple } from "@phosphor-icons/react/dist/ssr";

/** Shown only to a signed-in admin, links straight to the editor. */
export default function EditLink({ href, draft }) {
  return (
    <div className="mb-8 flex flex-wrap items-center gap-3 rounded-[10px] border border-line bg-surface px-4 py-3 text-sm">
      {draft && <span className="text-muted">This is a draft. Only you can see it.</span>}
      <Link href={href} className="btn btn-sm ml-auto">
        <PencilSimple size={14} /> Edit
      </Link>
    </div>
  );
}
