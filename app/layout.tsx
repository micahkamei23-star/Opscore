import type { Metadata } from "next";
import "./globals.css";
import { Sidebar, TopBar } from "@/presentation/components/ui/Navigation";
import { NotificationToaster } from "@/presentation/components/ui/Notifications";

export const metadata: Metadata = {
  title: "OPSCORE — Life Operating System",
  description: "Elite personal operations system: fitness, tasks, habits, skills, and focus tracking.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-white antialiased font-sans">
        <Sidebar />
        <TopBar />
        <main className="lg:ml-64 pt-16 min-h-screen">
          <div className="p-4 lg:p-8">{children}</div>
        </main>
        <NotificationToaster />
      </body>
    </html>
  );
}
