"use client";

// Tab strip for /admin/registrations. Uses router.push() + refresh() so
// every click re-runs the server component fresh rather than using a
// potentially stale RSC cache.

import { useRouter } from "next/navigation";

export type Tab = "Pending" | "Approved" | "Rejected";

export interface RegistrationTabsProps {
  active: Tab;
  pending: number;
  approved: number;
  rejected: number;
}

export default function RegistrationTabs({
  active,
  pending,
  approved,
  rejected,
}: RegistrationTabsProps) {
  const router = useRouter();
  const tabs: Array<{ tab: Tab; count: number }> = [
    { tab: "Pending", count: pending },
    { tab: "Approved", count: approved },
    { tab: "Rejected", count: rejected },
  ];

  function goTo(tab: Tab) {
    router.push(`/admin/registrations?tab=${tab}`);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {tabs.map(({ tab, count }) => (
        <button
          key={tab}
          type="button"
          onClick={() => goTo(tab)}
          className={`text-sm px-3 py-1.5 rounded-full border transition ${
            active === tab
              ? "bg-krishna-700 text-white border-krishna-700"
              : "bg-white text-krishna-700 border-saffron-300 hover:bg-saffron-50"
          }`}
        >
          {tab} ({count})
        </button>
      ))}
    </div>
  );
}
