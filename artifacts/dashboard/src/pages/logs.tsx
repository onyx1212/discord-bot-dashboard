import { useParams } from "wouter";
import { useListAuditLogs } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Loader2, FileText, UserPlus, UserMinus, ShieldBan, Trash2, Settings, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";

export default function Logs() {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;

  const { data: logs, isLoading } = useListAuditLogs({ guildId });

  return (
    <div className="p-8 max-w-4xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <FileText className="w-8 h-8 text-primary" /> سجل الأحداث (Audit Logs)
          </h1>
          <p className="text-muted-foreground">تتبع جميع النشاطات الهامة في الخادم</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto pr-2 pb-8 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : logs?.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
            السجل فارغ
          </div>
        ) : (
          logs?.map(log => {
            const config = getActionConfig(log.action);
            const Icon = config.icon;
            return (
              <Card key={log.id} className="bg-card border-border overflow-hidden flex items-stretch">
                <div className={`w-1.5 flex-shrink-0 ${config.color}`} />
                <div className="p-4 flex-1 flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-background ${config.iconColor}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold">{config.label}</h3>
                      <span className="text-xs text-muted-foreground" dir="ltr">{format(new Date(log.createdAt), "MMM d, h:mm a")}</span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-1">
                      {log.username && (
                        <div><span className="opacity-70">بواسطة:</span> <span className="font-medium text-foreground" dir="ltr">{log.username}</span></div>
                      )}
                      {log.targetUsername && (
                        <div><span className="opacity-70">الهدف:</span> <span className="font-medium text-foreground" dir="ltr">{log.targetUsername}</span></div>
                      )}
                      {log.reason && (
                        <div><span className="opacity-70">السبب:</span> {log.reason}</div>
                      )}
                      {log.details && (
                        <div className="text-xs mt-2 bg-background p-2 rounded border border-border whitespace-pre-wrap font-mono" dir="ltr">
                          {log.details}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

function getActionConfig(action: string) {
  switch (action) {
    case 'MEMBER_JOIN': return { label: 'انضمام عضو', icon: UserPlus, color: 'bg-green-500', iconColor: 'text-green-500' };
    case 'MEMBER_LEAVE': return { label: 'مغادرة عضو', icon: UserMinus, color: 'bg-orange-500', iconColor: 'text-orange-500' };
    case 'MEMBER_BAN': return { label: 'حظر عضو', icon: ShieldBan, color: 'bg-red-500', iconColor: 'text-red-500' };
    case 'MESSAGE_DELETE': return { label: 'حذف رسالة', icon: Trash2, color: 'bg-red-400', iconColor: 'text-red-400' };
    case 'SETTINGS_UPDATE': return { label: 'تحديث إعدادات', icon: Settings, color: 'bg-blue-500', iconColor: 'text-blue-500' };
    default: return { label: action, icon: MessageSquare, color: 'bg-gray-500', iconColor: 'text-gray-500' };
  }
}