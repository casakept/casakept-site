"use client";

export default function DeleteTimeOffButton({ action }: { action: () => Promise<void> }) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Remove this time off?")) e.preventDefault();
      }}
    >
      <button type="submit" className="btn ghost" style={{ padding: "6px 16px", fontSize: 13 }}>
        Remove
      </button>
    </form>
  );
}
