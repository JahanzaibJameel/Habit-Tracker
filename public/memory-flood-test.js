// MEMORY FLOOD TEST - Crash the app with massive data
// Simulates viral traffic with 10k-50k items

class MemoryFloodTester {
  constructor() {
    this.testResults = [];
    this.memorySnapshots = [];
    this.crashCount = 0;
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

  // 1. MASSIVE HABIT CREATION FLOOD
  async massiveHabitCreation() {
    this.log('Massive Habit Creation', 'start', 'Creating 10k+ habits', 'critical');
    
    try {
      const addButton = document.querySelector('button:has([class*="plus"])') || 
                        document.querySelector('button[aria-label*="Add"]') ||
                        document.querySelector('button')?.[0];
      
      if (!addButton) {
        this.log('Massive Habit Creation', 'fail', 'No add button found', 'critical');
        return;
      }

      const startTime = performance.now();
      let createdCount = 0;
      const targetCount = 10000;

      // Find form inputs
      const findFormInputs = () => {
        const forms = document.querySelectorAll('form');
        for (const form of forms) {
          const nameInput = form.querySelector('input[name*="name"], input[placeholder*="name"]');
          const submitButton = form.querySelector('button[type="submit"]');
          if (nameInput && submitButton) return { form, nameInput, submitButton };
        }
        return null;
      };

      for (let i = 0; i < targetCount; i++) {
        // Open habit form
        addButton.click();
        await this.sleep(50);

        const formInputs = findFormInputs();
        if (formInputs) {
          const { nameInput, submitButton } = formInputs;
          
          // Fill form with unique data
          nameInput.value = `Test Habit ${i} - ${Math.random().toString(36).substring(7)}`;
          nameInput.dispatchEvent(new Event('input', { bubbles: true }));
          
          // Submit form
          submitButton.click();
          createdCount++;
          
          // Take memory snapshot every 1000 habits
          if (i % 1000 === 0 && performance.memory) {
            this.memorySnapshots.push({
              iteration: i,
              memory: performance.memory.usedJSHeapSize,
              habits: createdCount
            });
            
            this.log('Massive Habit Creation', 'progress', 
              `Created ${createdCount} habits, Memory: ${(performance.memory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB`, 
              'high'
            );
          }
        }
        
        await this.sleep(10);
        
        // Check for memory pressure
        if (performance.memory && performance.memory.usedJSHeapSize > 500 * 1024 * 1024) { // 500MB
          this.log('Massive Habit Creation', 'warning', 'High memory usage detected', 'critical');
        }
      }

      const endTime = performance.now();
      this.log('Massive Habit Creation', 'complete', 
        `Created ${createdCount} habits in ${(endTime - startTime) / 1000}s`, 
        'critical'
      );

    } catch (error) {
      this.crashCount++;
      this.log('Massive Habit Creation', 'error', `Crash: ${error.message}`, 'critical');
    }
  }

  // 2. MASSIVE COMPLETION DATA FLOOD
  async massiveCompletionFlood() {
    this.log('Massive Completion Flood', 'start', 'Creating 50k completions', 'critical');
    
    try {
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      if (checkboxes.length === 0) {
        this.log('Massive Completion Flood', 'fail', 'No checkboxes found', 'critical');
        return;
      }

      const startTime = performance.now();
      let completionCount = 0;
      const targetCompletions = 50000;

      for (let i = 0; i < targetCompletions; i++) {
        // Toggle completions rapidly
        checkboxes.forEach(checkbox => {
          checkbox.checked = !checkbox.checked;
          checkbox.dispatchEvent(new Event('change', { bubbles: true }));
          completionCount++;
        });

        if (i % 5000 === 0 && performance.memory) {
          this.memorySnapshots.push({
            iteration: i,
            memory: performance.memory.usedJSHeapSize,
            completions: completionCount
          });
        }

        await this.sleep(1);
      }

      const endTime = performance.now();
      this.log('Massive Completion Flood', 'complete', 
        `Created ${completionCount} completions in ${(endTime - startTime) / 1000}s`, 
        'critical'
      );

    } catch (error) {
      this.crashCount++;
      this.log('Massive Completion Flood', 'error', `Crash: ${error.message}`, 'critical');
    }
  }

  // 3. INFINITE SCROLL STRESS TEST
  async infiniteScrollStress() {
    this.log('Infinite Scroll Stress', 'start', 'Testing infinite scroll with massive data', 'high');
    
    try {
      const scrollableElement = document.querySelector('[data-scrollable]') || 
                              document.querySelector('.overflow-auto') || 
                              document.body;

      // Generate massive scroll content
      for (let i = 0; i < 1000; i++) {
        const massiveDiv = document.createElement('div');
        massiveDiv.innerHTML = Array.from({length: 100}, () => 
          `<div class="p-4 border-b">Massive scroll item ${i}-${Math.random()}</div>`
        ).join('');
        
        document.body.appendChild(massiveDiv);
        
        // Simulate scrolling
        scrollableElement.scrollTop = scrollableElement.scrollHeight;
        await this.sleep(10);
      }

      this.log('Infinite Scroll Stress', 'complete', 'Created massive scroll content', 'high');

    } catch (error) {
      this.log('Infinite Scroll Stress', 'error', `Scroll error: ${error.message}`, 'high');
    }
  }

  // 4. DOM NODE EXPLOSION
  async domNodeExplosion() {
    this.log('DOM Node Explosion', 'start', 'Creating 100k DOM nodes', 'critical');
    
    try {
      const startTime = performance.now();
      let nodeCount = 0;
      const targetNodes = 100000;

      for (let i = 0; i < targetNodes; i++) {
        const node = document.createElement('div');
        node.className = 'test-node';
        node.textContent = `Node ${i}`;
        node.style.cssText = `
          position: absolute;
          left: ${Math.random() * window.innerWidth}px;
          top: ${Math.random() * window.innerHeight}px;
          width: 10px;
          height: 10px;
          background: ${Math.random() > 0.5 ? 'red' : 'blue'};
        `;
        
        document.body.appendChild(node);
        nodeCount++;

        if (i % 10000 === 0) {
          this.log('DOM Node Explosion', 'progress', 
            `Created ${nodeCount} DOM nodes`, 'high');
        }
      }

      const endTime = performance.now();
      this.log('DOM Node Explosion', 'complete', 
        `Created ${nodeCount} DOM nodes in ${(endTime - startTime) / 1000}s`, 
        'critical'
      );

      // Clean up
      setTimeout(() => {
        document.querySelectorAll('.test-node').forEach(node => node.remove());
        this.log('DOM Node Explosion', 'cleanup', 'Removed test nodes', 'low');
      }, 5000);

    } catch (error) {
      this.log('DOM Node Explosion', 'error', `DOM explosion error: ${error.message}`, 'critical');
    }
  }

  // 5. IMAGE MEMORY BOMB
  async imageMemoryBomb() {
    this.log('Image Memory Bomb', 'start', 'Loading massive images to test memory', 'critical');
    
    try {
      const imageUrls = [];
      
      // Generate massive data URLs
      for (let i = 0; i < 1000; i++) {
        const massiveImageData = 'data:image/png;base64,' + 
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='.repeat(10000);
        
        imageUrls.push(massiveImageData);
      }

      // Load all images simultaneously
      const loadPromises = imageUrls.map((url, index) => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(index);
          img.onerror = () => reject(index);
          img.src = url;
          document.body.appendChild(img);
          img.style.display = 'none';
        });
      });

