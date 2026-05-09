"use client";

// Dropdown picker for /admin/attendance. Selecting a family pushes the
// chosen family_id into the URL as ?family=<id>; the server component
// re-renders with that family's attendance stats.

import { useRouter, useSearchParams } from "next/navigation";

export type AttendanceFamilyOption = {
  id: string;
  label: string; // e.g. "Ravi Sharma — ravi@gmail.com"
};

export default function AdminAttendanceFamilyPicker({
  families,
  selectedId,
}: {
  families: AttendanceFamilyOption[];
  selectedId: string | null;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function onChange(id: string) {
    const next = new URLSearchParams(params.toString());
    if (id) {
      next.set("family", id);
    } else {
      next.delete("family");
    }
    router.push(`/admin/attendance?${next.toString()}`);
    router.refresh();
  }

  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-saffron-700">
        Choose a family
      </span>
      <select
        value={selectedId ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full md:w-[420px] rounded-md border-gray-300 shadow-sm focus:border-saffron-500 focus:ring-saffron-500"
      >
        <option value="">— Select a family —</option>
        {families.map((f) => (
          <option key={f.id} value={f.id}>
            {f.label}
          </option>
        ))}
      </select>
    </label>
  );
}
