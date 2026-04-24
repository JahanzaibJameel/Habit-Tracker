// WAR TEST ORCHESTRATOR - Master controller for all chaos tests
// This script coordinates all attack vectors and generates final assessment

class WarTestOrchestrator {
  constructor() {
    this.testSuites = [];
    this.globalResults = [];
    this.startTime = null;
    this.endTime = null;
    this.systemHealth = {
      initialMemory: 0,
      finalMemory: 0,
      peakMemory: 0,
      crashCount: 0,
      errorCount: 0,
      warningCount: 0
    };
    this.survivalScore = 0;
  }

  // Initialize all test suites
  initializeTestSuites() {
    console.log('Initializing WAR TEST SUITES...');
    
    this.testSuites = [
      {
        name: 'User Chaos',
        tester: window.chaosTester,
        priority: 'critical',
        weight: 0.2
      },
      {
        name: 'Memory Flood',
        tester: window.memoryFloodTester,
        priority: 'critical',
        weight: 0.15
      },
      {
        name: 'Hydration Chaos',
        tester: window.hydrationChaosTester,
        priority: 'high',
        weight: 0.15
      },
      {
        name: 'Browser Degradation',
        tester: window.browserDegradationTester,
        priority: 'high',
        weight: 0.15
      },
      {
        name: 'Race Conditions',
        tester: window.raceConditionTester,
        priority: 'critical',
        weight: 0.1
      },
      {
        name: 'React Render Storm',
        tester: window.reactRenderStormTester,
        priority: 'critical',
        weight: 0.1
      },
      {
        name: 'Mobile Device Failures',
        tester: window.mobileDeviceFailureTester,
        priority: 'high',
        weight: 0.1
      },
      {
        name: 'Data Corruption',
        tester: window.dataCorruptionTester,
        priority: 'critical',
        weight: 0.05
      }
    ];
  }

