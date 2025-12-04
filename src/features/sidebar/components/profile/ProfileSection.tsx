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
    <div
      className="py-4 transition-all duration-500"
      style={{
        paddingLeft: isCollapsed ? 4 : 8,
        paddingRight: isCollapsed ? 4 : 8,
      }}
    >
      <div className="flex">
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
