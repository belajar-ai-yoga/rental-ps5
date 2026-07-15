import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { authOptions } from "@/lib/auth";

export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/admin/login");
  return session;
}

export async function AdminShell({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin-body min-h-screen md:flex">
      <AdminNav />
      <main className="flex-1 p-5 md:p-8">{children}</main>
    </div>
  );
}
