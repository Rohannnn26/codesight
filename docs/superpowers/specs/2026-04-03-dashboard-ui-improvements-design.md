# Dashboard & Reviews UI Improvements

**Date:** 2026-04-03  
**Status:** Approved  
**Approach:** Incremental Refinement (modify existing components in-place)

## Overview

Improve the dashboard and reviews pages to feel more professional and modern. Replace placeholder GitHub stats with CodeSight-specific metrics, enhance the reviews list with detailed cards, and add polish throughout.

## Scope

### In Scope
- Dashboard stat cards: new metrics + icon-forward styling
- Reviews page: detailed list layout with summary previews
- Polish: animations, hover effects, spacing, shadows

### Out of Scope
- Review detail page (future work)
- Filtering/search on reviews page (future work)
- Real "issues found" metric from backend (use placeholder for now)

---

## Dashboard Page Changes

### File: `frontend/src/app/dashboard/page.tsx`

#### Stat Cards - New Metrics

| Position | Old Metric | New Metric | Data Source |
|----------|-----------|------------|-------------|
| 1 | Total Repositories (GitHub API) | Connected Repos | `prisma.repository.count({ where: { userId } })` |
| 2 | Total Commits | AI Reviews | `prisma.review.count({ where: { status: "completed", ... } })` |
| 3 | Pull Requests | Issues Found | Placeholder: sum from review data (future: backend metric) |
| 4 | AI Reviews | Success Rate | `(completed / total) * 100` |

#### Stat Cards - Visual Design

Each card has:
- **Icon container**: 40x40px, rounded-lg, colored background (`bg-{color}-500/10`)
- **Label**: Small uppercase text, muted color
- **Value**: Large bold number (text-3xl font-bold)
- **Context line**: Secondary stat in smaller text (e.g., "+2 this week", "23 critical")

**Card styling:**
```tsx
className="bg-gradient-to-br from-card to-muted/20 border border-border/50 
           rounded-xl p-6 shadow-sm transition-all duration-200 
           hover:-translate-y-1 hover:shadow-lg hover:border-primary/20"
```

**Animation:** Staggered fade-in using `animate-in fade-in slide-in-from-bottom-4` with incremental delays.

#### Icons by Metric

| Metric | Icon | Color |
|--------|------|-------|
| Connected Repos | `FolderGit2` | Purple (`violet-500`) |
| AI Reviews | `Bot` | Green (`emerald-500`) |
| Issues Found | `AlertCircle` | Orange (`orange-500`) |
| Success Rate | `CheckCircle2` | Blue (`blue-500`) |

### File: `frontend/src/modules/dashboard/actions/index.ts`

Update `getDashboardStats()` to return:
```typescript
{
  connectedRepos: number,    // prisma.repository.count()
  totalReviews: number,      // prisma.review.count() - all
  completedReviews: number,  // prisma.review.count({ status: "completed" })
  issuesFound: number,       // placeholder: 0 for now
  successRate: number,       // (completed / total) * 100 or 0
}
```

---

## Reviews Page Changes

### File: `frontend/src/app/dashboard/reviews/page.tsx`

#### Summary Stats Bar

Replace 3 separate cards with inline horizontal stats:
```tsx
<div className="flex items-center gap-6 p-4 bg-card rounded-xl border">
  <div className="flex items-center gap-2">
    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
    <span className="font-semibold">{completed}</span>
    <span className="text-muted-foreground text-sm">Completed</span>
  </div>
  <div className="flex items-center gap-2">
    <Clock className="w-4 h-4 text-blue-500" />
    <span className="font-semibold">{pending}</span>
    <span className="text-muted-foreground text-sm">In Progress</span>
  </div>
  <div className="flex items-center gap-2">
    <XCircle className="w-4 h-4 text-red-500" />
    <span className="font-semibold">{failed}</span>
    <span className="text-muted-foreground text-sm">Failed</span>
  </div>
</div>
```

#### Review Item Cards

Each review card displays:

1. **Header row:**
   - PR title (font-medium, truncate if long)
   - Status badge (right-aligned)

2. **Metadata row:**
   - Repository name + PR number
   - Relative time ("2 hours ago")

3. **Summary preview** (for completed reviews):
   - First ~120 characters of `review.summary`
   - `line-clamp-2` to limit to 2 lines

4. **Footer row** (for completed reviews):
   - Risk level badge with icon
   - Placeholder: "📝 Comments" (future feature)
   - Placeholder: "⚡ Analysis time" (future feature)

5. **Progress bar** (for in_progress reviews):
   - Animated indeterminate progress indicator

**Card styling:**
```tsx
className="bg-card border border-border/50 rounded-xl p-5 
           transition-all duration-200 hover:bg-muted/30 
           hover:border-primary/20 hover:-translate-y-0.5
           border-l-4 border-l-{status-color}"
```

**Left border colors:**
| Status | Border Color |
|--------|-------------|
| completed | `border-l-emerald-500` |
| in_progress | `border-l-blue-500` |
| pending | `border-l-amber-500` |
| failed | `border-l-red-500` |
| skipped | `border-l-gray-400` |

#### Risk Level Display

| Risk | Color | Icon |
|------|-------|------|
| LOW | `text-emerald-500 bg-emerald-500/10` | Shield or checkmark |
| MEDIUM | `text-yellow-500 bg-yellow-500/10` | Alert triangle |
| HIGH | `text-orange-500 bg-orange-500/10` | Alert circle |
| CRITICAL | `text-red-500 bg-red-500/10` | Skull or X |

---

## Polish Specifications

### Animations

**Page load (stat cards):**
```tsx
// Each card gets increasing delay
className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-[X]"
// X = 0, 75, 150, 225 for cards 1-4
```

**Review items:**
- Staggered fade-in using `style={{ animationDelay: `${index * 50}ms` }}`

### Hover Effects

**Cards:**
```css
transition-all duration-200 
hover:-translate-y-1 hover:shadow-lg hover:border-primary/20
```

**Review items:**
```css
transition-all duration-200 
hover:bg-muted/30 hover:border-primary/20 hover:-translate-y-0.5
```

### Spacing

| Element | Old | New |
|---------|-----|-----|
| Dashboard section gap | `space-y-6` | `space-y-8` |
| Stat cards grid gap | `gap-4` | `gap-6` |
| Reviews page padding | `p-6` | `p-8` |
| Review items gap | `gap-3` | `gap-4` |
| Card internal padding | varies | `p-5` or `p-6` consistently |

### Shadows & Borders

**Default card:**
```css
shadow-sm border border-border/50 rounded-xl
```

**Hover card:**
```css
shadow-lg border-primary/20
```

**Icon containers:**
```css
w-10 h-10 rounded-lg bg-{color}-500/10 flex items-center justify-center
```

---

## Files to Modify

1. `frontend/src/app/dashboard/page.tsx` - Stat cards UI
2. `frontend/src/modules/dashboard/actions/index.ts` - Data fetching
3. `frontend/src/app/dashboard/reviews/page.tsx` - Reviews list UI

---

## Future Considerations

- Add real "issues found" metric from backend review data
- Add review detail page (`/dashboard/reviews/[id]`)
- Add filtering by status, repository, risk level
- Add real-time status updates via polling or WebSocket
- Add "comments count" and "analysis duration" to review model
