"use client";

import { deletePropertyAction } from "@/lib/actions/properties";

export default function DeletePropertyButton({ propertyId }: { propertyId: string }) {
  const action = deletePropertyAction.bind(null, propertyId);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Remove this property?")) e.preventDefault();
      }}
    >
      <button
        type="submit"
        className="btn ghost"
        style={{ padding: "6px 16px", fontSize: 13 }}
      >
        Remove
      </button>
    </form>
  );
}
