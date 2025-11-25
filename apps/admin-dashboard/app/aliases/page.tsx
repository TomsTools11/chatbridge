'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tantml:parameter>
<parameter name="content">'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { aliasesApi, workspacesApi, Workspace, SlackChannel } from '@/lib/api';
import { Mail, Plus, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export default function AliasesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: aliasesData, isLoading } = useQuery({
    queryKey: ['aliases'],
    queryFn: async () => {
      const response = await aliasesApi.list();
      return response.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aliasesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliases'] });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Channel Aliases</h1>
          <p className="text-muted-foreground mt-2">
            Map Slack channels to email addresses
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Alias
        </Button>
      </div>

      {showCreateForm && (
        <CreateAliasForm onClose={() => setShowCreateForm(false)} />
      )}

      {aliasesData && aliasesData.data.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No channel aliases yet</p>
              <p className="text-sm">
                Create an alias to start bridging messages
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {aliasesData?.data.map((alias) => (
            <Card key={alias.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      #{alias.slackChannelName || alias.slackChannelId}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alias.emailAddress}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={alias.isActive ? 'success' : 'secondary'}>
                      {alias.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(alias.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Workspace</p>
                    <p className="font-medium">{alias.workspace?.teamName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recipients</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {alias.recipients.map((email) => (
                        <Badge key={email} variant="outline">
                          {email}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Created</p>
                    <p className="text-sm">{formatDate(alias.createdAt)}</p>
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

function CreateAliasForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [selectedWorkspace, setSelectedWorkspace] = useState('');
  const [selectedChannel, setSelectedChannel] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [recipients, setRecipients] = useState('');

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const response = await workspacesApi.list();
      return response.data;
    },
  });

  const { data: channels } = useQuery({
    queryKey: ['channels', selectedWorkspace],
    queryFn: async () => {
      const response = await workspacesApi.getChannels(selectedWorkspace);
      return response.data;
    },
    enabled: !!selectedWorkspace,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => aliasesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['aliases'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const channel = channels?.find((c) => c.id === selectedChannel);
    createMutation.mutate({
      workspaceId: selectedWorkspace,
      slackChannelId: selectedChannel,
      slackChannelName: channel?.name,
      emailAddress,
      isPrivate: channel?.isPrivate || false,
      recipients: recipients.split(',').map((s) => s.trim()),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Channel Alias</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="workspace">Workspace</Label>
            <select
              id="workspace"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedWorkspace}
              onChange={(e) => setSelectedWorkspace(e.target.value)}
              required
            >
              <option value="">Select workspace...</option>
              {workspaces?.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.teamName}
                </option>
              ))}
            </select>
          </div>

          {selectedWorkspace && (
            <div>
              <Label htmlFor="channel">Channel</Label>
              <select
                id="channel"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                required
              >
                <option value="">Select channel...</option>
                {channels?.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    #{ch.name} {ch.isPrivate ? '(Private)' : ''} {ch.hasAlias ? '(Has alias)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="channel@bridge.yourapp.com"
              value={emailAddress}
              onChange={(e) => setEmailAddress(e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="recipients">Recipients (comma-separated)</Label>
            <Input
              id="recipients"
              type="text"
              placeholder="user1@example.com, user2@example.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Emails from Slack will be sent to these addresses
            </p>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating...' : 'Create Alias'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>

          {createMutation.isError && (
            <p className="text-sm text-destructive">
              Failed to create alias. Please try again.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
