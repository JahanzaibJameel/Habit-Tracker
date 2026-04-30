# Enterprise-Grade File Cleanup Strategy

## Overview

This guide provides a comprehensive, enterprise-grade approach to safely identifying and removing unused files from the habit tracker codebase while respecting the sophisticated architecture and ensuring no disruption to production systems.

## 🛡️ Safety-First Approach

### Critical Protection Rules

1. **Never delete protected files** - Critical system files are automatically protected
2. **Manual review required** - Special pattern files need human verification
3. **Gradual deletion** - Delete files one by one in separate commits
4. **Full testing** - Run complete test suite after each deletion
5. **Performance monitoring** - Track bundle size and metrics

### Protected Files (Never Delete)

```
app/layout.tsx              # Next.js root layout
app/error.tsx               # Error boundary
app/loading.tsx             # Loading states
app/not-found.tsx           # 404 handling
app/page.tsx                # Home page
middleware.ts               # Next.js middleware
instrumentation.ts          # Sentry/monitoring
tailwind.config.js          # Tailwind configuration
next.config.js              # Next.js configuration
tsconfig.json               # TypeScript configuration
.eslintrc.json              # ESLint rules
package.json                # Dependencies
knip.json                   # Dead file detection
Dockerfile                  # Containerization
.github/workflows/ci.yml   # CI/CD pipeline
src/core/README.md          # Architecture documentation
docs/RUNBOOK.md             # Operations guide
CHAOS_TESTING_REPORT.md     # Testing documentation
PRODUCTION_AUDIT_REPORT.md  # Audit documentation
```

## 🔧 Tools and Configuration

### 1. Knip Configuration (`knip.json`)

Enterprise-grade configuration that respects:

- Next.js App Router patterns
- Storybook files
- Test files
- Monitoring and instrumentation
- Migration history
- Error boundaries

### 2. Analysis Script (`scripts/analyze-unused-files.js`)

Comprehensive analysis tool that:

- Runs knip with enterprise configuration
- Performs deep dependency analysis
- Identifies special pattern files
- Generates detailed reports
- Provides cleanup recommendations

### 3. CI/CD Integration

Automatic dead file detection in the security-scan job:

```yaml
- name: Check for unused code (knip)
  run: npx knip --production
```

## 🚀 Usage Instructions

### Local Development

```bash
# Run comprehensive analysis
npm run analyze:unused

# Export results for CI
npm run analyze:unused-ci

# Quick knip check
npm run knip:production
```

### CI/CD Pipeline

The pipeline automatically checks for unused files and will:

- Warn about unused files
- Block deletion of protected files
- Flag special pattern files for manual review
- Generate analysis reports

## 📊 Analysis Categories

### 🗑️ Unused Files (Safe to Delete)

Files that:

- Have no imports or exports
- Are not referenced by any other files
- Are not protected or special pattern files
- Can be safely removed

**Action**: Delete in separate commits with testing

### ⚠️ Special Files (Manual Review Required)

Files that match special patterns:

- **Storybook files** (`*.stories.*`) - Check design system docs
- **Test files** (`*.test.*`, `*.spec.*`) - Verify test coverage
- **Migration files** - Check rollback strategy needs
- **Monitoring files** - Verify telemetry requirements
- **Error boundary files** - Check error handling strategy

**Action**: Manual review before deletion

### 🛡️ Protected Files (Never Delete)

Critical system files essential for:

- Application entry points
- Configuration and build tools
- CI/CD pipeline
- Documentation and operations
- Error handling and monitoring

**Action**: Never delete

## 🎯 Cleanup Workflow

### Phase 1: Analysis

```bash
# Run comprehensive analysis
npm run analyze:unused

# Review the generated report
cat unused-files-analysis.json
```

### Phase 2: Preparation

```bash
# Create feature branch
git checkout -b cleanup/remove-unused-files

# Backup current state
git checkout -b backup/pre-cleanup-state
```