  // Capture initial system state
  captureInitialState() {
    this.systemHealth.initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    this.startTime = Date.now();
    
    console.log('Initial System State Captured:');
    console.log(`- Memory: ${(this.systemHealth.initialMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`- User Agent: ${navigator.userAgent}`);
    console.log(`- Viewport: ${window.innerWidth}x${window.innerHeight}`);
    
    // Set up global error monitoring
    this.setupGlobalErrorMonitoring();
  }

  // Set up global error and performance monitoring
  setupGlobalErrorMonitoring() {
    window.addEventListener('error', (event) => {
      this.systemHealth.errorCount++;
      this.globalResults.push({
        type: 'global_error',
        message: event.error?.message || event.message,
        filename: event.filename,
        lineno: event.lineno,
        timestamp: Date.now()
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.systemHealth.errorCount++;
      this.globalResults.push({
        type: 'unhandled_promise',
        message: event.reason?.message || event.reason,
        timestamp: Date.now()
      });
    });

    // Monitor memory usage
    const memoryMonitor = setInterval(() => {
      if (performance.memory) {
        const currentMemory = performance.memory.usedJSHeapSize;
        this.systemHealth.peakMemory = Math.max(this.systemHealth.peakMemory, currentMemory);
        
        // Check for memory leaks
        if (currentMemory > this.systemHealth.initialMemory * 3) {
          this.globalResults.push({
            type: 'memory_warning',
            message: `Memory usage 3x initial: ${(currentMemory / 1024 / 1024).toFixed(2)}MB`,
            timestamp: Date.now()
          });
          this.systemHealth.warningCount++;
        }
      }
    }, 1000);

    // Clean up after test
    setTimeout(() => clearInterval(memoryMonitor), 60000);
  }

  // Execute all test suites
  async executeAllTestSuites() {
    console.log('EXECUTING ALL WAR TEST SUITES...');
    console.log('================================');
    
    const suiteResults = [];
    
    for (const suite of this.testSuites) {
      console.log(`\nStarting ${suite.name} Test Suite...`);
      
      try {
        const suiteStartTime = Date.now();
        
        if (suite.tester && typeof suite.tester.runAllTests === 'function') {
          await suite.tester.runAllTests();
          
          const suiteEndTime = Date.now();
          const suiteDuration = suiteEndTime - suiteStartTime;
          
          // Collect results from tester
          let suiteResult = {
            name: suite.name,
            priority: suite.priority,
            weight: suite.weight,
            duration: suiteDuration,
            completed: true
          };
          
          // Get specific results if available
          if (suite.tester.generateReport) {
            suiteResult.report = suite.tester.generateReport();
          } else if (suite.tester.generateMemoryReport) {
            suiteResult.report = suite.tester.generateMemoryReport();
          } else if (suite.tester.generateBrowserReport) {
            suiteResult.report = suite.tester.generateBrowserReport();
          } else if (suite.tester.generateRaceConditionReport) {
            suiteResult.report = suite.tester.generateRaceConditionReport();
          } else if (suite.tester.generateRenderStormReport) {
            suiteResult.report = suite.tester.generateRenderStormReport();
          } else if (suite.tester.generateMobileFailureReport) {
            suiteResult.report = suite.tester.generateMobileFailureReport();
          } else if (suite.tester.generateDataCorruptionReport) {
            suiteResult.report = suite.tester.generateDataCorruptionReport();
          }
          
          suiteResults.push(suiteResult);
          console.log(`Completed ${suite.name} in ${suiteDuration}ms`);
          
        } else {
          console.warn(`Test suite ${suite.name} not available`);
          suiteResults.push({
            name: suite.name,
            priority: suite.priority,
            weight: suite.weight,
            completed: false,
            error: 'Tester not available'
          });
        }
        
        // Brief pause between suites
        await this.sleep(2000);
        
      } catch (error) {
        console.error(`Test suite ${suite.name} failed:`, error);
        suiteResults.push({
          name: suite.name,
          priority: suite.priority,
          weight: suite.weight,
          completed: false,
          error: error.message
        });
        this.systemHealth.errorCount++;
      }
    }
    
    return suiteResults;
  }

  // Calculate survival score
  calculateSurvivalScore(suiteResults) {
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    suiteResults.forEach(suite => {
      const weight = suite.weight;
      maxPossibleScore += weight * 100;
      
      if (suite.completed && suite.report) {
        let suiteScore = 100;
        
        // Deduct points for failures
        if (suite.report.criticalIssues && suite.report.criticalIssues.length > 0) {
          suiteScore -= suite.report.criticalIssues.length * 20;
        }
        if (suite.report.totalFailures) {
          suiteScore -= suite.report.totalFailures * 10;
        }
        if (suite.report.crashCount) {
          suiteScore -= suite.report.crashCount * 15;
        }
        
        // Bonus for surviving critical tests
        if (suite.priority === 'critical' && suiteScore > 50) {
          suiteScore += 10;
        }
        
        suiteScore = Math.max(0, Math.min(100, suiteScore));
        totalScore += suiteScore * weight;
      } else {
        // Failed to complete test suite
        totalScore += 0;
      }
    });
    
    this.survivalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;
    return this.survivalScore;
  }

  // Generate comprehensive war report
  generateWarReport(suiteResults) {
    this.endTime = Date.now();
    this.systemHealth.finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    const totalDuration = this.endTime - this.startTime;
    
    console.log('\n\n=====================================');
    console.log('     PRODUCTION WAR TEST REPORT');
    console.log('=====================================');
    
    console.log(`\nTEST EXECUTION SUMMARY:`);
    console.log(`- Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`- Test Suites Completed: ${suiteResults.filter(s => s.completed).length}/${suiteResults.length}`);
    console.log(`- Global Errors: ${this.systemHealth.errorCount}`);
    console.log(`- Global Warnings: ${this.systemHealth.warningCount}`);
    
    console.log(`\nMEMORY ANALYSIS:`);
    console.log(`- Initial Memory: ${(this.systemHealth.initialMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`- Final Memory: ${(this.systemHealth.finalMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`- Peak Memory: ${(this.systemHealth.peakMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`- Memory Growth: ${((this.systemHealth.finalMemory - this.systemHealth.initialMemory) / 1024 / 1024).toFixed(2)}MB`);
    
    console.log(`\nSURVIVAL SCORE: ${this.survivalScore.toFixed(1)}%`);
    
    // Grade the application
    let grade = 'F';
    if (this.survivalScore >= 90) grade = 'A+';
    else if (this.survivalScore >= 80) grade = 'A';
    else if (this.survivalScore >= 70) grade = 'B';
    else if (this.survivalScore >= 60) grade = 'C';
    else if (this.survivalScore >= 50) grade = 'D';
    
    console.log(`PRODUCTION READINESS GRADE: ${grade}`);
    
    // Critical failures analysis
    console.log(`\nCRITICAL SYSTEM BREAKS:`);
    let criticalBreaks = 0;
    suiteResults.forEach(suite => {
      if (suite.report && suite.report.criticalIssues) {
        suite.report.criticalIssues.forEach(issue => {
          console.log(`- [${suite.name}] ${issue.testName}: ${issue.details}`);
          criticalBreaks++;
        });
      }
    });
    
    console.log(`\nMAJOR STABILITY FAILURES:`);
    let majorFailures = 0;
    suiteResults.forEach(suite => {
      if (suite.report) {
        const failures = [];
        if (suite.report.totalFailures) failures.push(...suite.report.allResults || []);
        if (suite.report.browserFailures) failures.push(...suite.report.browserFailures);
        if (suite.report.mobileFailures) failures.push(...suite.report.mobileFailures);
        if (suite.report.raceConditions) failures.push(...suite.report.raceConditions);
        
        failures.forEach(failure => {
          if (failure.severity === 'high' && (failure.status === 'fail' || failure.status === 'error')) {
            console.log(`- [${suite.name}] ${failure.testName}: ${failure.details}`);
            majorFailures++;
          }
        });
      }
    });
    
    console.log(`\nPERFORMANCE BREAKPOINTS:`);
    let performanceIssues = 0;
    this.globalResults.filter(r => r.type === 'memory_warning').forEach(warning => {
      console.log(`- ${warning.message}`);
      performanceIssues++;
    });
    
    // Survival assessment
    console.log(`\nFINAL SURVIVAL ASSESSMENT:`);
    console.log(`================================`);
    
    if (this.survivalScore >= 80) {
      console.log('RESULT: APPLICATION SURVIVED VIRAL TRAFFIC');
      console.log('The application demonstrates strong resilience under extreme load.');
      console.log('Minor issues detected but core functionality remains intact.');
    } else if (this.survivalScore >= 60) {
      console.log('RESULT: APPLICATION PARTIALLY SURVIVED');
      console.log('The application experiences significant issues but maintains basic functionality.');
      console.log('Major optimizations required before production deployment.');
    } else if (this.survivalScore >= 40) {
      console.log('RESULT: APPLICATION SEVERELY DAMAGED');
      console.log('The application shows critical failures under stress.');
      console.log('Extensive architectural improvements needed.');
    } else {
      console.log('RESULT: APPLICATION CATASTROPHIC FAILURE');
      console.log('The application cannot survive real-world production conditions.');
      console.log('Complete architectural redesign required.');
    }
    
    // Recommendations
    console.log(`\nENTERPRISE-GRADE FIX STRATEGY:`);
    console.log('===============================');
    
    if (criticalBreaks > 0) {
      console.log('1. CRITICAL: Address system crashes and data corruption');
      console.log('   - Implement robust error boundaries');
      console.log('   - Add data validation and sanitization');
      console.log('   - Strengthen localStorage error handling');
    }
    
    if (majorFailures > 10) {
      console.log('2. HIGH: Fix race conditions and state management');
      console.log('   - Implement proper async state synchronization');
      console.log('   - Add debouncing/throttling for rapid operations');
      console.log('   - Use proper cancellation tokens for async operations');
    }
    
    if (performanceIssues > 5) {
      console.log('3. MEDIUM: Optimize performance and memory usage');
      console.log('   - Implement virtualization for large lists');
      console.log('   - Add proper cleanup in useEffect hooks');
      console.log('   - Use React.memo and useMemo appropriately');
    }
    
    if (this.survivalScore < 70) {
      console.log('4. ARCHITECTURAL: Consider fundamental improvements');
      console.log('   - Evaluate state management solution');
      console.log('   - Implement proper error recovery mechanisms');
      console.log('   - Add comprehensive monitoring and alerting');
    }
    
    return {
      survivalScore: this.survivalScore,
      grade,
      criticalBreaks,
      majorFailures,
      performanceIssues,
      totalDuration,
      memoryAnalysis: {
        initial: this.systemHealth.initialMemory,
        final: this.systemHealth.finalMemory,
        peak: this.systemHealth.peakMemory,
        growth: this.systemHealth.finalMemory - this.systemHealth.initialMemory
      },
      suiteResults,
      globalResults: this.globalResults
    };
  }

  // Run complete war test
  async runCompleteWarTest() {
    console.log('STARTING COMPLETE PRODUCTION WAR TEST');
    console.log('=======================================');
    console.log('This test simulates extreme real-world conditions.');
    console.log('WARNING: This may crash the application.');
    
    try {
      // Initialize
      this.initializeTestSuites();
      this.captureInitialState();
      
      // Execute all test suites
      const suiteResults = await this.executeAllTestSuites();
      
      // Calculate survival score
      this.calculateSurvivalScore(suiteResults);
      
      // Generate final report
      const finalReport = this.generateWarReport(suiteResults);
      
      // Store results globally
      window.warTestResults = finalReport;
      
      return finalReport;
      
    } catch (error) {
      console.error('War test orchestrator failed:', error);
      this.systemHealth.crashCount++;
      return {
        survivalScore: 0,
        grade: 'F',
        error: error.message,
        systemHealth: this.systemHealth
      };
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create global orchestrator
window.warTestOrchestrator = new WarTestOrchestrator();

// Auto-start war test after all other tests are loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.warTestOrchestrator.runCompleteWarTest(), 10000);
  });
} else {
  setTimeout(() => window.warTestOrchestrator.runCompleteWarTest(), 10000);
}

// Manual trigger
window.runWarTest = () => window.warTestOrchestrator.runCompleteWarTest();
