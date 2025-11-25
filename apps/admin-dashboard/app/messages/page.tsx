'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { messagesApi } from '@/lib/api';
import { MessageSquare, ArrowRight, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { formatRelativeTime } from '@/lib/utils';

export default function MessagesPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<{
    direction?: 'EMAIL_TO_SLACK' | 'SLACK_TO_EMAIL';
    status?: 'PENDING' | 'DELIVERED' | 'FAILED';
  }>({});

  const { data, isLoading } = useQuery({
    queryKey: ['messages', page, filter],
    queryFn: async () => {
      const response = await messagesApi.list({ page, limit: 20, ...filter });
      return response.data;
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const statusIcons = {
    DELIVERED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    FAILED: <XCircle className="h-4 w-4 text-red-500" />,
    PENDING: <Clock className="h-4 w-4 text-blue-500" />,
  };

  const statusVariants = {
    DELIVERED: 'success' as const,
    FAILED: 'destructive' as const,
    PENDING: 'secondary' as const,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Message Logs</h1>
        <p className="text-muted-foreground mt-2">
          View and monitor all message deliveries
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Direction</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter.direction === undefined ? 'default' : 'outline'}
                  onClick={() => setFilter({ ...filter, direction: undefined })}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filter.direction === 'EMAIL_TO_SLACK' ? 'default' : 'outline'}
                  onClick={() => setFilter({ ...filter, direction: 'EMAIL_TO_SLACK' })}
                >
                  Email→Slack
                </Button>
                <Button
                  size="sm"
                  variant={filter.direction === 'SLACK_TO_EMAIL' ? 'default' : 'outline'}
                  onClick={() => setFilter({ ...filter, direction: 'SLACK_TO_EMAIL' })}
                >
                  Slack→Email
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={filter.status === undefined ? 'default' : 'outline'}
                  onClick={() => setFilter({ ...filter, status: undefined })}
                >
                  All
                </Button>
                <Button
                  size="sm"
                  variant={filter.status === 'DELIVERED' ? 'default' : 'outline'}
                  onClick={() => setFilter({ ...filter, status: 'DELIVERED' })}
                >
                  Delivered
                </Button>
                <Button
                  size="sm"
                  variant={filter.status === 'FAILED' ? 'default' : 'outline'}
                  onClick={() => setFilter({ ...filter, status: 'FAILED' })}
                >
                  Failed
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages */}
      {data && data.data.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium mb-2">No messages yet</p>
              <p className="text-sm">
                Messages will appear here once they start flowing
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {data?.data.map((message) => (
              <Card key={message.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        {statusIcons[message.status]}
                        <Badge variant={statusVariants[message.status]}>
                          {message.status}
                        </Badge>
                      </div>

                      <ArrowRight className="h-4 w-4 text-muted-foreground" />

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {message.direction === 'EMAIL_TO_SLACK' ? 'Email → Slack' : 'Slack → Email'}
                          </span>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-sm text-muted-foreground">
                            {message.channelAlias?.slackChannelName || message.channelAlias?.emailAddress}
                          </span>
                        </div>
                        {message.errorMessage && (
                          <p className="text-sm text-destructive mt-1">
                            {message.errorMessage}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {formatRelativeTime(message.createdAt)}
                        </p>
                        {message.workspace && (
                          <p className="text-xs text-muted-foreground">
                            {message.workspace.teamName}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {data.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={page === data.pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
