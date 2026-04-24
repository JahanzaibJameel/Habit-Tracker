// CHAOS TESTING SCRIPT - Break the Habit Tracker App
// This script simulates malicious user behavior and stress conditions

class ChaosTester {
  constructor() {
    this.testResults = [];
    this.isRunning = false;
    this.testStartTime = null;
    this.errors = [];
    this.performanceMetrics = {
      memorySpikes: [],
      renderTimes: [],
      interactionLatencies: []
    };
  }

  log(testName, status, details, severity = 'medium') {
    const result = {
      testName,
      status,
      details,
      severity,
      timestamp: new Date().toISOString(),
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A'
    };
    this.testResults.push(result);
    console.log(`[${status.toUpperCase()}] ${testName}: ${details}`);
  }

  // 1. RAPID INTERACTION FLOODING
  async rapidInteractionFlood() {
    this.log('Rapid Interaction Flood', 'start', 'Beginning rapid click spam test', 'high');
    
    const buttons = document.querySelectorAll('button');
    const inputs = document.querySelectorAll('input');
    const clickableElements = [...buttons, ...inputs];
    
    if (clickableElements.length === 0) {
      this.log('Rapid Interaction Flood', 'fail', 'No interactive elements found', 'high');
      return;
    }

    let clickCount = 0;
    const maxClicks = 500;
    const startTime = performance.now();

    try {
      // Spam clicks with increasing frequency
      for (let i = 0; i < maxClicks; i++) {
        const randomElement = clickableElements[Math.floor(Math.random() * clickableElements.length)];
        
        // Simulate rapid clicking
        randomElement.click();
        clickCount++;
        
        // Random keyboard spam
        if (Math.random() > 0.7) {
          const randomInput = inputs[Math.floor(Math.random() * inputs.length)];
          if (randomInput) {
            randomInput.focus();
            randomInput.value = Math.random().toString(36).substring(7);
            randomInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
        
        // Decrease delay to increase stress
        const delay = Math.max(1, 50 - i * 0.1);
        await this.sleep(delay);
      }

      const endTime = performance.now();
      const avgLatency = (endTime - startTime) / clickCount;
      
      this.log('Rapid Interaction Flood', 'complete', 
        `Completed ${clickCount} interactions in ${endTime - startTime}ms (avg: ${avgLatency.toFixed(2)}ms)`, 
        'high'
      );
      
      // Check for UI freezing
      if (avgLatency > 100) {
        this.log('Rapid Interaction Flood', 'fail', 'UI freezing detected', 'critical');
      }

    } catch (error) {
      this.log('Rapid Interaction Flood', 'error', `Crash: ${error.message}`, 'critical');
    }
  }

  // 2. COMPONENT MOUNT/UNMOUNT CHAOS
  async componentMountUnmountChaos() {
    this.log('Component Mount/Unmount Chaos', 'start', 'Testing component lifecycle stress', 'high');
    
    try {
      // Rapid modal opening/closing
      const modals = document.querySelectorAll('[role="dialog"]');
      const modalTriggers = document.querySelectorAll('button[aria-haspopup="dialog"]');
      
      for (let i = 0; i < 100; i++) {
        // Open modals rapidly
        modalTriggers.forEach(trigger => {
          trigger.click();
        });
        
        await this.sleep(10);
        
        // Close modals rapidly
        const closeButtons = document.querySelectorAll('button[aria-label="Close"], button[aria-label="close"]');
        closeButtons.forEach(button => button.click());
        
        // Simulate fast navigation
        if (window.history && window.history.length > 1) {
          window.history.back();
          await this.sleep(5);
          window.history.forward();
        }
        
        await this.sleep(10);
      }
      
      this.log('Component Mount/Unmount Chaos', 'complete', 'Completed 100 mount/unmount cycles', 'high');
      
    } catch (error) {
      this.log('Component Mount/Unmount Chaos', 'error', `Component crash: ${error.message}`, 'critical');
    }
  }

  // 3. LOCALSTORAGE CORRUPTION ATTACK
  async localStorageCorruptionAttack() {
    this.log('LocalStorage Corruption Attack', 'start', 'Attacking localStorage integrity', 'critical');
    
    try {
      const originalStore = localStorage.getItem('habit-store');
      
      // 1. Corrupt with invalid JSON
      localStorage.setItem('habit-store', '{"invalid": json}');
      window.location.reload();
      await this.sleep(1000);
      
      // 2. Partial data corruption
      if (originalStore) {
        const corrupted = originalStore.substring(0, Math.floor(originalStore.length * 0.7));
        localStorage.setItem('habit-store', corrupted);
      }
      
      // 3. Null data
      localStorage.setItem('habit-store', 'null');
      
      // 4. Circular reference corruption
      const circular = {};
      circular.self = circular;
      try {
        localStorage.setItem('habit-store', JSON.stringify(circular));
      } catch (e) {
        this.log('LocalStorage Corruption Attack', 'info', 'Circular reference blocked', 'low');
      }
      
      // 5. Oversized data
      const oversized = 'x'.repeat(10 * 1024 * 1024); // 10MB
      try {
        localStorage.setItem('habit-store', oversized);
      } catch (e) {
        this.log('LocalStorage Corruption Attack', 'info', 'Oversized data blocked', 'low');
      }
      
      // 6. Random character corruption
      const randomCorrupt = Array.from({length: 1000}, () => String.fromCharCode(Math.random() * 65536)).join('');
      localStorage.setItem('habit-store', randomCorrupt);
      
      this.log('LocalStorage Corruption Attack', 'complete', 'LocalStorage corruption tests completed', 'critical');
      
    } catch (error) {
      this.log('LocalStorage Corruption Attack', 'error', `Storage crash: ${error.message}`, 'critical');
    }
  }

  // 4. MEMORY LEAK STRESS TEST
  async memoryLeakStressTest() {
    this.log('Memory Leak Stress Test', 'start', 'Testing for memory leaks under load', 'high');
    
    const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
    let memorySnapshots = [];
    
    try {
      // Create massive amounts of data
      for (let i = 0; i < 1000; i++) {
        // Create large arrays that should be garbage collected
        const massiveArray = new Array(10000).fill(0).map(() => ({
          id: Math.random(),
          data: new Array(100).fill(Math.random().toString(36)),
          timestamp: new Date(),
          nested: {
            deep: {
              values: new Array(50).fill(Math.random())
            }
          }
        }));
        
        // Simulate habit creation spam
        const addButton = document.querySelector('button:has([class*="plus"])');
        if (addButton) {
          addButton.click();
          await this.sleep(1);
        }
        
        // Take memory snapshot
        if (performance.memory) {
          memorySnapshots.push(performance.memory.usedJSHeapSize);
        }
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }
        
        await this.sleep(10);
      }
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      const memoryGrowth = finalMemory - initialMemory;
      
      this.log('Memory Leak Stress Test', 'complete', 
        `Memory growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`, 
        memoryGrowth > 50 * 1024 * 1024 ? 'critical' : 'high'
      );
      
      // Check for continuous memory growth
      let isLeaking = false;
      for (let i = 1; i < memorySnapshots.length; i++) {
        if (memorySnapshots[i] > memorySnapshots[i-1] * 1.1) {
          isLeaking = true;
          break;
        }
      }
      
      if (isLeaking) {
        this.log('Memory Leak Stress Test', 'fail', 'Memory leak detected', 'critical');
      }
      
    } catch (error) {
      this.log('Memory Leak Stress Test', 'error', `Memory crash: ${error.message}`, 'critical');
    }
  }

  // 5. RACE CONDITION SIMULATION
  async raceConditionSimulation() {
    this.log('Race Condition Simulation', 'start', 'Testing concurrent state mutations', 'critical');
    
    try {
      const promises = [];
      
      // Simulate multiple simultaneous habit completions
      for (let i = 0; i < 50; i++) {
        promises.push(this.simulateConcurrentActions());
      }
      
      await Promise.all(promises);
      
      this.log('Race Condition Simulation', 'complete', 'Completed concurrent action simulation', 'critical');
      
    } catch (error) {
      this.log('Race Condition Simulation', 'error', `Race condition crash: ${error.message}`, 'critical');
    }
  }

  async simulateConcurrentActions() {
    return new Promise(async (resolve) => {
      for (let i = 0; i < 10; i++) {
        // Simulate rapid state updates
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
          checkbox.checked = Math.random() > 0.5;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
        });
        
        await this.sleep(Math.random() * 10);
      }
      resolve();
    });
  }

  // 6. VIEWPORT CHAOS TEST
  async viewportChaosTest() {
    this.log('Viewport Chaos Test', 'start', 'Testing responsive layout breaking', 'medium');
    
    try {
      const originalWidth = window.innerWidth;
      const originalHeight = window.innerHeight;
      
      // Rapid viewport resizing
      const viewports = [
        [200, 200],   // Tiny
        [1920, 1080], // Desktop
        [375, 667],   // Mobile
        [768, 1024],  // Tablet
        [10000, 10000], // Absurdly large
        [1, 1],       // Minimal
        [originalWidth, originalHeight] // Restore
      ];
      
      for (const [width, height] of viewports) {
        // Simulate viewport resize
        window.resizeTo(width, height);
        
        // Trigger orientation change
        if (screen && screen.orientation) {
          screen.orientation.lock && screen.orientation.lock(width > height ? 'landscape' : 'portrait');
        }
        
        await this.sleep(100);
      }
      
      this.log('Viewport Chaos Test', 'complete', 'Viewport chaos simulation completed', 'medium');
      
    } catch (error) {
      this.log('Viewport Chaos Test', 'error', `Viewport error: ${error.message}`, 'medium');
    }
  }

  // 7. DRAG AND DROP CHAOS
  async dragAndDropChaos() {
    this.log('Drag and Drop Chaos', 'start', 'Testing drag-drop stability', 'medium');
    
    try {
      const draggables = document.querySelectorAll('[draggable="true"]');
      const dropZones = document.querySelectorAll('[data-drop-zone]');
      
      if (draggables.length === 0) {
        this.log('Drag and Drop Chaos', 'skip', 'No draggable elements found', 'low');
        return;
      }
      
      // Simulate chaotic drag operations
      for (let i = 0; i < 100; i++) {
        const draggable = draggables[Math.floor(Math.random() * draggables.length)];
        
        // Start drag
        const dragStart = new DragEvent('dragstart', {
          bubbles: true,
          cancelable: true,
          dataTransfer: new DataTransfer()
        });
        draggable.dispatchEvent(dragStart);
        
        // Random drag events
        const dragEvents = ['dragenter', 'dragover', 'dragleave', 'drop'];
        dragEvents.forEach(eventType => {
          const event = new DragEvent(eventType, { bubbles: true });
          draggable.dispatchEvent(event);
        });
        
        await this.sleep(10);
      }
      
      this.log('Drag and Drop Chaos', 'complete', 'Drag-drop chaos completed', 'medium');
      
    } catch (error) {
      this.log('Drag and Drop Chaos', 'error', `Drag-drop error: ${error.message}`, 'medium');
    }
  }

  // 8. EVENT LISTENER LEAK TEST
  async eventListenerLeakTest() {
    this.log('Event Listener Leak Test', 'start', 'Testing for event listener accumulation', 'high');
    
    try {
      let listenerCount = 0;
      const originalAddEventListener = EventTarget.prototype.addEventListener;
      
      // Monkey patch to count listeners
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        listenerCount++;
        return originalAddEventListener.call(this, type, listener, options);
      };
      
      // Create and destroy many components rapidly
      for (let i = 0; i < 1000; i++) {
        const button = document.createElement('button');
        document.body.appendChild(button);
        
        // Add many listeners
        for (let j = 0; j < 10; j++) {
          button.addEventListener('click', () => {});
          button.addEventListener('mouseover', () => {});
          button.addEventListener('focus', () => {});
        }
        
        // Remove element
        document.body.removeChild(button);
        
        await this.sleep(1);
      }
      
      // Restore original method
      EventTarget.prototype.addEventListener = originalAddEventListener;
      
      this.log('Event Listener Leak Test', 'complete', 
        `Total listeners created: ${listenerCount}`, 
        listenerCount > 30000 ? 'critical' : 'high'
      );
      
    } catch (error) {
      this.log('Event Listener Leak Test', 'error', `Listener leak error: ${error.message}`, 'high');
    }
  }

  // UTILITY METHODS
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // MAIN TEST RUNNER
  async runAllTests() {
    console.log('Starting CHAOS TESTING SUITE');
    console.log('==============================');
    
    this.isRunning = true;
    this.testStartTime = Date.now();
    
    const tests = [
      () => this.rapidInteractionFlood(),
      () => this.componentMountUnmountChaos(),
      () => this.localStorageCorruptionAttack(),
      () => this.memoryLeakStressTest(),
      () => this.raceConditionSimulation(),
      () => this.viewportChaosTest(),
      () => this.dragAndDropChaos(),
      () => this.eventListenerLeakTest()
    ];
    
    for (const test of tests) {
      if (!this.isRunning) break;
      
      try {
        await test();
        await this.sleep(1000); // Brief pause between tests
      } catch (error) {
        this.log('Test Suite', 'error', `Test failed: ${error.message}`, 'critical');
      }
    }
    
    this.generateReport();
  }

  generateReport() {
    const endTime = Date.now();
    const totalDuration = endTime - this.testStartTime;
    
    const criticalIssues = this.testResults.filter(r => r.severity === 'critical' && r.status === 'error');
    const majorIssues = this.testResults.filter(r => r.severity === 'high' && r.status === 'fail');
    const performanceIssues = this.testResults.filter(r => r.severity === 'high' && r.status === 'complete');
    
    console.log('\n\nCHAOS TESTING REPORT');
    console.log('====================');
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Critical Failures: ${criticalIssues.length}`);
    console.log(`Major Issues: ${majorIssues.length}`);
    console.log(`Performance Issues: ${performanceIssues.length}`);
    
    console.log('\nCRITICAL FAILURES:');
    criticalIssues.forEach(issue => {
      console.log(`- ${issue.testName}: ${issue.details}`);
    });
    
    console.log('\nMAJOR STABILITY ISSUES:');
    majorIssues.forEach(issue => {
      console.log(`- ${issue.testName}: ${issue.details}`);
    });
    
    console.log('\nPERFORMANCE BOTTLENECKS:');
    performanceIssues.forEach(issue => {
      console.log(`- ${issue.testName}: ${issue.details}`);
    });
    
    return {
      totalDuration,
      criticalIssues,
      majorIssues,
      performanceIssues,
      allResults: this.testResults
    };
  }

  stop() {
    this.isRunning = false;
  }
}

// Auto-start chaos testing
window.chaosTester = new ChaosTester();

// Run tests automatically after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.chaosTester.runAllTests(), 2000);
  });
} else {
  setTimeout(() => window.chaosTester.runAllTests(), 2000);
}

// Manual trigger
window.runChaosTests = () => window.chaosTester.runAllTests();
window.stopChaosTests = () => window.chaosTester.stop();
