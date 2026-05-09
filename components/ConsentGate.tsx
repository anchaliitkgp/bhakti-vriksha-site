"use client";

// ConsentGate — the single data-sharing consent checkbox that sits at the
// bottom of <FamilyRegistrationForm>. Controlled: parent owns `checked` so
// it can key the Submit button off this state (FR-13.2).
//
// The copy is intentionally concrete about *what* is being shared and *why*
// so the primary understands what they're confirming on behalf of minors.

import { useId } from "react";

export interface ConsentGateProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Label override for the edit-flow ("Re-confirm ...") */
  label?: string;
  disabled?: boolean;
}

export default function ConsentGate({
  checked,
  onChange,
  label,
  disabled,
}: ConsentGateProps) {
  const id = useId();
  const text =
    label ??
    "I confirm I am authorised to share my family's details (including minors) with the Bhakti Vriksha Radha Madan Mohan programme organisers for programme attendance, communications, and celebrations.";

  return (
    <div className="mt-8 pt-6 border-t border-saffron-100">
      <label
        htmlFor={id}
        className="flex items-start gap-3 cursor-pointer text-sm text-gray-800 leading-relaxed"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 w-5 h-5 text-krishna-600 border-gray-300 rounded focus-visible:ring-2 focus-visible:ring-saffron-500"
          aria-describedby={`${id}-note`}
        />
        <span>
          <span className="font-medium text-krishna-800">Consent:</span>{" "}
          {text}
        </span>
      </label>
      <p id={`${id}-note`} className="mt-2 ml-8 text-xs text-gray-500">
        You can contact the programme coordinator at any time to update or
        remove your family's details.
      </p>
    </div>
  );
}