### Phase 3: Gradual Cleanup

```bash
# For each unused file:
git rm src/components/unused-component.tsx
git commit -m "cleanup: remove unused component"

# Test after each deletion
npm run test
npm run build
npm run analyze

# Monitor performance
npm run size-limit
```

### Phase 4: Validation

```bash
# Run full test suite
npm run test:unit
npm run test:e2e

# Performance validation
npm run build
npm run analyze

# Bundle size check
npm run size-limit
```

### Phase 5: Deployment

```bash
# Submit for review
git push origin cleanup/remove-unused-files
# Create PR with detailed description

# After approval and merge:
git checkout main
git pull origin main
```

## 📈 Success Metrics

### Before Cleanup

- Record current bundle size
- Document performance metrics
- Note test coverage percentage
- Count total files

### After Cleanup

- Bundle size reduction
- Improved build times
- Maintained test coverage
- Reduced file count

### Monitoring

- Watch for any performance regressions
- Monitor error rates in production
- Check bundle size trends
- Validate CI/CD pipeline stability

## 🔍 Advanced Scenarios

### Dynamic Imports

Files with dynamic imports may appear unused but are loaded at runtime:

```typescript
// These files won't be detected by static analysis
const Component = lazy(() => import('./heavy-component'));
```

### Next.js Special Files

Next.js has special file conventions:

- `layout.tsx` - Route layouts
- `page.tsx` - Route pages
- `loading.tsx` - Loading states
- `error.tsx` - Error boundaries
- `not-found.tsx` - 404 pages

### Storybook Integration

Storybook files may not be imported in the main app:

- `*.stories.tsx` - Story definitions
- `*.story.tsx` - Alternative story format

### Monitoring and Instrumentation

Files may be loaded by monitoring systems:

- `instrumentation.ts` - Sentry configuration
- Monitoring adapters - Error tracking setup

## 🚨 Emergency Procedures

### If Breakage Occurs

1. **Immediate rollback**: `git revert HEAD`
2. **Investigate**: Check what broke and why
3. **Fix**: Address the root cause
4. **Test**: Verify the fix works
5. **Retry**: Continue with remaining files

### Recovery from Bad Deletion

```bash
# Restore from backup branch
git checkout backup/pre-cleanup-state
git cherry-pick <good-commits>
git checkout main
git merge backup/pre-cleanup-state
```

## 📋 Checklist

### Before Starting Cleanup

- [ ] Full backup of current state
- [ ] All tests passing
- [ ] Performance benchmarks recorded
- [ ] Bundle size documented
- [ ] CI/CD pipeline stable

### During Cleanup

- [ ] Each file deleted in separate commit
- [ ] Tests run after each deletion
- [ ] Build successful after each deletion
- [ ] No performance regressions
- [ ] Bundle size monitored

### After Cleanup

- [ ] All tests passing
- [ ] Performance maintained or improved
- [ ] Bundle size reduced
- [ ] Documentation updated
- [ ] Team notified of changes

## 🎓 Best Practices

### General Principles

1. **Safety first** - Never rush file deletion
2. **Gradual approach** - One file at a time
3. **Comprehensive testing** - Test everything
4. **Performance awareness** - Monitor metrics
5. **Documentation** - Keep records of changes

### Team Collaboration

1. **Code review** - All deletions reviewed
2. **Communication** - Notify team of changes
3. **Documentation** - Update relevant docs
4. **Training** - Educate team on process

### Continuous Improvement

1. **Automation** - Improve detection tools
2. **Monitoring** - Track cleanup effectiveness
3. **Process refinement** - Learn from mistakes
4. **Knowledge sharing** - Share findings with team

---

## 📞 Support

For questions or issues with the file cleanup process:

1. Check this guide first
2. Review the analysis report
3. Consult the architecture documentation
4. Contact the development team

Remember: In an enterprise-grade codebase, it's better to be cautious and thorough than to risk breaking production systems.
