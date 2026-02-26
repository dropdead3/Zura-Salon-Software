import { useState } from 'react';
import { useProductSalesAnalytics, ProductTimeRange } from '@/hooks/useProductSalesAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Package, ShoppingBag, TrendingUp, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricInfoTooltip } from '@/components/ui/MetricInfoTooltip';

interface ProductLeaderboardProps {
  locationId?: string;
  className?: string;
}

export function ProductLeaderboard({ locationId, className }: ProductLeaderboardProps) {
  const [timeRange, setTimeRange] = useState<ProductTimeRange>('month');
  const { data, isLoading, error } = useProductSalesAnalytics(timeRange, locationId);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Sales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No product data available</p>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-5 w-5 text-primary" />
            Product Sales Analytics
            <MetricInfoTooltip description="Ranks products by revenue and units sold. Data is aggregated from completed appointment line items containing product sales." />
          </CardTitle>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as ProductTimeRange)}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="365days">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-lg font-medium">{formatCurrency(data.summary.totalProductRevenue)}</p>
            <p className="text-xs text-muted-foreground">Product Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">{data.summary.uniqueProducts}</p>
            <p className="text-xs text-muted-foreground">Products Sold</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-medium">{data.summary.productPercentage.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">Retail Mix</p>
          </div>
        </div>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="products" className="text-xs">
              <ShoppingBag className="h-3 w-3 mr-1" />
              Top Products
            </TabsTrigger>
            <TabsTrigger value="staff" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Staff Leaders
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-3">
            <div className="space-y-2">
              {data.topProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No product sales data available
                </p>
              ) : (
                data.topProducts.slice(0, 5).map((product, idx) => (
                  <div
                    key={`${product.itemName}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-md bg-background border"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                        idx === 0 && "bg-primary text-primary-foreground",
                        idx === 1 && "bg-muted-foreground/20 text-foreground",
                        idx === 2 && "bg-amber-500/20 text-amber-600",
                        idx > 2 && "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-medium truncate max-w-[150px]">{product.itemName}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.totalQuantity} sold
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-medium">{formatCurrency(product.totalRevenue)}</p>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="staff" className="mt-3">
            <div className="space-y-2">
              {data.staffPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No staff product data available
                </p>
              ) : (
                data.staffPerformance.slice(0, 5).map((staff, idx) => (
                  <div
                    key={staff.phorestStaffId}
                    className="flex items-center justify-between p-2 rounded-md bg-background border"
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                        idx === 0 && "bg-primary text-primary-foreground",
                        idx === 1 && "bg-muted-foreground/20 text-foreground",
                        idx === 2 && "bg-amber-500/20 text-amber-600",
                        idx > 2 && "bg-muted text-muted-foreground"
                      )}>
                        {idx + 1}
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={staff.photoUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {staff.staffName.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{staff.staffName}</p>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {staff.attachmentRate.toFixed(0)}% attach
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{formatCurrency(staff.productRevenue)}</p>
                      <p className="text-xs text-muted-foreground">{staff.productQuantity} items</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
