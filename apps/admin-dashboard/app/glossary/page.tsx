'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { termsData, priorityOrder, priorityColors } from '@/lib/terms-data';

export default function GlossaryPage() {
  // Group terms by priority
  const groupedTerms = priorityOrder.reduce((acc, priority) => {
    acc[priority] = termsData.filter(term => term.priority === priority);
    return acc;
  }, {} as Record<string, typeof termsData>);

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "Top Priority":
        return "destructive";
      case "Medium Priority":
        return "default";
      case "Low Priority":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Terms Glossary</h1>
        <p className="text-muted-foreground mt-2">
          Key terms and definitions organized by importance level
        </p>
      </div>

      {priorityOrder.map((priority) => {
        const terms = groupedTerms[priority];
        if (!terms || terms.length === 0) return null;

        const colors = priorityColors[priority];

        return (
          <div key={priority} className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold text-gray-800">{priority}</h2>
              <Badge variant={getPriorityBadgeVariant(priority)}>
                {terms.length} {terms.length === 1 ? 'term' : 'terms'}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {terms.map((term, index) => (
                <Card 
                  key={`${term.acronym}-${index}`} 
                  className={`${colors.bg} ${colors.border} border-2 hover:shadow-md transition-shadow`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg font-semibold text-gray-900 leading-tight">
                        {term.term}
                      </CardTitle>
                      {term.acronym && (
                        <Badge 
                          variant="outline" 
                          className={`${colors.text} ${colors.border} shrink-0 font-mono font-bold`}
                        >
                          {term.acronym}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {term.definition}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
