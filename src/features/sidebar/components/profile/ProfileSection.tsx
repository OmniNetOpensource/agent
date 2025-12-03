"use client";

import { UserMenu } from "./UserMenu";
import { GuestMenu } from "./GuestMenu";
import { useAuth } from "@/src/features/auth/hooks/useAuth";

type ProfileSectionProps = {
  isCollapsed: boolean;
};

export function ProfileSection({ isCollapsed }: ProfileSectionProps) {
  const { user, signOut } = useAuth();

  return (
    <div className={`px-2 py-4`}>
      <div className={"flex justify-center"}>
        {user ? (
          <UserMenu
            user={user}
            onSignOut={async () => {
              await signOut();
            }}
            isCollapsed={isCollapsed}
          />
        ) : (
          <GuestMenu isCollapsed={isCollapsed} />
        )}
      </div>
    </div>
  );
}
