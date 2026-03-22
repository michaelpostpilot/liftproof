import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { LogoutButton } from "@/components/layout/logout-button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { CopilotProvider } from "@/components/copilot/copilot-provider";
import { CopilotSidebar } from "@/components/copilot/copilot-sidebar";

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
    <CopilotProvider>
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 fixed left-0 top-0 h-screen bg-white border-r border-[rgba(0,0,0,0.08)] flex flex-col py-6 z-50">
          <div className="px-6 mb-10">
            <Link href="/dashboard">
              <h1 className="font-serif text-2xl text-[#0B1D2E]">LiftProof</h1>
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
        <main className="flex-1 ml-64 overflow-auto bg-[#F8F6F1]">
          <div className="p-12">
            {children}
          </div>
        </main>

        {/* AI Copilot */}
        <CopilotSidebar />
      </div>
    </CopilotProvider>
  );
}
