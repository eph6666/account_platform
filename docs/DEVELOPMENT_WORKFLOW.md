# Development Workflow for Complex Tasks

## Overview

For complex tasks involving multiple components, we follow a structured 3-phase approach using parallel agent execution.

## Phase 1: Planning & Analysis

### Step 1: Create Task Document
Create a new task document in `tasks/` directory:

```markdown
# TASK-{timestamp}: {Task Title}

## Description
{Detailed description of what needs to be done}

## Affected Components
- [ ] Backend API
- [ ] Frontend UI
- [ ] Database Schema
- [ ] Configuration
- [ ] Documentation

## Files to Modify
- `backend/app/api/...`
- `frontend/src/components/...`

## Dependencies
- External APIs
- New packages
- Configuration changes

## Success Criteria
1. Feature works as expected
2. Tests pass
3. Code deployed successfully
4. Documentation updated

## Implementation Plan
{Will be filled by Plan agent}
```

### Step 2: Launch Plan Agent
Use the Plan agent to analyze and design:

```bash
# Main agent creates task
TaskCreate:
  subject: "Plan implementation for {feature}"
  description: "Analyze codebase and design implementation approach"

# Launch Plan agent
Task(subagent_type="Plan", prompt="Analyze {task} and create implementation plan")
```

## Phase 2: Parallel Execution

### Step 3: Create Subtasks
Based on the plan, create parallel subtasks:

```bash
TaskCreate: "Update backend API endpoints"
TaskCreate: "Create frontend components"
TaskCreate: "Update configuration files"
TaskCreate: "Write tests"
```

### Step 4: Launch Parallel Agents

Execute independent tasks in parallel:

```bash
# Single message with multiple Task tool calls
Task(subagent_type="general-purpose", prompt="Implement backend changes for {task}")
Task(subagent_type="general-purpose", prompt="Implement frontend changes for {task}")
Task(subagent_type="Bash", prompt="Update configuration and environment files")
```

**Important**: Send all Task calls in a single message for true parallelization.

### Step 5: Monitor Progress
```bash
TaskList  # Check status of all subtasks
```

## Phase 3: Integration & Verification

### Step 6: Review & Build
```bash
# Review changes
git diff

# Build frontend
cd frontend && npm run build

# Build backend Docker image
cd backend && docker build -t app:latest .
```

### Step 7: Deploy
```bash
# Deploy frontend
aws s3 sync dist/ s3://bucket
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"

# Deploy backend
docker push ecr-repo/app:latest
aws ecs update-service --cluster xxx --service xxx --force-new-deployment
```

### Step 8: Verify
```bash
# Check logs
aws logs tail /ecs/app --since 2m

# Test API endpoints
curl https://api.example.com/endpoint

# Test frontend
# Open browser and verify functionality
```

### Step 9: Commit & Document
```bash
# Commit changes
git add -A
git commit -m "feat: {feature description}

Implemented:
- Backend API changes
- Frontend UI components
- Configuration updates

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

git push origin master

# Update task document with results
```

## Example: Real Use Case

**Task**: "Add quota refresh button with loading state and error handling"

### Phase 1: Planning
```markdown
# TASK-20260208-1730: Add Quota Refresh UI Improvements

## Affected Components
- [x] Frontend: QuotaCard component
- [x] Frontend: API hook
- [x] Backend: Error handling
- [ ] Tests

## Files to Modify
- `frontend/src/components/QuotaCard.tsx`
- `frontend/src/hooks/useQuota.ts`
- `backend/app/api/accounts.py`
```

### Phase 2: Execution (Parallel)
```bash
# Launch 2 agents in parallel
Task("Update QuotaCard component with loading states")
Task("Add error handling to refresh quota API")
```

### Phase 3: Integration
```bash
npm run build
docker build && docker push
aws ecs update-service --force-new-deployment
# Test and verify
git commit -m "feat: improve quota refresh UX"
```

## Benefits of This Approach

1. **Structured**: Every complex task follows same workflow
2. **Traceable**: Task documents provide audit trail
3. **Efficient**: Parallel execution saves 40-60% time
4. **Reliable**: Planning phase catches issues early
5. **Resumable**: Can pick up where left off if interrupted

## When NOT to Use

For simple tasks (1-2 file changes, no exploration needed):
- Just use direct Edit/Write tools
- No need for task document or planning
- Single-threaded execution is fine

## Guidelines

### Task Complexity Assessment
- **Simple** (direct execution): 1-2 files, clear requirements
- **Medium** (use TaskCreate): 3-5 files, some exploration needed
- **Complex** (full workflow): 5+ files, architecture decisions, cross-cutting changes

### Agent Selection
- **Plan**: Architecture decisions, codebase exploration
- **Explore**: Finding code patterns, understanding structure
- **Bash**: Build, deploy, git operations
- **general-purpose**: Implementation work, refactoring

### Parallelization Rules
1. Tasks with no dependencies → Run in parallel
2. Tasks sharing files → Run sequentially
3. Frontend + Backend → Always parallel
4. Build/Deploy → Always sequential after changes

## Checklist for Complex Tasks

Planning Phase:
- [ ] Created task document
- [ ] Launched Plan agent
- [ ] Reviewed implementation plan
- [ ] Identified all affected files

Execution Phase:
- [ ] Created subtasks in TaskCreate
- [ ] Launched parallel agents (if applicable)
- [ ] Monitored progress via TaskList
- [ ] Marked completed tasks

Integration Phase:
- [ ] Reviewed all changes
- [ ] Built frontend
- [ ] Built backend Docker image
- [ ] Deployed to dev environment
- [ ] Verified functionality
- [ ] Committed with descriptive message
- [ ] Updated task document
