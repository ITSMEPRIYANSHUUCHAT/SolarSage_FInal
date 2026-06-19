import React from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Sun,
  AlertTriangle,
  CheckCircle2,
  Download,
  IndianRupee,
  CalendarDays,
  Gauge,
  Leaf,
  Lightbulb,
  Info,
} from 'lucide-react';
import { InsightsData } from '@/utils/insightsGenerator';
import SolarComparator from './SolarComparator';

interface ImprovedInsightsPanelProps {
  insights: InsightsData;
  onDownload?: () => void;
  isGeneratingDocument?: boolean;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatNumber = (n: number) => new Intl.NumberFormat('en-IN').format(n);

/* ----------------------------- building blocks ----------------------------- */

type Accent = 'primary' | 'emerald' | 'amber' | 'sky' | 'rose';

const accentChip: Record<Accent, string> = {
  primary: 'bg-primary/10 text-primary',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  sky: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
};

const KpiCard: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon: React.ElementType;
  accent?: Accent;
  delta?: { value: number; goodWhenNegative?: boolean };
}> = ({ label, value, sub, icon: Icon, accent = 'primary', delta }) => {
  const up = delta && delta.value >= 0;
  const bad = delta ? (delta.goodWhenNegative ? up : !up) : false;
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accentChip[accent])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
          {value}
        </span>
        {delta && (
          <span
            className={cn(
              'mb-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
              bad
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
            )}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta.value).toFixed(1)}%
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
};

const SectionHeader: React.FC<{ title: string; description?: string; icon?: React.ElementType }> = ({
  title,
  description,
  icon: Icon,
}) => (
  <div className="flex items-start gap-2">
    {Icon && <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />}
    <div>
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  </div>
);

/* --------------------------------- panel ---------------------------------- */

