"use client";

import { LoginButton } from "./LoginButton";
import { UserMenu } from "./UserMenu";
import { useAuth } from "@/src/features/auth/hooks/useAuth";

type ProfileSectionProps = {
  isCollapsed: boolean;
};

export function ProfileSection({ isCollapsed }: ProfileSectionProps) {
  const { user, signOut } = useAuth();

  return (
    <div className={`px-2 py-4`}>
      <div className={"flex justify-center" }>
        {user ? (
          <UserMenu
            user={user}
            onSignOut={async () => {
              await signOut();
            }}
            isCollapsed={isCollapsed}
          />
        ) : (
          <LoginButton isCollapsed={isCollapsed} />
        )}
      </div>
    </div>
  );
}
