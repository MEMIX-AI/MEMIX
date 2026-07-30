"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { EditProfileModal, type EditableProfile } from "@/components/EditProfileModal";

export function ProfileEditButton({
  profile,
  walletAddress,
}: {
  profile: EditableProfile;
  walletAddress: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-line bg-panel px-4 py-2.5 text-[13.5px] font-semibold text-text shadow-soft transition-all duration-250 hover:border-accent/40 hover:text-accent sm:absolute sm:right-6 sm:top-6"
      >
        <span className="inline-flex items-center gap-1.5">
          <Pencil size={14} strokeWidth={1.75} />
          Edit profile
        </span>
      </button>
      {open && (
        <EditProfileModal
          profile={profile}
          walletAddress={walletAddress}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
