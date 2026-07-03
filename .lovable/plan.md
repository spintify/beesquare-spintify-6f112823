## Scope

Build a completely separate **Auditing Application** as a new module under `/auditing/*`, mounted alongside the existing Billing module. Shared auth, shared design tokens, independent state, routes, and components. **No changes to the Billing module, its routes, DB tables, or APIs.**

The existing `/audit/*` placeholder routes will be superseded by the new `/auditing/*` tree. The module selection page's "Auditing Application" card will point to `/auditing/dashboard`.

## Approach

**Phase 1 (this build) — Production-quality frontend shell + all 11 pages with realistic mock data.**
Because the schema for audits, warehouses, dealers, OEM records, and variances doesn't exist yet in the DB, we'll ship the full UI wired to a typed mock data layer (`src/features/auditing/data/*`). Every page renders real charts, tables, filters, and actions. Swapping mocks for Supabase queries later is a one-file change per entity.

**Phase 2 (follow-up)** — Introduce Supabase tables (`audits`, `audit_items`, `warehouses`, `dealers`, `oem_records`, `audit_activity`, plus `user_roles` per security guidelines), RLS policies, and replace mock repos with real queries. Called out here but **not** built in this turn to keep scope shippable.

## Route tree

```text
src/routes/
  auditing.tsx                     layout: sidebar + header + <Outlet/>
  auditing.index.tsx               redirect -> /auditing/dashboard
  auditing.dashboard.tsx
  auditing.audits.tsx              list + create/schedule dialog
  auditing.audits.$auditId.tsx     detail (assign, status, notes, attachments)
  auditing.inventory.tsx           inventory verification workbench
  auditing.verification.tsx        physical stock entry (bulk grid)
  auditing.reconciliation.tsx      variance queue + actions
  auditing.oem.tsx                 OEM / Dealer / System comparison
  auditing.barcode.tsx             scanner simulator + instant lookup
  auditing.reports.tsx             report generator + export
  auditing.analytics.tsx           charts-heavy analytics
  auditing.history.tsx             immutable audit history
  auditing.users.tsx               roles & permissions
  auditing.settings.tsx            tolerance %, formats, theme, profile
```

Old `/audit/*` placeholder routes are deleted. `/modules` "Auditing Application" card now navigates to `/auditing/dashboard`.

## Shell & design language

- Left **collapsible sidebar** (shadcn `Sidebar`, `collapsible="icon"`) with the 12 nav items (Dashboard, Audit Management, Inventory Verification, Physical Stock Entry, Stock Reconciliation, OEM Verification, Barcode Scanner, Reports, Analytics, Audit History, Users, Settings). Active route highlighted via `useRouterState`.
- Top bar: global search, warehouse switcher, notifications bell (popover), user menu (profile / sign out), breadcrumb.
- Design tokens extend existing Spintify palette — white bg, blue gradients (`--gradient-primary`), glass cards (`bg-white/70 backdrop-blur-xl`), rounded-2xl, soft blue shadows. Dark mode via `.dark` class toggle in Settings.
- Micro-animations via existing `animate-fade-in` / `hover-scale` utilities. No new heavy motion libs.

## Mock data layer

`src/features/auditing/data/` — pure TS, no I/O:
- `types.ts` — `Audit`, `AuditItem`, `Warehouse`, `Dealer`, `Part`, `OemRecord`, `VarianceRow`, `Auditor`, `Role`, `ActivityEvent`, status/priority enums.
- `seed.ts` — deterministic seed (~40 audits, ~500 parts, 4 warehouses, 6 dealers, 8 auditors, 12 months of history) for realistic charts and tables.
- `store.ts` — Zustand store with CRUD for audits + items + drafts; `persist` middleware to `localStorage` so entries survive reload (drafts, physical counts, reconciliation decisions).
- `repos/*.ts` — thin async functions returning promises (so future Supabase swap is mechanical).

## Reusable components

`src/features/auditing/components/`:
- `AuditingShell.tsx`, `AuditingSidebar.tsx`, `AuditingTopBar.tsx`, `NotificationsPopover.tsx`.
- `StatCard.tsx` (KPI tile with delta + sparkline), `SectionCard.tsx`.
- `DataTable.tsx` — sticky header, sortable columns, column visibility, pagination, resizable widths, row selection, empty state, skeleton loader. Built on TanStack Table (already suitable and lightweight).
- `FilterBar.tsx` — date range, warehouse, dealer, category, brand, supplier, status, auditor, priority. Debounced global search.
- `StatusBadge.tsx`, `PriorityBadge.tsx`, `VarianceCell.tsx` (color-coded delta), `Trend.tsx`.
- `ExportMenu.tsx` — PDF (window.print via a print stylesheet), Excel/CSV (SheetJS-free CSV writer + minimal XLSX via a tiny helper), Print.
- `BarcodeScannerPanel.tsx` — manual + simulated scan with debounce; keyboard-first UX.
- `BulkEntryGrid.tsx` — Enter/Tab keyboard nav, autosave drafts, paste-from-clipboard, per-row validation.

