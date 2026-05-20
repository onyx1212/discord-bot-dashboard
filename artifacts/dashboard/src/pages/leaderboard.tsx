import { useParams } from "wouter";
import { useGetLeaderboard } from "@workspace/api-client-react";
import { Loader2, Trophy, Medal, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Leaderboard() {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;

  const { data: leaderboard, isLoading } = useGetLeaderboard({ guildId });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
      <div className="text-center mb-10 flex-shrink-0">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-4">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-bold mb-2">لوحة الصدارة (Leaderboard)</h1>
        <p className="text-muted-foreground">أكثر الأعضاء تفاعلاً في الخادم</p>
      </div>

      <div className="flex-1 overflow-auto -mx-4 px-4 pb-8 space-y-3">
        {leaderboard?.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
            لا توجد بيانات متاحة
          </div>
        ) : (
          leaderboard?.map((entry, index) => {
            const isTop3 = index < 3;
            return (
              <div 
                key={entry.id} 
                className={cn(
                  "flex items-center p-4 rounded-xl border transition-all",
                  index === 0 ? "bg-amber-500/10 border-amber-500/30 text-amber-500" :
                  index === 1 ? "bg-slate-300/10 border-slate-300/30 text-slate-300" :
                  index === 2 ? "bg-orange-700/10 border-orange-700/30 text-orange-700" :
                  "bg-card border-border text-foreground hover:bg-secondary/50"
                )}
              >
                <div className="w-12 text-center font-bold text-xl flex-shrink-0">
                  {index === 0 ? <Trophy className="w-6 h-6 mx-auto" /> :
                   index === 1 ? <Medal className="w-6 h-6 mx-auto" /> :
                   index === 2 ? <Medal className="w-6 h-6 mx-auto" /> :
                   `#${index + 1}`}
                </div>
                
                <div className="flex-1 flex items-center gap-4 pr-4">
                  <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center font-bold">
                    {entry.username.substring(0, 2)}
                  </div>
                  <div className="font-bold text-lg" dir="ltr">{entry.username}</div>
                </div>

                <div className="flex items-center gap-8 pl-4">
                  <div className="text-center">
                    <div className="text-xs opacity-70 uppercase tracking-wider mb-1 font-semibold">المستوى</div>
                    <div className="font-bold flex items-center gap-1">
                      <Star className="w-4 h-4" /> {entry.level}
                    </div>
                  </div>
                  <div className="text-center min-w-[80px]">
                    <div className="text-xs opacity-70 uppercase tracking-wider mb-1 font-semibold">الخبرة</div>
                    <div className="font-bold">{entry.xp.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}