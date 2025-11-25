'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { workspacesApi } from '@/lib/api';
import { Slack, Users } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function WorkspacesPage() {
  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await workspacesApi.list();
      return response.data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Slack Workspaces</h1>
        <p className="text-muted-foreground mt-2">
          Manage connected Slack workspaces
        </p>
      </div>

      {workspaces && workspaces.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Slack className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No workspaces connected</p>
              <p className="text-sm">
                Install the Slack app to connect your first workspace
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workspaces?.map((workspace) => (
            <Card key={workspace.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-violet-100 rounded-lg">
                      <Slack className="h-6 w-6 text-violet-600" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{workspace.teamName}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Team ID: {workspace.teamId}
                      </p>
                    </div>
                  </div>
                  <Badge variant={workspace.status === 'ACTIVE' ? 'success' : 'secondary'}>
                    {workspace.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Bot User ID</p>
                    <p className="font-medium">{workspace.botUserId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Channel Aliases</p>
                    <p className="font-medium">{workspace._count?.aliases || 0}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Installed By</p>
                    <p className="font-medium">{workspace.installedBy}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Connected At</p>
                    <p className="font-medium">{formatDate(workspace.createdAt)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
