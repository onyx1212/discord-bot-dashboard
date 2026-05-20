import { useParams, Link } from "wouter";
import { useGetGuildStats } from "@workspace/api-client-react";
import { Users, Hash, Shield, CircleDot, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function GuildDashboard() {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;

  const { data: stats, isLoading } = useGetGuildStats(guildId);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto w-full">
      <h1 className="text-3xl font-bold mb-2">إحصائيات الخادم (Server Stats)</h1>
      <p className="text-muted-foreground mb-8">نظرة عامة على نشاط الخادم الخاص بك</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="إجمالي الأعضاء" 
          value={stats?.totalMembers || 0} 
          icon={<Users className="w-6 h-6 text-blue-400" />} 
        />
        <StatCard 
          title="الأعضاء المتصلين" 
          value={stats?.onlineMembers || 0} 
          icon={<CircleDot className="w-6 h-6 text-green-400" />} 
        />
        <StatCard 
          title="إجمالي القنوات" 
          value={stats?.totalChannels || 0} 
          icon={<Hash className="w-6 h-6 text-gray-400" />} 
        />
        <StatCard 
          title="إجمالي الرتب" 
          value={stats?.totalRoles || 0} 
          icon={<Shield className="w-6 h-6 text-yellow-400" />} 
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString("en-US")}</div>
      </CardContent>
    </Card>
  );
}