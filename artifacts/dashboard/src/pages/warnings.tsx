import { useParams } from "wouter";
import { useListWarnings } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Loader2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Warnings() {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;

  const { data: warnings, isLoading } = useListWarnings({ guildId });

  return (
    <div className="p-8 max-w-6xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            الإنذارات (Warnings)
          </h1>
          <p className="text-muted-foreground">سجل إنذارات الأعضاء في الخادم</p>
        </div>
      </div>

      <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table dir="rtl">
              <TableHeader className="bg-background/50 sticky top-0">
                <TableRow className="border-border">
                  <TableHead className="w-[200px] text-right">العضو</TableHead>
                  <TableHead className="text-right">السبب</TableHead>
                  <TableHead className="w-[120px] text-center">عدد الإنذارات</TableHead>
                  <TableHead className="w-[180px] text-left">التاريخ</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {warnings?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      لا توجد إنذارات مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  warnings?.map(warning => (
                    <TableRow key={warning.id} className="border-border">
                      <TableCell className="font-medium flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs">
                          {warning.username.substring(0, 2)}
                        </div>
                        <span dir="ltr">{warning.username}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{warning.reason}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={warning.count > 2 ? "destructive" : "secondary"}>
                          {warning.count}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-left text-sm text-muted-foreground" dir="ltr">
                        {format(new Date(warning.createdAt), "yyyy/MM/dd HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}