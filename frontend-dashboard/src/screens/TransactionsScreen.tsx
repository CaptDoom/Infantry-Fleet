import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Copy,
  Eye,
  Edit3,

  Archive,
  Trash2,
  X,
  Check,
  ChevronsUpDown,
  Clipboard,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ── Types ─────────────────────────────────────────────────────────
interface Transaction {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Pending' | 'Failed' | 'Draft' | 'Completed';
  amount: number;
  category: string;
  createdAt: string;
  avatar: string;
}

type SortField = 'id' | 'name' | 'status' | 'amount' | 'category' | 'createdAt';
type SortDirection = 'asc' | 'desc' | null;

// ── Mock Data ─────────────────────────────────────────────────────
const mockTransactions: Transaction[] = [
  {
    id: 'TXN-001',
    name: 'Sarah Chen',
    email: 'sarah.chen@company.com',
    role: 'Admin',
    status: 'Completed',
    amount: 12500.0,
    category: 'Enterprise',
    createdAt: '2024-01-15',
    avatar: 'SC',
  },
  {
    id: 'TXN-002',
    name: 'Marcus Johnson',
    email: 'marcus.j@company.com',
    role: 'Manager',
    status: 'Active',
    amount: 8750.5,
    category: 'Professional',
    createdAt: '2024-01-14',
    avatar: 'MJ',
  },
  {
    id: 'TXN-003',
    name: 'Emily Rodriguez',
    email: 'emily.r@company.com',
    role: 'Member',
    status: 'Pending',
    amount: 3200.0,
    category: 'Starter',
    createdAt: '2024-01-13',
    avatar: 'ER',
  },
  {
    id: 'TXN-004',
    name: 'David Kim',
    email: 'david.kim@company.com',
    role: 'Viewer',
    status: 'Failed',
    amount: 5400.0,
    category: 'Professional',
    createdAt: '2024-01-12',
    avatar: 'DK',
  },
  {
    id: 'TXN-005',
    name: 'Alex Thompson',
    email: 'alex.t@company.com',
    role: 'Admin',
    status: 'Draft',
    amount: 21000.0,
    category: 'Enterprise',
    createdAt: '2024-01-11',
    avatar: 'AT',
  },
  {
    id: 'TXN-006',
    name: 'Lisa Wang',
    email: 'lisa.wang@company.com',
    role: 'Manager',
    status: 'Active',
    amount: 6800.0,
    category: 'Professional',
    createdAt: '2024-01-10',
    avatar: 'LW',
  },
  {
    id: 'TXN-007',
    name: 'James Wilson',
    email: 'james.w@company.com',
    role: 'Member',
    status: 'Completed',
    amount: 9200.0,
    category: 'Enterprise',
    createdAt: '2024-01-09',
    avatar: 'JW',
  },
  {
    id: 'TXN-008',
    name: 'Priya Patel',
    email: 'priya.p@company.com',
    role: 'Viewer',
    status: 'Pending',
    amount: 4500.0,
    category: 'Starter',
    createdAt: '2024-01-08',
    avatar: 'PP',
  },
  {
    id: 'TXN-009',
    name: 'Michael Brown',
    email: 'michael.b@company.com',
    role: 'Admin',
    status: 'Active',
    amount: 15800.0,
    category: 'Enterprise',
    createdAt: '2024-01-07',
    avatar: 'MB',
  },
  {
    id: 'TXN-010',
    name: 'Rachel Green',
    email: 'rachel.g@company.com',
    role: 'Manager',
    status: 'Completed',
    amount: 7300.0,
    category: 'Professional',
    createdAt: '2024-01-06',
    avatar: 'RG',
  },
];

// ── Status Badge Component ────────────────────────────────────────
function StatusBadge({ status }: { status: Transaction['status'] }) {
  const variants: Record<string, string> = {
    Active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    Completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    Pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    Failed: 'bg-red-500/10 text-red-600 border-red-500/20',
    Draft: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <Badge variant="outline" className={variants[status]}>
      {status}
    </Badge>
  );
}

// ── Copy Button Component ─────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (                    <Tooltip>
      <TooltipTrigger>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Copy to clipboard</TooltipContent>
    </Tooltip>
  );
}

