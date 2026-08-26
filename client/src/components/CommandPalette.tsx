import type { LucideIcon } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

type CommandAction = {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  keywords?: string[];
  icon: LucideIcon;
  onSelect: () => void;
};

export function CommandPalette({
  open,
  onOpenChange,
  actions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: CommandAction[];
}) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="命令面板"
      description="搜尋並執行 JavaBase 學習工作台命令。"
      className="max-w-2xl border-slate-950/20 bg-[#f8f4e9] text-slate-950 shadow-2xl"
    >
      <CommandInput placeholder="輸入命令、功能或快捷鍵…" />
      <CommandList className="max-h-[min(60vh,420px)] bg-[#fffdf7] p-2">
        <CommandEmpty className="py-10 text-slate-600">找不到符合的命令。</CommandEmpty>
        <CommandGroup heading="JavaBase 命令">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <CommandItem
                key={action.id}
                value={[action.label, action.description, ...(action.keywords ?? [])].join(" ")}
                onSelect={() => {
                  action.onSelect();
                  onOpenChange(false);
                }}
                className="gap-3 rounded-md px-3 py-3 text-slate-800 data-[selected=true]:bg-teal-700/[0.10] data-[selected=true]:text-teal-950"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-teal-800/15 bg-white text-teal-800">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{action.label}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{action.description}</span>
                </span>
                {action.shortcut && <CommandShortcut className="font-mono text-[10px] text-slate-500">{action.shortcut}</CommandShortcut>}
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
      <div className="flex items-center justify-between border-t border-slate-950/10 bg-[#f8f4e9] px-4 py-2 font-mono text-[10px] text-slate-500">
        <span>↑↓ 選取 · Enter 執行</span>
        <span>Esc 關閉</span>
      </div>
    </CommandDialog>
  );
}

export type { CommandAction };
