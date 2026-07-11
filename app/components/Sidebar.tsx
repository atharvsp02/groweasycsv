"use client";
import {
  LayoutDashboard, UserPlus, Users, MessageCircle, Users2, Radio,
  Megaphone, MessageSquare, PhoneCall, SlidersHorizontal, KeyRound,
  Briefcase, Sprout, type LucideIcon,
} from "lucide-react";

interface NavEntry { icon: LucideIcon; label: string; active?: boolean }

const MAIN: NavEntry[] = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: UserPlus, label: "Generate Leads" },
  { icon: Users, label: "Manage Leads" },
  { icon: MessageCircle, label: "Engage Leads" },
];
const CONTROL: NavEntry[] = [
  { icon: Users2, label: "Team Members" },
  { icon: Radio, label: "Lead Sources", active: true },
  { icon: Megaphone, label: "Ad Accounts" },
  { icon: MessageSquare, label: "WhatsApp Account" },
  { icon: PhoneCall, label: "Tele Calling" },
  { icon: SlidersHorizontal, label: "CRM Fields" },
  { icon: KeyRound, label: "API Center" },
  { icon: Briefcase, label: "Business Center" },
];

function NavItem({ icon: Icon, label, active }: NavEntry) {
  const base = "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm";
  if (active) {
    return (
      <div aria-current="page" className={`${base} bg-gray-100 text-gray-900 font-medium dark:bg-gray-800 dark:text-gray-100`}>
        <Icon className="w-4 h-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
    );
  }
  return (
    <div className={`${base} cursor-default text-gray-400 dark:text-gray-500`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{label}</span>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col gap-6 border-r border-gray-200 bg-white p-4 sticky top-0 h-screen self-start overflow-y-auto dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 px-2">
        <div className="grid place-items-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-brand to-teal-brand-2 text-white">
          <Sprout className="w-4 h-4" />
        </div>
        <span className="font-bold text-lg">GrowEasy</span>
      </div>

      <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
        <p className="text-sm font-medium">VK Test</p>
        <p className="text-xs text-gray-400 dark:text-gray-400">Owner</p>
      </div>

      <nav className="flex flex-col gap-1">
        <p className="px-3 pb-1 text-xs font-semibold tracking-wide text-gray-400 dark:text-gray-400">MAIN</p>
        {MAIN.map((i) => <NavItem key={i.label} {...i} />)}
        <p className="px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-gray-400 dark:text-gray-400">CONTROL CENTER</p>
        {CONTROL.map((i) => <NavItem key={i.label} {...i} />)}
      </nav>
    </aside>
  );
}
