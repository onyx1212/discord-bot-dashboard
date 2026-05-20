import { useState } from "react";
import { useParams } from "wouter";
import { useListTickets, useListTicketMessages } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Loader2, Ticket as TicketIcon, Clock, Lock, User, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Tickets() {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);

  const { data: tickets, isLoading } = useListTickets({
    guildId,
    status: statusFilter !== "all" ? statusFilter : undefined
  });

  return (
    <div className="p-8 max-w-6xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold mb-2">نظام التذاكر (Tickets)</h1>
          <p className="text-muted-foreground">إدارة تذاكر الدعم الفني للأعضاء</p>
        </div>
        <div className="w-48">
          <Select value={statusFilter} onValueChange={setStatusFilter} dir="rtl">
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="حالة التذكرة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع التذاكر</SelectItem>
              <SelectItem value="open">مفتوحة</SelectItem>
              <SelectItem value="closed">مغلقة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <ScrollArea className="flex-1 -mx-8 px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-8">
            {tickets?.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                لا توجد تذاكر متوفرة
              </div>
            ) : (
              tickets?.map(ticket => (
                <Card 
                  key={ticket.id} 
                  className="bg-card border-border hover:border-primary/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <CardHeader className="pb-3 flex flex-row items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <TicketIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold">تذكرة #{ticket.id}</div>
                        <div className="text-sm text-muted-foreground">{ticket.username}</div>
                      </div>
                    </div>
                    <Badge variant={ticket.status === 'open' ? 'default' : 'secondary'} className={ticket.status === 'open' ? 'bg-green-500 hover:bg-green-600' : ''}>
                      {ticket.status === 'open' ? 'مفتوحة' : 'مغلقة'}
                    </Badge>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground flex items-center gap-4">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {format(new Date(ticket.createdAt), "MMM d, yyyy")}</span>
                    {ticket.category && <span className="flex items-center gap-1.5"><Lock className="w-4 h-4" /> {ticket.category}</span>}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {selectedTicketId && (
        <TicketSlideover 
          ticketId={selectedTicketId} 
          ticket={tickets?.find(t => t.id === selectedTicketId)}
          onClose={() => setSelectedTicketId(null)} 
        />
      )}
    </div>
  );
}

function TicketSlideover({ ticketId, ticket, onClose }: { ticketId: number, ticket?: any, onClose: () => void }) {
  const { data: messages, isLoading } = useListTicketMessages(ticketId);

  return (
    <Sheet open={!!ticketId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-md border-l-border bg-background sm:border-l sm:p-0 flex flex-col" dir="rtl">
        <SheetHeader className="p-6 border-b border-border bg-card">
          <SheetTitle className="flex items-center gap-2">
            <TicketIcon className="w-5 h-5 text-primary" />
            تذكرة #{ticketId}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-4 pt-2">
            <span className="flex items-center gap-1"><User className="w-4 h-4" /> {ticket?.username}</span>
            {ticket?.status === 'closed' && <span className="flex items-center gap-1 text-red-400"><CheckCircle2 className="w-4 h-4" /> مغلقة</span>}
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 p-6">
          {isLoading ? (
             <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : messages?.length === 0 ? (
             <div className="py-8 text-center text-muted-foreground">لا توجد رسائل مسجلة</div>
          ) : (
            <div className="space-y-6">
              {messages?.map(msg => (
                <div key={msg.id} className="flex gap-4">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="bg-primary/20 text-primary">{msg.username.substring(0,2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="font-semibold text-sm">{msg.username}</span>
                      <span className="text-xs text-muted-foreground">{format(new Date(msg.createdAt), "h:mm a")}</span>
                    </div>
                    <div className="text-sm bg-card p-3 rounded-md border border-border whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}