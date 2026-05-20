import { useState } from "react";
import { useParams } from "wouter";
import { useListGiveaways, useCreateGiveaway, useListChannels } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Loader2, Gift, Plus, Users, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const formSchema = z.object({
  prize: z.string().min(1, "يرجى كتابة الجائزة"),
  winnersCount: z.coerce.number().min(1, "يجب أن يكون فائز واحد على الأقل").default(1),
  durationHours: z.coerce.number().min(0).default(24),
  durationMinutes: z.coerce.number().min(0).max(59).default(0),
  channelId: z.string().min(1, "يرجى اختيار القناة"),
});

export default function Giveaways() {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId!;
  
  const [open, setOpen] = useState(false);

  const { data: giveaways, isLoading } = useListGiveaways({ guildId });
  const { data: channels } = useListChannels(guildId);
  const createGiveaway = useCreateGiveaway();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      prize: "",
      winnersCount: 1,
      durationHours: 24,
      durationMinutes: 0,
      channelId: "",
    }
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    const durationMs = (data.durationHours * 60 * 60 * 1000) + (data.durationMinutes * 60 * 1000);
    if (durationMs <= 0) {
      toast.error("مدة السحب يجب أن تكون أكبر من صفر");
      return;
    }

    createGiveaway.mutate({
      data: {
        guildId,
        channelId: data.channelId,
        prize: data.prize,
        winnersCount: data.winnersCount,
        durationMs,
        hostId: "DASHBOARD_USER", // Mocked since we don't have auth context in this snippet
        hostUsername: "Admin",
      }
    }, {
      onSuccess: () => {
        toast.success("تم بدء السحب بنجاح");
        setOpen(false);
        form.reset();
      },
      onError: () => toast.error("حدث خطأ أثناء بدء السحب")
    });
  };

  const textChannels = channels?.filter(c => c.type === 'GUILD_TEXT') || [];

  return (
    <div className="p-8 max-w-6xl mx-auto w-full flex-1 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <Gift className="w-8 h-8 text-primary" /> السحوبات (Giveaways)
          </h1>
          <p className="text-muted-foreground">إدارة الهدايا والسحوبات في الخادم</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> سحب جديد</Button>
          </DialogTrigger>
          <DialogContent dir="rtl" className="bg-card border-border sm:max-w-md">
            <DialogHeader>
              <DialogTitle>إنشاء سحب جديد</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="prize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الجائزة</FormLabel>
                      <FormControl>
                        <Input className="bg-background" placeholder="نيترو قيمنق شهر..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="channelId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>القناة</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="اختر القناة..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {textChannels.map((c) => (
                            <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="durationHours"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المدة (ساعات)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="durationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المدة (دقائق)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" max="59" className="bg-background" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="winnersCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>عدد الفائزين</FormLabel>
                      <FormControl>
                        <Input type="number" min="1" className="bg-background" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full mt-4" disabled={createGiveaway.isPending}>
                  {createGiveaway.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "بدء السحب"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-auto -mx-4 px-4 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : giveaways?.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-border rounded-xl text-muted-foreground">
            لا توجد سحوبات سابقة أو حالية
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {giveaways?.map(g => {
              const endDate = new Date(g.endsAt);
              return (
                <Card key={g.id} className="bg-card border-border overflow-hidden">
                  <div className={`h-2 w-full ${g.active ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{g.prize}</CardTitle>
                      <Badge variant={g.active ? "default" : "secondary"} className={g.active ? "bg-green-500 hover:bg-green-600" : ""}>
                        {g.active ? "نشط" : "منتهي"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-4 h-4" /> 
                      {g.active ? `ينتهي في ${formatDistanceToNow(endDate)}` : `انتهى في ${format(endDate, "yyyy/MM/dd")}`}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" /> الفائزين: {g.winnersCount}
                    </div>
                  </CardContent>
                  <CardFooter className="bg-secondary/30 py-3 px-6 border-t border-border flex justify-between items-center text-xs text-muted-foreground">
                    <span dir="ltr">بواسطة: {g.hostUsername}</span>
                    <span className="truncate max-w-[120px]" title={g.winners?.join(', ')}>
                      {!g.active && g.winners && g.winners.length > 0 ? (
                        <span className="text-primary font-bold">الفائز: {g.winners[0]}</span>
                      ) : null}
                    </span>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}