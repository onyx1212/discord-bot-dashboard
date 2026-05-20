import { useRoute, Link, useParams } from "wouter";
import { useListGuilds } from "@workspace/api-client-react";
import { Settings, MessageSquare, AlertTriangle, Trophy, Gift, FileText, ChevronRight, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [match] = useRoute("/guilds/:guildId/*?");
  const params = useParams<{ guildId?: string }>();
  const guildId = params?.guildId;

  const { data: guilds } = useListGuilds();
  const currentGuild = guilds?.find(g => g.id === guildId);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Global Sidebar (Guild Switcher) */}
      <div className="w-[72px] bg-[#1E1F22] flex-shrink-0 flex flex-col items-center py-3 gap-2 overflow-y-auto">
        <Link href="/">
          <div className={cn("w-12 h-12 rounded-[24px] bg-[#313338] hover:bg-[#5865F2] hover:rounded-[16px] transition-all duration-200 flex items-center justify-center cursor-pointer text-white", !match && "bg-[#5865F2] rounded-[16px]")}>
            <LayoutDashboard size={24} />
          </div>
        </Link>
        
        <div className="w-8 h-[2px] bg-[#313338] rounded-full my-1" />

        {guilds?.map(guild => (
          <Link key={guild.id} href={`/guilds/${guild.id}`}>
            <div className="relative group flex justify-center w-full">
              {guildId === guild.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-white rounded-r-full" />
              )}
              {guildId !== guild.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-0 bg-white rounded-r-full transition-all duration-200 group-hover:h-5" />
              )}
              <Avatar className={cn("w-12 h-12 transition-all duration-200 cursor-pointer", guildId === guild.id ? "rounded-[16px]" : "rounded-[24px] group-hover:rounded-[16px]")}>
                {guild.icon ? (
                  <AvatarImage src={guild.icon} alt={guild.name} />
                ) : (
                  <AvatarFallback className="bg-[#313338] text-white group-hover:bg-[#5865F2] group-hover:text-white transition-colors duration-200">{guild.name.substring(0, 2)}</AvatarFallback>
                )}
              </Avatar>
            </div>
          </Link>
        ))}
      </div>

      {/* Context Sidebar */}
      {guildId && (
        <div className="w-60 bg-[#2B2D31] flex-shrink-0 flex flex-col">
          <div className="h-12 flex items-center px-4 shadow-sm border-b border-[#1E1F22] font-bold truncate">
            {currentGuild?.name || "Loading..."}
          </div>
          <ScrollArea className="flex-1 px-2 py-3">
            <div className="space-y-[2px]">
              <SidebarItem href={`/guilds/${guildId}`} icon={<LayoutDashboard size={20} />} label="Overview" exact />
              <SidebarItem href={`/guilds/${guildId}/settings`} icon={<Settings size={20} />} label="Settings" />
              <SidebarItem href={`/guilds/${guildId}/tickets`} icon={<MessageSquare size={20} />} label="Tickets" />
              <SidebarItem href={`/guilds/${guildId}/warnings`} icon={<AlertTriangle size={20} />} label="Warnings" />
              <SidebarItem href={`/guilds/${guildId}/leaderboard`} icon={<Trophy size={20} />} label="Leaderboard" />
              <SidebarItem href={`/guilds/${guildId}/giveaways`} icon={<Gift size={20} />} label="Giveaways" />
              <SidebarItem href={`/guilds/${guildId}/logs`} icon={<FileText size={20} />} label="Audit Logs" />
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 bg-[#313338] flex flex-col overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}

function SidebarItem({ href, icon, label, exact = false }: { href: string, icon: React.ReactNode, label: string, exact?: boolean }) {
  const [match] = useRoute(exact ? href : `${href}/*`);

  return (
    <Link href={href}>
      <div className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-[4px] cursor-pointer transition-colors text-[#949BA4] hover:bg-[#3F4147] hover:text-[#DBDEE1]",
        match && "bg-[#404249] text-white"
      )}>
        {icon}
        <span className="font-medium text-[15px]">{label}</span>
      </div>
    </Link>
  );
}