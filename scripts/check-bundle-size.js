#!/usr/bin/env node

/**
 * Bundle size validation script
 * Reads bundle size reports and validates against performance budgets
 * Fails CI if budgets are exceeded
 * 
 * @fileoverview Bundle size validation for CI/CD pipeline
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  // Default bundle size limits (in bytes)
  DEFAULT_LIMITS: {
    'main': 250 * 1024, // 250KB
    'vendor': 500 * 1024, // 500KB
    'polyfills': 50 * 1024, // 50KB
    'runtime': 30 * 1024, // 30KB
    'total': 800 * 1024, // 800KB total
  },
  
  // Compression ratios for different file types
  COMPRESSION_RATIOS: {
    '.js': 0.3, // gzip compression
    '.css': 0.25,
    '.html': 0.3,
    '.json': 0.4,
  },
  
  // Report files to check
  REPORT_PATTERNS: [
    'dist/stats.json',
    'dist/webpack-stats.json',
    'dist/bundle-analyzer-report.json',
    '.next/build/analyze/bundle-analyzer-report.json',
    'build/static/js/stats.json',
  ],
  
  // Environment-specific budgets
  ENVIRONMENT_MULTIPLIERS: {
    'development': 2.0, // Allow 2x larger in dev
    'test': 1.5, // Allow 1.5x larger in test
    'production': 1.0, // Strict limits in prod
  },
};

/**
 * Colors for console output
 */
const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

/**
 * Colorize text for console output
 */
function colorize(text, color) {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

/**
 * Get current environment
 */
function getEnvironment() {
  return process.env.NODE_ENV || process.env.ENVIRONMENT || 'production';
}

/**
 * Load bundle size configuration
 */
function loadBundleConfig() {
  const configPath = path.resolve(process.cwd(), 'src/core/performance/budget.config.ts');
  
  if (fs.existsSync(configPath)) {
    try {
      // Simple regex extraction since we can't import TypeScript in Node.js
      const configContent = fs.readFileSync(configPath, 'utf8');
      
      // Extract bundle size limits
      const bundleSizeMatch = configContent.match(/bundleSize:\s*{([^}]+)}/);
      if (bundleSizeMatch) {
        const limitsSection = bundleSizeMatch[1];
        const limits = {};
        
        // Extract individual limits
        const limitMatches = limitsSection.match(/(\w+):\s*(\d+)/g);
        limitMatches?.forEach(match => {
          const [key, value] = match.split(':').map(s => s.trim());
          limits[key] = parseInt(value);
        });
        
        return limits;
      }
    } catch (error) {
      console.warn(colorize('Warning: Could not load bundle config, using defaults', 'yellow'));
    }
  }
  
  return CONFIG.DEFAULT_LIMITS;
}

/**
 * Find and load bundle size report
 */
