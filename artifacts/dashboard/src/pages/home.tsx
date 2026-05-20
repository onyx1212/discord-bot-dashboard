import { useListGuilds } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { data: guilds, isLoading } = useListGuilds();

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#5865F2]" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-3xl font-bold mb-2">Select a Server</h1>
      <p className="text-[#949BA4] mb-8">Choose a server to configure and manage its settings.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guilds?.map((guild) => (
          <Card key={guild.id} className="bg-[#2B2D31] border-[#1E1F22] hover:border-[#5865F2] transition-colors group">
            <CardHeader className="flex flex-row items-center gap-4 pb-4">
              <Avatar className="w-16 h-16 rounded-[16px]">
                {guild.icon ? (
                  <AvatarImage src={guild.icon} alt={guild.name} />
                ) : (
                  <AvatarFallback className="bg-[#1E1F22] text-xl">{guild.name.substring(0, 2)}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg truncate">{guild.name}</CardTitle>
                <div className="text-sm text-[#949BA4] mt-1">{guild.memberCount} members</div>
              </div>
            </CardHeader>
            <CardContent>
              <Link href={`/guilds/${guild.id}`}>
                <Button className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white">
                  Manage Server
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
        {guilds?.length === 0 && (
          <div className="col-span-full text-center py-12 text-[#949BA4]">
            No servers found. Make sure the bot is invited to your server.
          </div>
        )}
      </div>
    </div>
  );
}