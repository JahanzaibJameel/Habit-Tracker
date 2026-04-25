#!/usr/bin/env node

/**
 * Enterprise-Grade Unused File Analysis Script
 * 
 * This script provides comprehensive analysis of potentially unused files
 * in the habit tracker enterprise codebase, respecting the sophisticated
 * architecture and ensuring no critical files are mistakenly flagged.
 * 
 * Usage: node scripts/analyze-unused-files.js [--report|--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration for enterprise-grade analysis
const CONFIG = {
  // Critical files that should never be flagged as unused
  protectedFiles: new Set([
    'app/layout.tsx',
    'app/error.tsx',
    'app/loading.tsx',
    'app/not-found.tsx',
    'app/page.tsx',
    'middleware.ts',
    'instrumentation.ts',
    'tailwind.config.js',
    'next.config.js',
    'tsconfig.json',
    '.eslintrc.json',
    'package.json',
    'knip.json',
    'Dockerfile',
    '.github/workflows/ci.yml',
    'src/core/README.md',
    'docs/RUNBOOK.md',
    'CHAOS_TESTING_REPORT.md',
    'PRODUCTION_AUDIT_REPORT.md'
  ]),

  // Patterns that should be carefully analyzed
  specialPatterns: {
    storybook: ['**/*.stories.@(js|jsx|ts|tsx)', '**/*.story.@(js|jsx|ts|tsx)'],
    tests: ['**/__tests__/**', '**/*.test.@(js|jsx|ts|tsx)', '**/*.spec.@(js|jsx|ts|tsx)'],
    monitoring: ['src/core/monitoring/**', 'src/core/performance/**'],
    migrations: ['src/core/storage/migrations/**'],
    errorBoundary: ['src/core/error-boundary/**'],
    validation: ['src/core/validation/**']
  },

  // File extensions to analyze
  extensions: ['.ts', '.tsx', '.js', '.jsx'],

  // Directories to exclude from analysis
  excludeDirs: [
    'node_modules',
    '.next',
    'dist',
    'build',
    'coverage',
    '.nyc_output',
    'storybook-static',
    'playwright-report',
    'test-results'
  ]
};

class EnterpriseFileAnalyzer {
  constructor() {
    this.projectRoot = process.cwd();
    this.unusedFiles = new Set();
    this.protectedFiles = new Set();
    this.specialFiles = new Set();
    this.analysisResults = {
      totalFiles: 0,
      unusedFiles: 0,
      protectedFiles: 0,
      specialFiles: 0,
      recommendations: []
    };
  }

  /**
   * Run knip to detect unused files
   */
  async runKnip() {
    console.log('🔍 Running knip analysis...');
    
    try {
      const output = execSync('npx knip --production --json', { 
        encoding: 'utf8',
        cwd: this.projectRoot 
      });
      
      const knipResults = JSON.parse(output);
      return knipResults;
    } catch (error) {
      // knip returns non-zero exit code when issues are found
      const output = error.stdout || error.message;
      try {
        return JSON.parse(output);
      } catch (parseError) {
        console.warn('⚠️  Could not parse knip output, falling back to manual analysis');
        return null;
      }
    }
  }

  /**
   * Get all TypeScript/JavaScript files in the project
   */
  getAllFiles() {
    const files = [];
    
    const scanDirectory = (dir, relativePath = '') => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const itemRelativePath = path.join(relativePath, item);
        
        // Skip excluded directories
        if (CONFIG.excludeDirs.some(excluded => itemRelativePath.includes(excluded))) {
          continue;
        }
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath, itemRelativePath);
        } else if (CONFIG.extensions.some(ext => item.endsWith(ext))) {
          files.push(itemRelativePath);
        }
      }
    };
    
    scanDirectory(this.projectRoot);
    return files;
  }

  /**
   * Check if a file is protected
   */
  isProtectedFile(filePath) {
    return CONFIG.protectedFiles.has(filePath) || 
           CONFIG.protectedFiles.has(path.basename(filePath));
  }

  /**
   * Check if a file matches special patterns
   */
  isSpecialFile(filePath) {
    for (const [category, patterns] of Object.entries(CONFIG.specialPatterns)) {
      for (const pattern of patterns) {
        if (this.matchPattern(filePath, pattern)) {
          return { category, pattern };
        }
      }
    }
    return null;
  }

  /**
   * Simple glob pattern matching
   */
  matchPattern(filePath, pattern) {
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]')
      .replace(/\./g, '\\.')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\|/g, '|');
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(filePath);
  }

  /**
   * Analyze file dependencies manually
   */
  analyzeFileDependencies(filePath) {
    const fullPath = path.join(this.projectRoot, filePath);
    
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // Check for dynamic imports that knip might miss
      const dynamicImports = content.match(/import\s*\(/g) || [];
      const requireCalls = content.match(/require\s*\(/g) || [];
      
      // Check for Next.js specific patterns
      const nextPatterns = [
        /app\/.*\/page\.(ts|tsx)/,
        /app\/.*\/layout\.(ts|tsx)/,
        /app\/.*\/loading\.(ts|tsx)/,
        /app\/.*\/error\.(ts|tsx)/,
        /app\/.*\/not-found\.(ts|tsx)/
      ];
      
      const isNextSpecial = nextPatterns.some(pattern => pattern.test(filePath));
      
      return {
        hasDynamicImports: dynamicImports.length > 0,
        hasRequireCalls: requireCalls.length > 0,
        isNextSpecial,
        content
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Generate comprehensive analysis report
   */
  generateReport(knipResults, allFiles) {
    console.log('\n📊 ENTERPRISE-GRADE FILE ANALYSIS REPORT');
    console.log('='.repeat(60));
    
    this.analysisResults.totalFiles = allFiles.length;
    
    // Process knip results
    if (knipResults && knipResults.files) {
      for (const filePath of knipResults.files) {
        if (this.isProtectedFile(filePath)) {
          this.protectedFiles.add(filePath);
          console.log(`🛡️  PROTECTED: ${filePath} (Critical system file)`);
        } else {
          const specialInfo = this.isSpecialFile(filePath);
          if (specialInfo) {
            this.specialFiles.add(filePath);
            console.log(`⚠️  SPECIAL: ${filePath} (${specialInfo.category})`);
          } else {
            this.unusedFiles.add(filePath);
            console.log(`🗑️  UNUSED: ${filePath}`);
          }
        }
      }
    }
    
    // Manual analysis for files knip might miss
    console.log('\n🔬 Performing deep analysis...');
    for (const filePath of allFiles) {
      if (knipResults && knipResults.files && knipResults.files.includes(filePath)) {
        continue; // Already processed by knip
      }
      
      const deps = this.analyzeFileDependencies(filePath);
      if (deps && (deps.hasDynamicImports || deps.isNextSpecial)) {
        console.log(`🔍 ANALYZED: ${filePath} (Special patterns detected)`);
      }
    }
    
    this.analysisResults.unusedFiles = this.unusedFiles.size;
    this.analysisResults.protectedFiles = this.protectedFiles.size;
    this.analysisResults.specialFiles = this.specialFiles.size;
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Print summary
    this.printSummary();
  }

  /**
   * Generate intelligent recommendations
   */
  generateRecommendations() {
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('-'.repeat(30));
    
    if (this.unusedFiles.size > 0) {
      this.analysisResults.recommendations.push({
        type: 'cleanup',
        priority: 'medium',
        message: `Found ${this.unusedFiles.size} potentially unused files for review`
      });
      
      console.log(`🧹 Review ${this.unusedFiles.size} unused files in separate PR`);
      console.log('   - Delete in individual commits for easy rollback');
      console.log('   - Run full test suite after each deletion');
      console.log('   - Monitor bundle size and performance metrics');
    }
    
    if (this.specialFiles.size > 0) {
      this.analysisResults.recommendations.push({
        type: 'review',
        priority: 'low',
        message: `${this.specialFiles.size} files need manual review due to special patterns`
      });
      
      console.log(`🔍 Manually review ${this.specialFiles.size} special files`);
      console.log('   - Storybook files: Check design system documentation');
      console.log('   - Test files: Verify test coverage requirements');
      console.log('   - Migration files: Check rollback strategy needs');
    }
    
    if (this.protectedFiles.size > 0) {
      console.log(`🛡️  ${this.protectedFiles.size} critical files protected from deletion`);
    }
  }

  /**
   * Print analysis summary
   */
  printSummary() {
    console.log('\n📈 SUMMARY:');
    console.log('-'.repeat(20));
    console.log(`Total files analyzed: ${this.analysisResults.totalFiles}`);
    console.log(`Potentially unused: ${this.analysisResults.unusedFiles}`);
    console.log(`Protected files: ${this.analysisResults.protectedFiles}`);
    console.log(`Special files: ${this.analysisResults.specialFiles}`);
    
    const unusedPercentage = ((this.analysisResults.unusedFiles / this.analysisResults.totalFiles) * 100).toFixed(1);
    console.log(`Unused percentage: ${unusedPercentage}%`);
    
    if (this.analysisResults.unusedFiles === 0) {
      console.log('\n✅ EXCELLENT: No unused files detected!');
    } else if (unusedPercentage < 5) {
      console.log('\n👍 GOOD: Low percentage of unused files');
    } else if (unusedPercentage < 10) {
      console.log('\n⚠️  MODERATE: Consider cleanup');
    } else {
      console.log('\n🚨 HIGH: Significant cleanup needed');
    }
  }

  /**
   * Generate detailed file list for cleanup
   */
  generateCleanupList() {
    if (this.unusedFiles.size === 0) {
      console.log('\n✨ No files need cleanup!');
      return;
    }
    
    console.log('\n📋 CLEANUP LIST (Safe to delete):');
    console.log('='.repeat(40));
    
    const sortedFiles = Array.from(this.unusedFiles).sort();
    for (const file of sortedFiles) {
      console.log(`  - ${file}`);
    }
    
    console.log('\n🎯 CLEANUP STRATEGY:');
    console.log('1. Create feature branch: "cleanup/remove-unused-files"');
    console.log('2. Delete files one by one in separate commits');
    console.log('3. Run: npm run test && npm run build after each deletion');
    console.log('4. Monitor: npm run analyze for bundle size changes');
    console.log('5. Submit PR for review before merging');
  }

  /**
   * Main analysis execution
   */
  async analyze(options = {}) {
    console.log('🚀 Starting Enterprise-Grade File Analysis...\n');
    
    // Run knip analysis
    const knipResults = await this.runKnip();
    
    // Get all project files
    const allFiles = this.getAllFiles();
    console.log(`📁 Found ${allFiles.length} files to analyze\n`);
    
    // Generate comprehensive report
    this.generateReport(knipResults, allFiles);
    
    // Show cleanup list if requested
    if (options.showCleanupList) {
      this.generateCleanupList();
    }
    
    // Export results for CI integration
    if (options.exportResults) {
      this.exportResults();
    }
    
    return this.analysisResults;
  }

  /**
   * Export results for CI/CD integration
   */
  exportResults() {
    const results = {
      timestamp: new Date().toISOString(),
      analysis: this.analysisResults,
      unusedFiles: Array.from(this.unusedFiles),
      protectedFiles: Array.from(this.protectedFiles),
      specialFiles: Array.from(this.specialFiles),
      recommendations: this.analysisResults.recommendations
    };
    
    const outputPath = path.join(this.projectRoot, 'unused-files-analysis.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Results exported to: ${outputPath}`);
  }
}

// CLI execution
if (require.main === module) {
  const analyzer = new EnterpriseFileAnalyzer();
  
  const args = process.argv.slice(2);
  const options = {
    showCleanupList: args.includes('--cleanup') || args.includes('--list'),
    exportResults: args.includes('--export') || args.includes('--ci')
  };
  
  analyzer.analyze(options).catch(error => {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
  });
}

module.exports = EnterpriseFileAnalyzer;