// ── Main Data Table Component ─────────────────────────────────────
export function TransactionsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showFilters, setShowFilters] = useState(false);

  // ── Sorting ──────────────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => {
        if (prev === 'asc') return 'desc';
        if (prev === 'desc') return null;
        return 'asc';
      });
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ── Filtering & Sorting ──────────────────────────────────────────
  const filteredData = useMemo(() => {
    let data = [...mockTransactions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      data = data.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.email.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      data = data.filter((item) => item.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      data = data.filter((item) => item.category === categoryFilter);
    }

    // Role filter
    if (roleFilter !== 'all') {
      data = data.filter((item) => item.role === roleFilter);
    }

    // Sorting
    if (sortField && sortDirection) {
      data.sort((a, b) => {
        let aVal = a[sortField];
        let bVal = b[sortField];

        if (sortField === 'amount') {
          aVal = Number(aVal);
          bVal = Number(bVal);
        } else if (sortField === 'createdAt') {
          aVal = new Date(aVal as string).getTime();
          bVal = new Date(bVal as string).getTime();
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [searchQuery, statusFilter, categoryFilter, roleFilter, sortField, sortDirection]);

  // ── Pagination ───────────────────────────────────────────────────
  const totalPages = Math.ceil(filteredData.length / rowsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // ── Selection ────────────────────────────────────────────────────
  const isAllSelected = paginatedData.every((item) => selectedRows.has(item.id));
  const isSomeSelected = paginatedData.some((item) => selectedRows.has(item.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedData.map((item) => item.id)));
    }
  };

  const toggleRow = (id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedRows(new Set());

  // ── Sort Icon ────────────────────────────────────────────────────
  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="h-3.5 w-3.5" />;
    }
    if (sortDirection === 'desc') {
      return <ChevronDown className="h-3.5 w-3.5" />;
    }
    return <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/50" />;
  }

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Manage and track all transaction records across your workspace.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-3.5 w-3.5" />
                <span className="text-xs">Export</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Export as XLSX
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            {/* Top Row: Search + Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-2"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-3.5 w-3.5" />
                <span className="text-xs">Filters</span>
                {(statusFilter !== 'all' || categoryFilter !== 'all' || roleFilter !== 'all') && (
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 text-[10px] ml-1"
                  >
                    {[statusFilter, categoryFilter, roleFilter].filter((f) => f !== 'all').length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Filter Row */}
            {showFilters && (
              <div className="flex items-center gap-3 pt-2 border-t">
                <Select
                  value={statusFilter}
                  onValueChange={(val) => {
                    if (val) setStatusFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={categoryFilter}
                  onValueChange={(val) => {
                    if (val) setCategoryFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Starter">Starter</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={roleFilter}
                  onValueChange={(val) => {
                    if (val) setRoleFilter(val);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px] h-8 text-xs">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Member">Member</SelectItem>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>

                {(statusFilter !== 'all' || categoryFilter !== 'all' || roleFilter !== 'all') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs text-muted-foreground"
                    onClick={() => {
                      setStatusFilter('all');
                      setCategoryFilter('all');
                      setRoleFilter('all');
                      setCurrentPage(1);
                    }}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Clear filters
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Batch Actions Bar */}
      {selectedRows.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-primary/5 border border-primary/20 rounded-lg">
          <span className="text-sm font-medium">
            {selectedRows.size} item{selectedRows.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Batch Update Status
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs">
              Batch Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs text-destructive border-destructive/20 hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Batch Delete
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={clearSelection}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={isAllSelected}

                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('id')}
                  >
                    ID <SortIcon field="id" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    User <SortIcon field="name" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    Status <SortIcon field="status" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('amount')}
                  >
                    Amount <SortIcon field="amount" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('category')}
                  >
                    Category <SortIcon field="category" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    Created <SortIcon field="createdAt" />
                  </button>
                </TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Search className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">No results found</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                          setCategoryFilter('all');
                          setRoleFilter('all');
                        }}
                      >
                        Clear all filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      'group cursor-pointer',
                      selectedRows.has(item.id) && 'bg-primary/5'
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(item.id)}
                        onCheckedChange={() => toggleRow(item.id)}
                        aria-label={`Select ${item.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs">{item.id}</span>
                        <CopyButton text={item.id} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium shrink-0">
                          {item.avatar}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">{item.createdAt}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit3 className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Clipboard className="mr-2 h-4 w-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem>
                            <Archive className="mr-2 h-4 w-4" />
                            Archive
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing{' '}
          <span className="font-medium">
            {(currentPage - 1) * rowsPerPage + 1}
          </span>{' '}
          to{' '}
          <span className="font-medium">
            {Math.min(currentPage * rowsPerPage, filteredData.length)}
          </span>{' '}
          of <span className="font-medium">{filteredData.length}</span> items
        </p>
        <div className="flex items-center gap-2">
          <Select
            value={String(rowsPerPage)}
            onValueChange={(val) => {
              setRowsPerPage(Number(val));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-[80px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 rows</SelectItem>
              <SelectItem value="25">25 rows</SelectItem>
              <SelectItem value="50">50 rows</SelectItem>
              <SelectItem value="100">100 rows</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + 1;
              return (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              );
            })}
            {totalPages > 5 && <span className="text-muted-foreground px-1">...</span>}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
