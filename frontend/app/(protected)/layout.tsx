import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { LogoutButton } from "@/components/layout/logout-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 fixed left-0 top-0 h-screen bg-[#f4f3f5] border-r border-border/40 flex flex-col py-6 z-50">
        <div className="px-6 mb-10">
          <Link href="/dashboard">
            <h1 className="font-serif text-2xl text-[#00152a]">LiftProof</h1>
            <p className="uppercase tracking-wider text-[10px] font-semibold text-muted-foreground mt-0.5">
              Enterprise Analytics
            </p>
          </Link>
        </div>

        <SidebarNav />

        <div className="px-6 pt-4 border-t border-border/40">
          <p className="text-xs text-muted-foreground truncate mb-2">
            {user.email}
          </p>
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 ml-64 overflow-auto bg-[#faf9fb]">
        <div className="p-12">
          {children}
        </div>
      </main>
    </div>
  );
}