      await Promise.allSettled(loadPromises);
      
      this.log('Image Memory Bomb', 'complete', 'Loaded 1000 massive images', 'critical');

      // Clean up
      setTimeout(() => {
        document.querySelectorAll('img[src^="data:image"]').forEach(img => img.remove());
      }, 3000);

    } catch (error) {
      this.log('Image Memory Bomb', 'error', `Image loading error: ${error.message}`, 'critical');
    }
  }

  // 6. WEBSOCKET CONNECTION FLOOD
  async websocketConnectionFlood() {
    this.log('WebSocket Connection Flood', 'start', 'Creating 1000 WebSocket connections', 'high');
    
    try {
      const connections = [];
      
      for (let i = 0; i < 1000; i++) {
        try {
          const ws = new WebSocket('wss://echo.websocket.org');
          connections.push(ws);
          
          ws.onopen = () => {
            ws.send(`Test message ${i}`);
          };
          
          await this.sleep(10);
        } catch (error) {
          // Some connections might fail, that's expected
        }
      }

      this.log('WebSocket Connection Flood', 'complete', `Created ${connections.length} WebSocket connections`, 'high');

      // Clean up connections
      setTimeout(() => {
        connections.forEach(ws => ws.close());
      }, 5000);

    } catch (error) {
      this.log('WebSocket Connection Flood', 'error', `WebSocket error: ${error.message}`, 'high');
    }
  }

  // 7. STORAGE QUOTA EXHAUSTION
  async storageQuotaExhaustion() {
    this.log('Storage Quota Exhaustion', 'start', 'Exhausting localStorage quota', 'critical');
    
    try {
      const chunks = [];
      const chunkSize = 1024 * 1024; // 1MB chunks
      let totalSize = 0;
      
      // Fill localStorage until it fails
      for (let i = 0; i < 100; i++) {
        const chunk = 'x'.repeat(chunkSize);
        chunks.push(chunk);
        
        try {
          localStorage.setItem(`chunk-${i}`, chunk);
          totalSize += chunkSize;
          
          this.log('Storage Quota Exhaustion', 'progress', 
            `Stored ${totalSize / 1024 / 1024}MB`, 'high');
        } catch (error) {
          this.log('Storage Quota Exhaustion', 'complete', 
            `Storage quota exceeded at ${totalSize / 1024 / 1024}MB`, 'critical');
          break;
        }
      }

      // Clean up
      chunks.forEach((_, i) => {
        localStorage.removeItem(`chunk-${i}`);
      });

    } catch (error) {
      this.log('Storage Quota Exhaustion', 'error', `Storage error: ${error.message}`, 'critical');
    }
  }

  // 8. EVENT LOOP BLOCKING
  async eventLoopBlocking() {
    this.log('Event Loop Blocking', 'start', 'Blocking event loop to test responsiveness', 'critical');
    
    try {
      const startTime = performance.now();
      
      // Block event loop for 5 seconds
      const endTime = Date.now() + 5000;
      while (Date.now() < endTime) {
        // Busy wait to block event loop
        Math.random();
      }
      
      const actualDuration = performance.now() - startTime;
      
      this.log('Event Loop Blocking', 'complete', 
        `Blocked event loop for ${actualDuration}ms`, 
        actualDuration > 5000 ? 'critical' : 'high'
      );

    } catch (error) {
      this.log('Event Loop Blocking', 'error', `Event loop error: ${error.message}`, 'critical');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAllTests() {
    console.log('Starting MEMORY FLOOD TESTING SUITE');
    console.log('==================================');
    
    const tests = [
      () => this.massiveHabitCreation(),
      () => this.massiveCompletionFlood(),
      () => this.infiniteScrollStress(),
      () => this.domNodeExplosion(),
      () => this.imageMemoryBomb(),
      () => this.websocketConnectionFlood(),
      () => this.storageQuotaExhaustion(),
      () => this.eventLoopBlocking()
    ];
    
    for (const test of tests) {
      try {
        await test();
        await this.sleep(2000); // Brief pause between tests
      } catch (error) {
        console.error('Test failed:', error);
      }
    }
    
    this.generateMemoryReport();
  }

  generateMemoryReport() {
    console.log('\n\nMEMORY FLOOD TESTING REPORT');
    console.log('============================');
    
    const maxMemory = Math.max(...this.memorySnapshots.map(s => s.memory));
    const memoryGrowth = this.memorySnapshots.length > 1 ? 
      this.memorySnapshots[this.memorySnapshots.length - 1].memory - this.memorySnapshots[0].memory : 0;
    
    console.log(`Max Memory Usage: ${(maxMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Memory Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Total Crashes: ${this.crashCount}`);
    console.log(`Memory Snapshots: ${this.memorySnapshots.length}`);
    
    // Memory growth trend analysis
    if (this.memorySnapshots.length > 2) {
      const trend = this.memorySnapshots[this.memorySnapshots.length - 1].memory - 
                   this.memorySnapshots[this.memorySnapshots.length - 2].memory;
      
      if (trend > 10 * 1024 * 1024) { // 10MB growth
        console.log('WARNING: Rapid memory growth detected!');
      }
    }
    
    return {
      maxMemory,
      memoryGrowth,
      crashCount: this.crashCount,
      snapshots: this.memorySnapshots
    };
  }
}

// Auto-start memory flood testing
window.memoryFloodTester = new MemoryFloodTester();

// Run tests automatically after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.memoryFloodTester.runAllTests(), 3000);
  });
} else {
  setTimeout(() => window.memoryFloodTester.runAllTests(), 3000);
}

// Manual trigger
window.runMemoryFloodTests = () => window.memoryFloodTester.runAllTests();
