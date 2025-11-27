"use client";

import { LoginButton } from "@/src/features/auth/components/LoginButton";
import { UserMenu } from "@/src/features/auth/components/UserMenu";
import { useAuth } from "@/src/features/auth/hooks/useAuth";

type ProfileSectionProps = {
  isCollapsed: boolean;
};

export function ProfileSection({ isCollapsed }: ProfileSectionProps) {
  const { user, signOut } = useAuth();

  return (
    <div
      className={`border-t border-(--border-subtle) ${
        isCollapsed ? "px-3 py-3" : "px-4 py-4"
      }`}
    >
      <div className={isCollapsed ? "flex justify-center" : undefined}>
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
