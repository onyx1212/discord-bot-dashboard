import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Pages
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import GuildDashboard from "@/pages/guild-dashboard";
import Settings from "@/pages/settings";
import Tickets from "@/pages/tickets";
import Warnings from "@/pages/warnings";
import Leaderboard from "@/pages/leaderboard";
import Giveaways from "@/pages/giveaways";
import Logs from "@/pages/logs";
import ChannelView from "@/pages/channel-view";

import Layout from "@/components/layout";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/guilds/:guildId" component={GuildDashboard} />
        <Route path="/guilds/:guildId/settings" component={Settings} />
        <Route path="/guilds/:guildId/channels/:channelId" component={ChannelView} />
        <Route path="/guilds/:guildId/tickets" component={Tickets} />
        <Route path="/guilds/:guildId/warnings" component={Warnings} />
        <Route path="/guilds/:guildId/leaderboard" component={Leaderboard} />
        <Route path="/guilds/:guildId/giveaways" component={Giveaways} />
        <Route path="/guilds/:guildId/logs" component={Logs} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <div dir="rtl" className="dark h-screen w-full bg-background text-foreground flex flex-col">
            <Router />
          </div>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
