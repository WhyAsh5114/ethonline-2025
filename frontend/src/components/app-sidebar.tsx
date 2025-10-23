"use client";

import { IconKey, IconLayoutDashboard } from "@tabler/icons-react";
import { CheckCircle2, Rocket, Send, Shield, ShieldCheck } from "lucide-react";
import type * as React from "react";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Main",
      url: "#",
      items: [
        {
          title: "Dashboard",
          url: "/dashboard",
          icon: IconLayoutDashboard,
        },
        {
          title: "Authenticator",
          url: "/authenticator",
          icon: IconKey,
        },
      ],
    },
    {
      title: "Workflow",
      url: "#",
      icon: Shield,
      items: [
        {
          title: "TOTP Setup",
          url: "/dashboard/setup",
          icon: ShieldCheck,
        },
        {
          title: "Deploy Wallet",
          url: "/dashboard/deploy",
          icon: Rocket,
        },
        {
          title: "Verify Proof",
          url: "/dashboard/verify",
          icon: CheckCircle2,
        },
        {
          title: "Execute Transaction",
          url: "/dashboard/execute",
          icon: Send,
        },
      ],
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <Shield className="!size-5" />
                <span className="text-base font-semibold">ChronoVault</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
