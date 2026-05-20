import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetGuildSettings, useUpdateGuildSettings, useListChannels, useListRoles, useSendWelcomeTest } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Save, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const formSchema = z.object({
  welcomeEnabled: z.boolean().default(false),
  welcomeChannelId: z.string().nullable().optional(),
  welcomeTitle: z.string().default("Welcome!"),
  welcomeMessage: z.string().default("Welcome {user} to {server}! We now have {memberCount} members."),
  welcomeColor: z.string().default("#5865F2"),
  welcomeShowAvatar: z.boolean().default(true),
  
  autoRoleEnabled: z.boolean().default(false),
  autoRoleId: z.string().nullable().optional(),
  
  ticketEnabled: z.boolean().default(false),
  ticketChannelId: z.string().nullable().optional(),
  ticketCategory: z.string().default("Tickets"),
  ticketMessage: z.string().default("Welcome to your ticket, {user}. Support will be with you shortly."),
  
  loggingEnabled: z.boolean().default(false),
  loggingChannelId: z.string().nullable().optional(),
  
  moderationEnabled: z.boolean().default(false),
  moderationChannels: z.string().default(""),
  
  antiSpamEnabled: z.boolean().default(false),
  antiSpamThreshold: z.string().default("5"),
  
  xpEnabled: z.boolean().default(false),
  xpPerMessage: z.string().default("10-25"),
  
  bannedWords: z.string().default(""),
});

type FormValues = z.infer<typeof formSchema>;