## Page-by-page content

- **Dashboard** — 10 KPI cards (Total Parts, Inventory Value, Audits Completed, Pending, Active Auditors, Warehouses, Variance Detected, Stock Accuracy %, Last Audit, Next Scheduled). Charts (recharts, already in deps): Monthly Audit Trend (line), Inventory Accuracy (area), Category-wise Variance (bar), Warehouse Comparison (grouped bar), Top Mismatched Parts (horizontal bar). Recent Activity feed, Upcoming Schedule list, Quick Actions row (New Audit, Scan Barcode, Reconcile, Export Report).
- **Audit Management** — table of audits with filters + "New Audit" dialog (name, warehouse, dealer, category, priority, due date, assignee, notes, attachments placeholder). Row status pills (Draft / In Progress / Submitted / Approved / Rejected / Completed). Row click → detail page with tabs (Overview, Items, Activity, Attachments).
- **Inventory Verification** — search (part #, barcode, name), filters, table with system qty / physical qty (editable) / diff / diff % / status. Mismatched rows highlighted; bulk verify action.
- **Physical Stock Entry** — spreadsheet-style grid, keyboard nav, auto-save drafts to store, bulk paste, remarks column.
- **Barcode Scanner** — big input focused by default, simulated scan button, live lookup card showing Part Name, Current Stock, Warehouse, OEM Code, Location, and side-by-side system vs physical.
- **Stock Reconciliation** — variance queue with Accept / Reject / Recount / Approve / Mark Resolved actions, reason dropdown, suggested action, running total of adjusted value.
- **OEM Verification** — 3-column compare view (Dealer / OEM / System) with highlighted differences (price, stock, invoice, GST, part #); "Generate reconciliation report" button.
- **Reports** — grid of report tiles (11 report types), each opens a config drawer (date range, filters) then generates a preview + Export menu (PDF/Excel/CSV/Print).
- **Analytics** — multi-chart page (daily/weekly/monthly audits, variance %, accuracy %, warehouse & category performance, top problem areas, most audited products) with period toggle.
- **Audit History** — immutable log table with Download Report / View Details / Duplicate Audit row actions.
- **Users** — user table with role assignment (Administrator, Audit Manager, Senior Auditor, Auditor, Warehouse Manager, Viewer), permission matrix preview. Frontend-only for now; wired to store.
- **Settings** — sections: Audit Rules (tolerance %), Default Warehouse, Barcode Settings, Email Notifications toggles, Company Information (reuses existing billing company info read-only), Audit Number Format (`AUD-{YY}{MM}-####` preview), Theme (light/dark), Profile, Security (change password link).

## Notifications

Bell in top bar → popover list with unread badge. Store-backed. Toast (existing sonner) fires on: New Audit Assigned, Audit Completed, Mismatch Found (over tolerance %), Approval Required, Report Generated, Stock Difference recorded.

## Roles (frontend gating only in Phase 1)

`useCurrentRole()` hook reads from store; nav items and action buttons gate on role. Real enforcement lands with Phase 2 RLS + `has_role()` function per security guidelines.

## Technical notes

- **No changes to** `src/routes/index.tsx`, `bills`, `buyers`, `products`, `estimate`, `sales-report`, `purchase-report`, billing header, or any billing lib/component.
- `__root.tsx`: extend layout rules so `/auditing/*` renders without the billing `AppHeader` (module provides its own shell). Billing paths untouched.
- **Old `/audit/*` placeholder routes deleted** in this turn (superseded).
- No new DB migrations, no changes to Supabase types, no edits to auto-generated files.
- All new deps kept minimal: uses already-installed `recharts`, `@tanstack/react-table` if present (else added), `zustand` (added if not present), `date-fns`. No framer-motion added — Tailwind keyframes + existing utilities cover the requested micro-animations.
- Full TypeScript, error boundaries (`errorComponent` + `notFoundComponent` on every route with a loader), suspense/skeleton loaders on data-heavy pages, responsive layouts (sidebar collapses under `md`).

## What is **not** in this turn

- Real Supabase tables / RLS / server functions for audits — deferred to Phase 2 to keep this shippable and reviewable.
- Real barcode camera integration (uses simulator; a real `@zxing/browser` scanner can be dropped into `BarcodeScannerPanel` later).
- Email delivery for notifications (in-app + toast only).

Approve to proceed, or tell me what to trim/expand (e.g. "skip Users + Settings for now", "include Phase 2 migrations", "use framer-motion").
