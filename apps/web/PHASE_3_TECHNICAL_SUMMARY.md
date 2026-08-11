# Phase 3: Knowledge Control Center — Technical Summary

## Quick Facts

### Registry Architecture
- **Hook**: `useKnowledgeRegistry()` in context provider
- **State**: In-memory only (demo) → API-backed (Phase 4)
- **Stable IDs**: `kb-{timestamp}-{random}` for bases, `{baseId}-src-{random}` for sources
- **Readiness**: `getKnowledgeReadiness(kb)` → READY | INDEXING | EMPTY | FAILED | DISABLED

### Pages & Routes
- **List**: `/admin/knowledge` - Search, filter, sort, create, manage
- **Detail**: `/admin/knowledge/:knowledgeId` - 6 tabs with full lifecycle
- **Tabs**: Overview | Sources | Processing | Agents | Test | Activity

### Data Model
```
KnowledgeBase {
  id, name, description, disabled
  indexStatus: pending|processing|indexed|failed
  sources: KnowledgeSource[]
  assignedAgentIds: string[] (refs to agents)
  metadata, createdAt, updatedAt, activity
}

KnowledgeSource {
  id, type, title, status, sizeLabel, createdAt, updatedAt
}

KnowledgeActivityEntry {
  id, type, message, actor, timestamp
}
```

### Registry Methods
**Bases**: create | update | delete | duplicate | disable | enable | getById  
**Sources**: add | update | remove | retrySource | disableSource | enableSource | reindexSource  
**Indexing**: reindexKnowledgeBase | startIndexing  
**Agents**: assignAgent | removeAgent  
**Activity**: logActivity

### Demo Behaviors
- **Indexing**: Simulated with 900ms setTimeout, sources → indexed
- **Retrieval**: Frontend-only harness, no real vector search
- **Persistence**: In-memory only, resets on page reload
- **Activity**: Demo messages only (not real audit log)

### Integration Points
1. **AgentDetailPage**: KnowledgeTab shows assigned bases, can assign/remove
2. **AgentBuilderPage**: Knowledge step, publish readiness checks all assigned bases are READY
3. **No Inverse Refs**: Knowledge doesn't reference agents directly, only via assignedAgentIds

### Build Status
- `npm run typecheck` → PASS
- `npm run lint` → PASS  
- `npm run build` → PASS (1.1 MB JS)

### Browser-Tested Flows
1. Create KB → Add Document → Add URL → Start Indexing → READY
2. Assign to Agent → View on Agent Detail → See readiness badge
3. Agent Builder shows knowledge availability
4. All 6 tabs load correctly
5. Source management (add, edit, remove, retry, disable, re-index)
6. Activity timeline captures events

---

## File Locations

```
src/admin/
├── hooks/
│   ├── useKnowledgeRegistry.tsx (450+ lines, core registry)
│   └── useAgentRegistry.tsx (existing, enhanced for knowledge)
├── pages/
│   ├── KnowledgePage.tsx (380+ lines, list view)
│   ├── KnowledgeDetailPage.tsx (600+ lines, detail + 6 tabs)
│   ├── AgentDetailPage.tsx (existing, enhanced Knowledge tab)
│   └── AgentBuilderPage.tsx (existing, enhanced knowledge step)
└── components/
    ├── statusMaps.ts (readiness/source badges)
    └── (reused: Drawer, ConfirmDialog, AssignmentDrawer, etc)
```

---

## For Phase 4: Backend Connection

**No UI changes needed. Just replace registry backend:**

```typescript
// Phase 3 (current):
const [knowledgeBases, setKnowledgeBases] = useState(INITIAL_KB_DATA);

// Phase 4 (backend):
const [knowledgeBases, setKnowledgeBases] = useState([]);
useEffect(() => {
  fetchKnowledgeBases().then(setKnowledgeBases);
}, []);

// createKnowledgeBase changes from local to:
const result = await api.post('/api/v1/admin/knowledge', { name, description });
setKnowledgeBases([...knowledgeBases, result]);
```

Same components, pages, hooks work with real API.

---

## Known Issues / Gotchas

1. **In-memory state resets on page reload** - Intentional for demo, not a bug
2. **No real indexing** - 900ms simulation only
3. **Sources with title "fail" become failed** - Demo Easter egg to test FAILED readiness
4. **Activity is demo-only** - Not persisted, cleared with state reset
5. **Sizes are demo defaults** - Documents 1.2 MB, URLs null

---

## Quick Troubleshooting

**Q: Why can't I see my newly created KB after refresh?**  
A: In-memory demo state. All data lost on reload until backend (Phase 4).

**Q: Knowledge assigned to agent but not showing on Agent Detail?**  
A: Check that refresh hasn't reset state. State persists within session until hard reload.

**Q: Why does indexing always succeed?**  
A: Demo simulation (900ms timeout → all indexed). Only sources with "fail" in title become failed.

**Q: Can I edit after assigning to agent?**  
A: Yes, full edit capability at any time. No publish-locks like in Agent Builder.

---

## Command Reference

```bash
# From Aura-Frontend/apps/web:
npm run typecheck    # Type checking
npm run lint         # ESLint
npm run build        # Production build
npm run dev          # Development server

# From workspace root:
npm --prefix Aura-Frontend/apps/web run typecheck
npm --prefix Aura-Frontend/apps/web run build
```

---

**Last Updated**: 2026-08-11  
**Status**: Phase 3 ✅ COMPLETE