export default function Settings() {
  const params = useParams<{ guildId: string }>();
  const guildId = params.guildId;

  const { data: settings, isLoading: isLoadingSettings } = useGetGuildSettings(guildId);
  const { data: channels } = useListChannels(guildId);
  const { data: roles } = useListRoles(guildId);
  
  const updateSettings = useUpdateGuildSettings();
  const sendTest = useSendWelcomeTest();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      welcomeEnabled: false,
      welcomeTitle: "Welcome!",
      welcomeMessage: "Welcome {user} to {server}!",
      welcomeColor: "#5865F2",
      welcomeShowAvatar: true,
      autoRoleEnabled: false,
      ticketEnabled: false,
      ticketCategory: "Tickets",
      ticketMessage: "Welcome!",
      loggingEnabled: false,
      moderationEnabled: false,
      moderationChannels: "",
      antiSpamEnabled: false,
      antiSpamThreshold: "5",
      xpEnabled: false,
      xpPerMessage: "10-25",
      bannedWords: "",
    }
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        welcomeEnabled: settings.welcomeEnabled ?? false,
        welcomeChannelId: settings.welcomeChannelId,
        welcomeTitle: settings.welcomeTitle ?? "Welcome!",
        welcomeMessage: settings.welcomeMessage ?? "Welcome {user} to {server}!",
        welcomeColor: settings.welcomeColor ?? "#5865F2",
        welcomeShowAvatar: settings.welcomeShowAvatar ?? true,
        autoRoleEnabled: settings.autoRoleEnabled ?? false,
        autoRoleId: settings.autoRoleId,
        ticketEnabled: settings.ticketEnabled ?? false,
        ticketChannelId: settings.ticketChannelId,
        ticketCategory: settings.ticketCategory ?? "Tickets",
        ticketMessage: settings.ticketMessage ?? "Welcome!",
        loggingEnabled: settings.loggingEnabled ?? false,
        loggingChannelId: settings.loggingChannelId,
        moderationEnabled: settings.moderationEnabled ?? false,
        moderationChannels: settings.moderationChannels ?? "",
        antiSpamEnabled: settings.antiSpamEnabled ?? false,
        antiSpamThreshold: settings.antiSpamThreshold ?? "5",
        xpEnabled: settings.xpEnabled ?? false,
        xpPerMessage: settings.xpPerMessage ?? "10-25",
        bannedWords: settings.bannedWords ?? "",
      });
    }
  }, [settings, form]);

  const onSubmit = (data: FormValues) => {
    updateSettings.mutate({
      guildId,
      data
    }, {
      onSuccess: () => {
        toast.success("تم حفظ الإعدادات بنجاح");
      },
      onError: () => {
        toast.error("حدث خطأ أثناء حفظ الإعدادات");
      }
    });
  };

  const handleTestWelcome = () => {
    sendTest.mutate({ guildId }, {
      onSuccess: () => toast.success("تم إرسال رسالة الترحيب التجريبية"),
      onError: () => toast.error("فشل إرسال رسالة الترحيب")
    });
  };

  if (isLoadingSettings) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const textChannels = channels?.filter(c => c.type === 'GUILD_TEXT') || [];

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="p-8 max-w-5xl mx-auto w-full flex-1 overflow-y-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">الإعدادات (Settings)</h1>
            <p className="text-muted-foreground">قم بتهيئة خصائص البوت في خادمك</p>
          </div>
          <Button onClick={form.handleSubmit(onSubmit)} disabled={updateSettings.isPending} className="gap-2">
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التغييرات
          </Button>
        </div>

        <Form {...form}>
          <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="welcome" className="w-full" dir="rtl">
              <TabsList className="bg-card border-border w-full flex justify-start overflow-x-auto rounded-md h-auto p-1">
                <TabsTrigger value="welcome">الترحيب (Welcome)</TabsTrigger>
                <TabsTrigger value="autorole">الرتب التلقائية (Auto-Role)</TabsTrigger>
                <TabsTrigger value="tickets">التذاكر (Tickets)</TabsTrigger>
                <TabsTrigger value="moderation">الإشراف (Moderation)</TabsTrigger>
                <TabsTrigger value="xp">نظام المستويات (XP)</TabsTrigger>
                <TabsTrigger value="logging">سجل الأحداث (Logging)</TabsTrigger>
              </TabsList>

              {/* WELCOME SETTINGS */}
              <TabsContent value="welcome" className="space-y-6 mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>نظام الترحيب</CardTitle>
                        <CardDescription>قم بتفعيل وتخصيص رسالة الترحيب عند انضمام عضو جديد</CardDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="welcomeEnabled"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="welcomeChannelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>قناة الترحيب</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="اختر قناة..." />
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

                    <FormField
                      control={form.control}
                      name="welcomeTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>عنوان الرسالة (Embed Title)</FormLabel>
                          <FormControl>
                            <Input className="bg-background" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="welcomeMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نص الترحيب</FormLabel>
                          <FormDescription className="text-xs">
                            المتغيرات المتاحة: {'{user}'}, {'{server}'}, {'{memberCount}'}
                          </FormDescription>
                          <FormControl>
                            <Textarea className="bg-background min-h-[100px]" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex items-center gap-4">
                      <FormField
                        control={form.control}
                        name="welcomeColor"
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormLabel>لون الإمبد (Hex Color)</FormLabel>
                            <FormControl>
                              <div className="flex items-center gap-2">
                                <Input type="color" className="w-12 p-1 h-10 bg-background" {...field} />
                                <Input className="bg-background font-mono" {...field} />
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="welcomeShowAvatar"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-background flex-1 mt-6">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">إظهار صورة العضو</FormLabel>
                            </div>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="button" variant="outline" onClick={handleTestWelcome} disabled={sendTest.isPending} className="mt-4 gap-2">
                      <Play className="w-4 h-4" /> تجربة رسالة الترحيب
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AUTO ROLE SETTINGS */}
              <TabsContent value="autorole" className="space-y-6 mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>الرتبة التلقائية</CardTitle>
                        <CardDescription>إعطاء رتبة تلقائياً للأعضاء الجدد</CardDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="autoRoleEnabled"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="autoRoleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الرتبة</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="اختر رتبة..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roles?.map((r) => (
                                <SelectItem key={r.id} value={r.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: r.color !== '#000000' ? r.color : '#99aab5' }} />
                                    {r.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* TICKETS SETTINGS */}
              <TabsContent value="tickets" className="space-y-6 mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>نظام التذاكر</CardTitle>
                        <CardDescription>إعداد نظام الدعم الفني والتذاكر</CardDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="ticketEnabled"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="ticketChannelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>قناة لوحة التذاكر</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="اختر قناة..." />
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
                    
                    <FormField
                      control={form.control}
                      name="ticketMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رسالة الترحيب في التذكرة</FormLabel>
                          <FormDescription className="text-xs">المتغيرات المتاحة: {'{user}'}</FormDescription>
                          <FormControl>
                            <Textarea className="bg-background" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* MODERATION SETTINGS */}
              <TabsContent value="moderation" className="space-y-6 mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>الإشراف والحماية (Moderation & Anti-Spam)</CardTitle>
                        <CardDescription>إعدادات حماية الخادم من السبام والكلمات الممنوعة</CardDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="moderationEnabled"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between border p-4 rounded-lg bg-background">
                      <div>
                        <FormLabel className="text-base font-semibold">مكافحة السبام (Anti-Spam)</FormLabel>
                        <FormDescription>تفعيل نظام منع التكرار السريع للرسائل</FormDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="antiSpamEnabled"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="bannedWords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الكلمات الممنوعة (Banned Words)</FormLabel>
                          <FormDescription className="text-xs">افصل بين الكلمات بفاصلة (، أو ,)</FormDescription>
                          <FormControl>
                            <Textarea placeholder="كلمة1, كلمة2, كلمة3" className="bg-background" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* XP SETTINGS */}
              <TabsContent value="xp" className="space-y-6 mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>نظام المستويات (XP System)</CardTitle>
                        <CardDescription>كافئ الأعضاء على تفاعلهم في الخادم</CardDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="xpEnabled"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="xpPerMessage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نقاط الخبرة لكل رسالة (XP per message)</FormLabel>
                          <FormDescription className="text-xs">مثال: 15-25 (يتم إعطاء رقم عشوائي بينهما)</FormDescription>
                          <FormControl>
                            <Input className="bg-background" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* LOGGING SETTINGS */}
              <TabsContent value="logging" className="space-y-6 mt-6">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>سجل الأحداث (Audit Logs)</CardTitle>
                        <CardDescription>تسجيل الأحداث الهامة في قناة مخصصة</CardDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="loggingEnabled"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="loggingChannelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>قناة السجل (Logs Channel)</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="اختر قناة..." />
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
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </form>
        </Form>
      </div>
    </div>
  );
}