'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { termsData, priorityOrder } from '@/lib/terms-data';
import { Search, Filter, X } from 'lucide-react';

export default function TermsTablePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string | null>(null);

  const filteredTerms = useMemo(() => {
    return termsData.filter((term) => {
      const matchesSearch =
        searchQuery === '' ||
        term.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.acronym.toLowerCase().includes(searchQuery.toLowerCase()) ||
        term.definition.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPriority =
        selectedPriority === null || term.priority === selectedPriority;

      return matchesSearch && matchesPriority;
    });
  }, [searchQuery, selectedPriority]);

  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case 'Top Priority':
        return 'destructive';
      case 'Medium Priority':
        return 'default';
      case 'Low Priority':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'Top Priority':
        return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200';
      case 'Medium Priority':
        return 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200';
      case 'Low Priority':
        return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200';
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedPriority(null);
  };

  const hasActiveFilters = searchQuery !== '' || selectedPriority !== null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Terms Table</h1>
        <p className="text-muted-foreground mt-2">
          Search and filter through all terms and definitions
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by term, acronym, or definition..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Priority Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 self-center mr-2">Filter by priority:</span>
            {priorityOrder.map((priority) => (
              <button
                key={priority}
                onClick={() =>
                  setSelectedPriority(selectedPriority === priority ? null : priority)
                }
                className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-colors ${
                  selectedPriority === priority
                    ? getPriorityBadgeClass(priority) + ' ring-2 ring-offset-1 ring-gray-400'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {priority}
              </button>
            ))}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-1.5 text-sm font-medium rounded-full border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-500">
            Showing {filteredTerms.length} of {termsData.length} terms
          </div>
        </CardContent>
      </Card>

      {/* Terms Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Term</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 w-24">Acronym</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700 w-36">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Definition</th>
                </tr>
              </thead>
              <tbody>
                {filteredTerms.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      No terms found matching your criteria
                    </td>
                  </tr>
                ) : (
                  filteredTerms.map((term, index) => (
                    <tr
                      key={`${term.acronym}-${index}`}
                      className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-gray-900">{term.term}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="font-mono font-bold">
                          {term.acronym}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={getPriorityBadgeVariant(term.priority)}
                          className={
                            term.priority === 'Top Priority'
                              ? ''
                              : term.priority === 'Medium Priority'
                              ? 'bg-amber-500'
                              : term.priority === 'Low Priority'
                              ? 'bg-blue-500 text-white'
                              : ''
                          }
                        >
                          {term.priority}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600 text-sm">{term.definition}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
