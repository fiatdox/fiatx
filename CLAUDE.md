# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
```

No test suite is configured.

## Architecture

This is **PYHOS-ERP** — a Thai hospital ministry portal built with Next.js App Router. The UI is entirely in Thai (ภาษาไทย).

### Tech Stack
- **Next.js 16** with App Router (Turbopack enabled in dev)
- **Ant Design v6** for all UI components
- **Tailwind CSS v4** for layout/utility classes
- **react-icons** (FaXxx icons from `fa` set) alongside Ant Design icons
- **SweetAlert2** for alerts
- **@svar-ui/react-gantt** for Gantt charts (HSS strategy pages)

### Page Structure Pattern

Every page follows this pattern — there is **no global Navbar in `layout.tsx`**, each page renders it directly:

```tsx
'use client'
// ...imports...

const PageContent = () => {
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200">
      <Navbar />
      <div className="p-6 md:p-8">
        {/* Breadcrumb + content */}
      </div>
    </div>
  )
}

export default function Page() {
  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm, token: { colorPrimary: '...', borderRadius: 8 } }}>
      <App>
        <PageContent />
      </App>
    </ConfigProvider>
  )
}
```

### Route Structure

Routes map to hospital departments:
- `/` — Login page (no Navbar)
- `/general/*` — General administration (vehicles, maintenance, room booking)
- `/hr/*` — Human resources (users, leave, settings)
- `/hss/strategy/*` — Health Support Services / strategy & planning (Gantt charts)
- `/information-technology/*` — IT department (HAIT assessment, computer repair, SLA, incident reports)
- `/accounting/*` — Finance (salary slips, system credentials) — routes exist in Navbar but pages not yet built

### Shared Component
`app/components/Navbar.tsx` — a single client component with:
- Left Drawer: full hierarchical navigation (Ant Design `Menu` with `SubMenu`)
- Right Drawer: user profile panel
- Auto-expands the active section based on `usePathname()`
- Theme color: `#6B21A8` (purple) for navbar; individual pages use `#006a5a` (teal) or `#6B21A8` (purple) as `colorPrimary`

### Styling Conventions
- Global dark background: `bg-slate-900`
- Primary color (teal): `#006a5a` — used on general/hr pages
- Secondary color (purple): `#6B21A8` — used on IT/HAIT pages
- CSS variables defined in `globals.css` map to Tailwind via `@theme inline`
- Font: **Sarabun** (Google Fonts, Thai + Latin subsets) applied globally via `layout.tsx`
- Ant Design dark algorithm is applied per-page via `ConfigProvider`, not globally

### Data
All pages currently use **local React state** with mock/static data — no backend API or database is wired up yet.
