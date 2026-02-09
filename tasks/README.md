# Task Documentation

This directory contains documentation for complex development tasks.

## Naming Convention

`TASK-{YYYYMMDD-HHMM}-{short-description}.md`

Example: `TASK-20260208-1730-add-quota-display.md`

## Template

Use this template for new tasks:

```markdown
# TASK-{timestamp}: {Task Title}

## Status
- [ ] Planning
- [ ] In Progress
- [ ] Review
- [ ] Completed

## Description
{Detailed description}

## Affected Components
- [ ] Backend API
- [ ] Frontend UI
- [ ] Database
- [ ] Configuration
- [ ] Documentation

## Files to Modify
- `path/to/file1.py`
- `path/to/file2.tsx`

## Dependencies
- External APIs needed
- New packages required
- Configuration changes

## Success Criteria
1. Criterion 1
2. Criterion 2

## Implementation Plan
{Filled by Plan agent or developer}

### Phase 1: Backend Changes
- Task 1
- Task 2

### Phase 2: Frontend Changes
- Task 1
- Task 2

### Phase 3: Integration
- Build
- Deploy
- Test

## Agents Involved
- Plan agent: {summary}
- Backend agent: {summary}
- Frontend agent: {summary}

## Results
- Commits: {commit hashes}
- Deployed: {timestamp}
- Verified: {yes/no}

## Lessons Learned
{Optional: what went well, what could be improved}
```

## Task Status

- 📝 **Planning**: Analyzing requirements and designing approach
- 🚧 **In Progress**: Implementation underway
- 👀 **Review**: Changes ready, pending verification
- ✅ **Completed**: Task finished and deployed

## Archiving

Completed tasks older than 30 days can be moved to `tasks/archive/`.
