import { LogOut } from "lucide-react";

export function SignOutButton({ className = "", label = "Sign out" }: { className?: string; label?: string }) {
  return (
    <form action="/api/auth/logout" method="post">
      <button type="submit" aria-label={label} title={label} className={`flex h-10 w-10 items-center justify-center rounded-xl ${className}`}>
        <LogOut size={20} />
      </button>
    </form>
  );
}
