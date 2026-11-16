"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { inr } from "@/lib/utils/format";

interface Version {
  id: string;
  versionNumber: number;
  label: string | null;
  createdBy: string;
  isFeasible: boolean;
  stopCount: number;
  estimatedPaise: number;
  createdAt: string;
  isActive: boolean;
}

const ORIGIN: Record<string, string> = { GENERATOR: "Generated", REPLAN: "Replan", USER_EDIT: "Your edits" };

export function VersionsDialog({ versions, viewingId, busy, onClose, onView, onRestore }: {
  versions: Version[];
  viewingId: string;
  busy: boolean;
  onClose: () => void;
  onView: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85svh] overflow-y-auto bg-paper p-6 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-3xl font-normal">Compare versions</DialogTitle>
          <DialogDescription>Every generated plan, replan and round of edits is kept. View any version, or restore it as your current plan.</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[30rem] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-[11px] uppercase tracking-[0.14em] text-ink-soft">
                <th scope="col" className="py-2 pr-3 font-semibold">Version</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Stops</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Estimate</th>
                <th scope="col" className="py-2 pr-3 font-semibold">Status</th>
                <th scope="col" className="py-2 font-semibold"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-b border-border align-top">
                  <th scope="row" className="py-3 pr-3 font-normal">
                    <span className="font-semibold">v{v.versionNumber}</span> · {v.label ?? ORIGIN[v.createdBy]}
                    <span className="block text-xs text-ink-soft">
                      {ORIGIN[v.createdBy]} · {new Date(v.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
                    </span>
                  </th>
                  <td className="py-3 pr-3 tabular">{v.stopCount}</td>
                  <td className="py-3 pr-3 tabular">{inr(v.estimatedPaise)}</td>
                  <td className="py-3 pr-3">
                    {v.isActive ? <span className="font-semibold text-forest">Current</span> : v.id === viewingId ? "Viewing" : ""}
                    {!v.isFeasible && <span className="block text-xs text-terracotta-deep">Needs attention</span>}
                  </td>
                  <td className="py-3 text-right">
                    <span className="flex justify-end gap-3">
                      {v.id !== viewingId && <button type="button" disabled={busy} className="font-semibold text-forest underline underline-offset-4" onClick={() => onView(v.id)}>View</button>}
                      {!v.isActive && <button type="button" disabled={busy} className="font-semibold text-forest underline underline-offset-4" onClick={() => onRestore(v.id)}>Restore</button>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
