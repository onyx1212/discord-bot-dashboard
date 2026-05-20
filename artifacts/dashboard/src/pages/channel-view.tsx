import { useParams } from "wouter";
import { useSendMessage, useSetupTicketPanel } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Send, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const messageSchema = z.object({
  content: z.string().min(1, "يرجى كتابة الرسالة"),
  imageUrl: z.string().url("يجب أن يكون رابط صحيح").optional().or(z.literal("")),
});

export default function ChannelView() {
  const params = useParams<{ guildId: string, channelId: string }>();
  const { guildId, channelId } = params;

  const sendMessage = useSendMessage();
  const setupPanel = useSetupTicketPanel();

  const form = useForm<z.infer<typeof messageSchema>>({
    resolver: zodResolver(messageSchema),
    defaultValues: {
      content: "",
      imageUrl: "",
    }
  });

  const onSend = (data: z.infer<typeof messageSchema>) => {
    sendMessage.mutate({
      channelId,
      data: {
        content: data.content,
        imageUrl: data.imageUrl || undefined
      }
    }, {
      onSuccess: () => {
        toast.success("تم إرسال الرسالة بنجاح");
        form.reset();
      },
      onError: () => toast.error("فشل إرسال الرسالة")
    });
  };

  const handleSetupPanel = () => {
    setupPanel.mutate({ channelId, data: { guildId } }, {
      onSuccess: () => toast.success("تم إعداد لوحة التذاكر بنجاح"),
      onError: () => toast.error("فشل إعداد لوحة التذاكر")
    });
  };

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-3xl font-bold mb-2">إدارة القناة (Channel Management)</h1>
      <p className="text-muted-foreground mb-8">إرسال رسائل أو إعداد لوحات تفاعلية في القناة المحددة</p>

      <div className="space-y-8">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>إرسال رسالة كالبوت</CardTitle>
            <CardDescription>ستظهر الرسالة كأن البوت هو من كتبها</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSend)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="content"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>محتوى الرسالة</FormLabel>
                      <FormControl>
                        <Textarea className="bg-background min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>رابط صورة (اختياري)</FormLabel>
                      <FormControl>
                        <Input dir="ltr" className="bg-background text-left" placeholder="https://..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={sendMessage.isPending} className="gap-2">
                  {sendMessage.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  إرسال الرسالة
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>أدوات القناة</CardTitle>
            <CardDescription>أدوات سريعة لإعداد القناة</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSetupPanel} disabled={setupPanel.isPending} variant="secondary" className="gap-2">
              {setupPanel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              إعداد لوحة التذاكر هنا
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}