# Respond Flow Chart

A flow-chart builder built with Vue 3 (JavaScript/ES6): create, edit, connect and
delete nodes on an interactive canvas, with per-type detail drawers, validation and
undo/redo.

> Demo: _Vercel URL_

## Demo video

[![Flow Chart Builder demo](https://img.youtube.com/vi/YoXz9-dxYro/maxresdefault.jpg)](https://youtu.be/YoXz9-dxYro)

## Run

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

Stack: Vue 3 `<script setup>` · Vite · Pinia · Vue Router · TanStack vue-query ·
Vue Flow · @vuepic/vue-datepicker · vee-validate + zod · Tailwind v4 · Vitest

## Adding steps

- **Add New Step** in the header creates a step below the last node in the flow, regardless of its branch, so it is never left floating by accident.
- The **+** controls open the dialog in context: an edge + inserts a step between two elements, while a node or branch + adds it as the last child.

## Design decisions

- **localStorage persistence.** There is no backend, so saved flows stay in the browser. The query layer handles loading and saving; editing the flow does not write it implicitly.
- **Stored positions win.** A node keeps its saved position; `computeLayout()` only supplies missing positions and keeps new nodes near their parent.
- **Drawer edits stay local.** Changes are applied to the store only on Save, so closing or switching drawers cannot leak edits.
- **History uses capped snapshots.** Mutations store JSON snapshots for simple undo/redo and dirty-state checks.
- **Saving is explicit and validated.** Header Save, drawer Save and the reload guard validate the whole flow before persisting it.

## Project structure

```
src/
├── api/flowApi.js          # fetch/persist + layout + payload ↔ graph transforms + type labels
├── composables/useFlowQueries.js  # vue-query wrappers (query + save mutation)
├── stores/flow.js          # Pinia store: payload, computed graph, history, mutations
├── components/
│   ├── canvas/             # create dialog, header, ⊕ edge chip
│   ├── drawers/            # details drawer + per-type panels + timezone combobox
│   ├── nodes/              # canvas node components (trigger, 3 types, branch pill, stub)
│   └── ui/                 # shadcn-vue style primitives
├── pages/FlowPage.vue      # the app's only page: canvas, events, guards, shortcuts
└── utils/validation.js     # shared zod schemas + whole-payload validation
```

## Tests

`pnpm test` runs 20 focused tests in `tests/`:

- **store** — add/update/delete/connect, insert-between, branch handling, drag
  persistence, batched drag undo, discard semantics;
- **api** — localStorage hydration, `payload.json` fallback, writes, and quota errors;
- **composables** — save mutation cache and dirty handling;
- **components** — create-dialog context, drawer draft/save/discard/attachments,
  whole-flow save validation, node panels, and branch plus buttons;
- **utils** — schema limits and whole-payload validation.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs ESLint, formatting checks, tests
and the production build on every push to `main` and every PR. Deployment/hosting is
handled by Vercel.