const ImprovedInsightsPanel: React.FC<ImprovedInsightsPanelProps> = ({
  insights,
  onDownload,
  isGeneratingDocument = false,
}) => {
  const usageUp = insights.usage.change >= 0;
  const solar = insights.solar;

  const insightAccent = (type: string): Accent =>
    type === 'warning' ? 'amber' : type === 'tip' ? 'emerald' : 'sky';
  const insightIcon = (type: string) =>
    type === 'warning' ? AlertTriangle : type === 'tip' ? CheckCircle2 : Info;

  return (
    <div className="space-y-6">
      {/* KPI overview */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Total bill"
          value={formatCurrency(insights.summary.totalAmount)}
          sub={insights.summary.billingPeriod}
          icon={IndianRupee}
          accent="primary"
        />
        <KpiCard
          label="Energy used"
          value={`${formatNumber(insights.usage.current)}`}
          sub="kWh this period"
          icon={Zap}
          accent="emerald"
        />
        <KpiCard
          label="Daily average"
          value={`${formatNumber(insights.usage.averageDaily)}`}
          sub="kWh per day"
          icon={CalendarDays}
          accent="sky"
        />
        <KpiCard
          label="vs last period"
          value={`${usageUp ? '+' : '−'}${Math.abs(insights.usage.change).toFixed(1)}%`}
          sub="change in usage"
          icon={usageUp ? ArrowUpRight : ArrowDownRight}
          accent={usageUp ? 'rose' : 'emerald'}
        />
      </div>

      {/* Solar performance */}
      {solar && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b bg-muted/40 px-5 py-3">
            <SectionHeader
              icon={Sun}
              title="Solar performance"
              description={`Generated ${formatNumber(solar.actualGeneration)} kWh this period`}
            />
            <span
              className={cn(
                'hidden rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex',
                solar.efficiency >= 50 ? accentChip.emerald : accentChip.amber,
              )}
            >
              {solar.efficiency >= 50 ? 'Healthy' : 'Improvable'}
            </span>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-[260px_1fr]">
            {/* Offset gauge */}
            <div className="flex flex-col items-center justify-center rounded-lg border bg-background p-5 text-center">
              <div
                className="relative flex h-32 w-32 items-center justify-center rounded-full"
                style={{
                  background: `conic-gradient(hsl(var(--primary)) ${Math.min(
                    solar.efficiency,
                    100,
                  )}%, hsl(var(--muted)) 0)`,
                }}
              >
                <div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-card">
                  <span className="text-2xl font-semibold tabular-nums">
                    {solar.efficiency.toFixed(0)}%
                  </span>
                  <span className="text-[11px] text-muted-foreground">offset</span>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Share of your usage covered by solar
              </p>
            </div>

            {/* Sub-metrics */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-background p-4">
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accentChip.emerald)}>
                  <Gauge className="h-4 w-4" />
                </span>
                <p className="mt-3 text-xl font-semibold tabular-nums">
                  {formatNumber(solar.actualGeneration)} <span className="text-sm font-normal text-muted-foreground">kWh</span>
                </p>
                <p className="text-xs text-muted-foreground">Generated</p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accentChip.primary)}>
                  <IndianRupee className="h-4 w-4" />
                </span>
                <p className="mt-3 text-xl font-semibold tabular-nums">
                  {solar.savingsInr != null ? formatCurrency(solar.savingsInr) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Saved{solar.effectiveTariff != null ? ` @ ₹${solar.effectiveTariff}/kWh` : ''}
                </p>
              </div>
              <div className="rounded-lg border bg-background p-4">
                <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accentChip.sky)}>
                  <Leaf className="h-4 w-4" />
                </span>
                <p className="mt-3 text-xl font-semibold tabular-nums">
                  {solar.co2AvoidedKg != null ? `${formatNumber(solar.co2AvoidedKg)} kg` : '—'}
                </p>
                <p className="text-xs text-muted-foreground">CO₂ avoided</p>
              </div>

              {solar.efficiency < 50 && (
                <div className="sm:col-span-3 flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-500/5 p-3 dark:border-amber-800/60">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <p className="text-xs text-muted-foreground">
                    Solar covered under half of your usage. Shift heavy appliances to daylight
                    hours and keep panels clean to raise self-consumption.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail tabs */}
      <Tabs defaultValue="insights" className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full grid-cols-2 sm:flex sm:w-auto">
            <TabsTrigger value="insights" className="text-xs sm:text-sm">Insights</TabsTrigger>
            <TabsTrigger value="breakdown" className="text-xs sm:text-sm">Costs</TabsTrigger>
            <TabsTrigger value="comparator" className="text-xs sm:text-sm">Ranking</TabsTrigger>
            <TabsTrigger value="recommendations" className="text-xs sm:text-sm">Tips</TabsTrigger>
          </TabsList>

          {onDownload && (
            <Button
              onClick={onDownload}
              disabled={isGeneratingDocument}
              variant="outline"
              size="sm"
              className="w-full gap-2 sm:w-auto"
            >
              {isGeneratingDocument ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export report
                </>
              )}
            </Button>
          )}
        </div>

        {/* Insights */}
        <TabsContent value="insights" className="space-y-3">
          {insights.insights.map((insight, index) => {
            const Icon = insightIcon(insight.type);
            return (
              <div
                key={index}
                className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm"
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    accentChip[insightAccent(insight.type)],
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold">{insight.title}</h4>
                  <p className="mt-0.5 text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            );
          })}
        </TabsContent>

        {/* Cost breakdown */}
        <TabsContent value="breakdown">
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <SectionHeader
              title="Cost breakdown"
              description="Where your bill amount goes"
            />
            <div className="mt-4 space-y-4">
              {Object.entries(insights.costs.breakdown).map(([category, amount]) => {
                const pct = insights.summary.totalAmount
                  ? (amount / insights.summary.totalAmount) * 100
                  : 0;
                const isTop = category === insights.costs.largestExpense;
                return (
                  <div key={category}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {category}
                        {isTop && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
                            Top
                          </span>
                        )}
                      </span>
                      <span className="text-sm tabular-nums text-muted-foreground">
                        {formatCurrency(amount)} · {pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', isTop ? 'bg-primary' : 'bg-primary/50')}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 flex items-center justify-between border-t pt-4">
              <span className="text-sm font-medium text-muted-foreground">Total amount</span>
              <span className="text-lg font-semibold tabular-nums">
                {formatCurrency(insights.summary.totalAmount)}
              </span>
            </div>
          </div>
        </TabsContent>

        {/* Ranking */}
        <TabsContent value="comparator">
          {solar ? (
            <SolarComparator insights={insights} />
          ) : (
            <div className="rounded-xl border bg-card p-10 text-center shadow-sm">
              <Sun className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="text-sm font-semibold">No solar data detected</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                Ranking is available when solar generation is found on your bill.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Tips */}
        <TabsContent value="recommendations" className="space-y-3">
          <RecCard
            accent="emerald"
            icon={Lightbulb}
            title="Energy efficiency"
            tips={[
              'Switch to LED lighting and 5-star rated appliances.',
              'Keep AC at 24–26 °C for the best efficiency-comfort balance.',
              'Unplug idle electronics to cut standby draw.',
            ]}
          />
          {solar && (
            <RecCard
              accent="amber"
              icon={Sun}
              title="Solar optimization"
              tips={[
                'Clean panels monthly to maintain output.',
                'Run heavy loads during peak sun (10 AM – 3 PM).',
                'Track performance and address dips early.',
              ]}
            />
          )}
        </TabsContent>
      </Tabs>

      {solar && (
        <p className="text-xs text-muted-foreground">
          Solar offset, savings and CO₂ are derived from your bill&apos;s generation, consumption
          and tariff{solar.effectiveTariff != null ? ` (₹${solar.effectiveTariff}/kWh)` : ''}.
        </p>
      )}
    </div>
  );
};

const RecCard: React.FC<{ accent: Accent; icon: React.ElementType; title: string; tips: string[] }> = ({
  accent,
  icon: Icon,
  title,
  tips,
}) => (
  <div className="rounded-xl border bg-card p-5 shadow-sm">
    <div className="flex items-center gap-2">
      <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', accentChip[accent])}>
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
    </div>
    <ul className="mt-3 space-y-2">
      {tips.map((t, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          {t}
        </li>
      ))}
    </ul>
  </div>
);

export default ImprovedInsightsPanel;
