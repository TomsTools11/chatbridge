'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { messagesApi, workspacesApi, aliasesApi } from '@/lib/api';
import { Mail, CheckCircle2, XCircle, TrendingUp, Slack } from 'lucide-react';

export default function HomePage() {
  const { data: stats } = useQuery({
    queryKey: ['message-stats'],
    queryFn: async () => {
      const response = await messagesApi.stats('24h');
      return response.data;
    },
  });

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await workspacesApi.list();
      return response.data;
    },
  });

  const { data: aliasesData } = useQuery({
    queryKey: ['aliases'],
    queryFn: async () => {
      const response = await aliasesApi.list();
      return response.data;
    },
  });

  const activeAliases = aliasesData?.data.filter((a) => a.isActive).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your email ↔ Slack bridge
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <Slack className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaces?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Connected Slack workspaces
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Aliases</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAliases}</div>
            <p className="text-xs text-muted-foreground">
              Channel aliases configured
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages (24h)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total messages processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.stats.successRate || '0%'}</div>
            <p className="text-xs text-muted-foreground">
              Delivery success rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Message Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Message Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm">Delivered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{stats?.stats.delivered || 0}</span>
                <Badge variant="success">
                  {stats?.stats.total ? Math.round((stats.stats.delivered / stats.stats.total) * 100) : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Failed</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{stats?.stats.failed || 0}</span>
                <Badge variant="destructive">
                  {stats?.stats.total ? Math.round((stats.stats.failed / stats.stats.total) * 100) : 0}%
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm">Pending</span>
              </div>
              <span className="text-lg font-bold">{stats?.stats.pending || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Message Direction</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-pink-500" />
                <span className="text-sm">Email → Slack</span>
              </div>
              <span className="text-lg font-bold">{stats?.byDirection.emailToSlack || 0}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Slack className="h-4 w-4 text-violet-500" />
                <span className="text-sm">Slack → Email</span>
              </div>
              <span className="text-lg font-bold">{stats?.byDirection.slackToEmail || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats?.stats.total === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p className="text-lg font-medium mb-2">No messages yet</p>
              <p className="text-sm">
                Create a channel alias and start bridging messages between email and Slack!
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