function loadBundleReport() {
  for (const pattern of CONFIG.REPORT_PATTERNS) {
    const reportPath = path.resolve(process.cwd(), pattern);
    if (fs.existsSync(reportPath)) {
      try {
        const content = fs.readFileSync(reportPath, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        console.warn(colorize(`Warning: Could not parse report ${reportPath}`, 'yellow'));
      }
    }
  }
  
  // Try to generate a report if none exists
  console.log(colorize('No bundle report found, attempting to generate one...', 'yellow'));
  
  try {
    // Try different build tools
    if (fs.existsSync(path.resolve(process.cwd(), 'package.json'))) {
      const packageJson = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8'));
      
      if (packageJson.scripts?.['build:analyze']) {
        console.log(colorize('Running build:analyze...', 'blue'));
        execSync('npm run build:analyze', { stdio: 'inherit' });
        
        // Try to read the generated report again
        for (const pattern of CONFIG.REPORT_PATTERNS) {
          const reportPath = path.resolve(process.cwd(), pattern);
          if (fs.existsSync(reportPath)) {
            const content = fs.readFileSync(reportPath, 'utf8');
            return JSON.parse(content);
          }
        }
      }
    }
  } catch (error) {
    console.warn(colorize('Could not generate bundle report', 'yellow'));
  }
  
  return null;
}

/**
 * Extract bundle sizes from different report formats
 */
function extractBundleSizes(report) {
  const sizes = {};
  
  // Webpack Bundle Analyzer format
  if (report.assets) {
    report.assets.forEach(asset => {
      if (asset.name.endsWith('.js')) {
        const chunkName = asset.name.replace(/\.(js|map)$/, '');
        sizes[chunkName] = asset.size || 0;
      }
    });
  }
  
  // Next.js build stats format
  if (report.chunks) {
    report.chunks.forEach(chunk => {
      if (chunk.names?.length > 0) {
        const name = chunk.names[0];
        sizes[name] = chunk.size || 0;
      }
    });
  }
  
  // Custom stats format
  if (report.bundles) {
    Object.assign(sizes, report.bundles);
  }
  
  // Calculate total size
  sizes.total = Object.values(sizes).reduce((sum, size) => sum + size, 0);
  
  return sizes;
}

/**
 * Apply compression to bundle sizes
 */
function applyCompression(sizes) {
  const compressedSizes = {};
  
  Object.entries(sizes).forEach(([name, size]) => {
    const extension = name.endsWith('.js') ? '.js' : '.js'; // Assume JS for bundles
    const ratio = CONFIG.COMPRESSION_RATIOS[extension] || 0.3;
    compressedSizes[name] = Math.floor(size * ratio);
  });
  
  return compressedSizes;
}

/**
 * Validate bundle sizes against budgets
 */
function validateBundleSizes(sizes, budgets, environment) {
  const multiplier = CONFIG.ENVIRONMENT_MULTIPLIERS[environment] || 1.0;
  const violations = [];
  const warnings = [];
  
  Object.entries(budgets).forEach(([name, budget]) => {
    const actualSize = sizes[name] || 0;
    const adjustedBudget = Math.floor(budget * multiplier);
    
    if (actualSize > adjustedBudget) {
      const violation = {
        name,
        actual: actualSize,
        budget: adjustedBudget,
        percentage: ((actualSize - adjustedBudget) / adjustedBudget * 100).toFixed(1),
        severity: actualSize > adjustedBudget * 1.5 ? 'critical' : 'error',
      };
      
      violations.push(violation);
    } else if (actualSize > adjustedBudget * 0.8) {
      warnings.push({
        name,
        actual: actualSize,
        budget: adjustedBudget,
        percentage: ((actualSize / adjustedBudget) * 100).toFixed(1),
      });
    }
  });
  
  return { violations, warnings };
}

/**
 * Format size for display
 */
function formatSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)}KB`;
  }
  return `${bytes}B`;
}

/**
 * Display validation results
 */
function displayResults(sizes, budgets, { violations, warnings }, environment) {
  console.log(colorize('\n=== Bundle Size Report ===', 'cyan'));
  console.log(colorize(`Environment: ${environment}`, 'blue'));
  
  // Display sizes table
  console.log(colorize('\nBundle Sizes:', 'white'));
  console.log('Name'.padEnd(20) + 'Actual'.padEnd(15) + 'Budget'.padEnd(15) + 'Usage'.padEnd(10));
  console.log('-'.repeat(60));
  
  Object.entries(budgets).forEach(([name, budget]) => {
    const actual = sizes[name] || 0;
    const usage = ((actual / budget) * 100).toFixed(1);
    const usageColor = actual > budget ? 'red' : actual > budget * 0.8 ? 'yellow' : 'green';
    
    console.log(
      name.padEnd(20) +
      formatSize(actual).padEnd(15) +
      formatSize(budget).padEnd(15) +
      colorize(`${usage}%`, usageColor)
    );
  });
  
  // Display violations
  if (violations.length > 0) {
    console.log(colorize('\nVIOLATIONS:', 'red'));
    violations.forEach(violation => {
      const icon = violation.severity === 'critical' ? '!!' : '!';
      console.log(
        colorize(`${icon} ${violation.name}:`, 'red') +
        ` ${formatSize(violation.actual)} > ${formatSize(violation.budget)} ` +
        colorize(`(+${violation.percentage}%)`, 'red')
      );
    });
  }
  
  // Display warnings
  if (warnings.length > 0) {
    console.log(colorize('\nWARNINGS:', 'yellow'));
    warnings.forEach(warning => {
      console.log(
        colorize(`! ${warning.name}:`, 'yellow') +
        ` ${formatSize(warning.actual)} (${warning.percentage}% of budget)`
      );
    });
  }
  
  // Display summary
  console.log(colorize('\n=== Summary ===', 'cyan'));
  console.log(`Total bundle size: ${formatSize(sizes.total || 0)}`);
  console.log(`Violations: ${violations.length}`);
  console.log(`Warnings: ${warnings.length}`);
  
  return violations.length === 0;
}

/**
 * Generate JSON report for CI systems
 */
function generateJsonReport(sizes, budgets, results, environment) {
  const report = {
    timestamp: new Date().toISOString(),
    environment,
    sizes: Object.fromEntries(
      Object.entries(sizes).map(([name, size]) => [name, {
        bytes: size,
        formatted: formatSize(size),
      }])
    ),
    budgets: Object.fromEntries(
      Object.entries(budgets).map(([name, budget]) => [name, {
        bytes: budget,
        formatted: formatSize(budget),
      }])
    ),
    violations: results.violations,
    warnings: results.warnings,
    summary: {
      totalSize: sizes.total || 0,
      totalViolations: results.violations.length,
      totalWarnings: results.warnings.length,
      passed: results.violations.length === 0,
    },
  };
  
  const outputPath = path.resolve(process.cwd(), 'bundle-size-report.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(colorize(`\nJSON report written to: ${outputPath}`, 'blue'));
  
  return report;
}

/**
 * Main execution function
 */
function main() {
  console.log(colorize('Bundle Size Validation', 'cyan'));
  
  const environment = getEnvironment();
  console.log(colorize(`Environment: ${environment}`, 'blue'));
  
  // Load configuration
  const budgets = loadBundleConfig();
  console.log(colorize('Budget configuration loaded', 'green'));
  
  // Load bundle report
  const report = loadBundleReport();
  if (!report) {
    console.error(colorize('Error: No bundle size report found', 'red'));
    console.log(colorize('Generate a bundle report first (e.g., npm run build:analyze)', 'yellow'));
    process.exit(1);
  }
  
  console.log(colorize('Bundle report loaded', 'green'));
  
  // Extract sizes
  const rawSizes = extractBundleSizes(report);
  const compressedSizes = applyCompression(rawSizes);
  
  // Validate against budgets
  const results = validateBundleSizes(compressedSizes, budgets, environment);
  
  // Display results
  const passed = displayResults(compressedSizes, budgets, results, environment);
  
  // Generate JSON report
  generateJsonReport(compressedSizes, budgets, results, environment);
  
  // Exit with appropriate code
  if (passed) {
    console.log(colorize('\nBundle size validation PASSED', 'green'));
    process.exit(0);
  } else {
    console.log(colorize('\nBundle size validation FAILED', 'red'));
    console.log(colorize('Fix bundle size violations before merging', 'yellow'));
    process.exit(1);
  }
}

/**
 * Handle command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    help: false,
    verbose: false,
    environment: null,
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--env':
      case '-e':
        if (i + 1 < args.length) {
          options.environment = args[i + 1];
          i++;
        }
        break;
    }
  }
  
  return options;
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(colorize('Bundle Size Validation Tool', 'cyan'));
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/check-bundle-size.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  -h, --help     Show this help message');
  console.log('  -v, --verbose  Enable verbose output');
  console.log('  -e, --env ENV  Override environment (development|test|production)');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/check-bundle-size.js');
  console.log('  node scripts/check-bundle-size.js --env development');
  console.log('  node scripts/check-bundle-size.js --verbose');
  console.log('');
  console.log('Configuration:');
  console.log('  Bundle size limits are defined in src/core/performance/budget.config.ts');
  console.log('  Environment-specific multipliers are applied automatically');
  console.log('');
  console.log('Exit Codes:');
  console.log('  0 - All bundles within budget limits');
  console.log('  1 - One or more bundles exceed budget limits');
}

// Run script if called directly
if (require.main === module) {
  const options = parseArgs();
  
  if (options.help) {
    displayHelp();
    process.exit(0);
  }
  
  // Override environment if specified
  if (options.environment) {
    process.env.NODE_ENV = options.environment;
  }
  
  // Set verbose mode
  if (options.verbose) {
    process.env.VERBOSE = 'true';
  }
  
  try {
    main();
  } catch (error) {
    console.error(colorize('Error:', 'red'), error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

module.exports = {
  main,
  loadBundleConfig,
  loadBundleReport,
  extractBundleSizes,
  validateBundleSizes,
  displayResults,
  generateJsonReport,
};
