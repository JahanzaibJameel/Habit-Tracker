// BROWSER DEGRADATION TEST - Simulate Safari, iOS, and low-end device failures
// This script specifically targets browser-specific vulnerabilities

class BrowserDegradationTester {
  constructor() {
    this.testResults = [];
    this.browserFailures = [];
    this.iosFailures = [];
    this.mobileFailures = [];
  }

  log(testName, status, details, severity = 'medium', category = 'general') {
    const result = {
      testName,
      status,
      details,
      severity,
      category,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A'
    };
    this.testResults.push(result);
    console.log(`[${status.toUpperCase()}] ${testName}: ${details}`);
    
    // Categorize failures
    if (status === 'error' || status === 'fail') {
      if (category === 'ios') this.iosFailures.push(result);
      else if (category === 'mobile') this.mobileFailures.push(result);
      else this.browserFailures.push(result);
    }
  }

  // 1. SAFARI RENDERING QUIRKS ATTACK
  async attackSafariQuirks() {
    this.log('Safari Quirks Attack', 'start', 'Testing Safari-specific rendering issues', 'high', 'safari');
    
    try {
      // Safari has issues with certain CSS properties
      const safariProblematicStyles = [
        'position: sticky',
        'backdrop-filter: blur(10px)',
        'clip-path: polygon()',
        'mix-blend-mode: multiply',
        'isolation: isolate',
        'contain: strict'
      ];

      // Apply problematic styles to random elements
      const elements = document.querySelectorAll('*');
      for (let i = 0; i < Math.min(100, elements.length); i++) {
        const element = elements[Math.floor(Math.random() * elements.length)];
        const randomStyle = safariProblematicStyles[Math.floor(Math.random() * safariProblematicStyles.length)];
        element.style.cssText += randomStyle;
      }

      // Safari flexbox issues
      const flexContainers = document.querySelectorAll('.flex, [class*="flex"]');
      flexContainers.forEach(container => {
        container.style.display = '-webkit-flex';
        container.style.display = 'flex';
        // Add Safari-specific flex properties that can cause issues
        container.style.webkitFlexFlow = 'row wrap';
        container.style.flexFlow = 'row wrap';
      });

      // Safari WebKit animation issues
      const animatedElements = document.querySelectorAll('[class*="animate"], [class*="motion"]');
      animatedElements.forEach(element => {
        element.style.webkitTransform = 'translate3d(0,0,0)';
        element.style.transform = 'translate3d(0,0,0)';
        element.style.webkitBackfaceVisibility = 'hidden';
        element.style.backfaceVisibility = 'hidden';
      });

      // Test Safari memory management
      if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
        // Safari has stricter memory limits
        for (let i = 0; i < 1000; i++) {
          const canvas = document.createElement('canvas');
          canvas.width = 1000;
          canvas.height = 1000;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = `rgb(${Math.random()*255},${Math.random()*255},${Math.random()*255})`;
            ctx.fillRect(0, 0, 1000, 1000);
          }
        }
      }

      this.log('Safari Quirks Attack', 'complete', 'Safari-specific stress tests applied', 'high', 'safari');

    } catch (error) {
      this.log('Safari Quirks Attack', 'error', `Safari test failed: ${error.message}`, 'critical', 'safari');
    }
  }

  // 2. iOS MEMORY PRESSURE SIMULATION
  async simulateIOSMemoryPressure() {
    this.log('iOS Memory Pressure', 'start', 'Simulating iOS memory pressure kills', 'critical', 'ios');
    
    try {
      // iOS kills tabs that use too much memory
      const memoryHogs = [];
      
      // Create memory-intensive operations that trigger iOS cleanup
      for (let i = 0; i < 100; i++) {
        // Large images that iOS might compress or drop
        const img = new Image();
        img.src = `data:image/jpeg;base64,${'x'.repeat(500000)}`; // Large base64 image
        document.body.appendChild(img);
        img.style.display = 'none';
        
        // Canvas operations that consume memory
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          // Fill with complex patterns
          for (let x = 0; x < 2048; x += 10) {
            for (let y = 0; y < 2048; y += 10) {
              ctx.fillStyle = `hsl(${(x+y) % 360}, 100%, 50%)`;
              ctx.fillRect(x, y, 10, 10);
            }
          }
        }
        document.body.appendChild(canvas);
        canvas.style.display = 'none';
        
        memoryHogs.push(img, canvas);
        
        if (i % 10 === 0) {
          this.log('iOS Memory Pressure', 'progress', 
            `Created ${i * 2} memory-intensive elements`, 'high', 'ios');
        }
      }

      // Simulate iOS backgrounding behavior
      for (let i = 0; i < 20; i++) {
        // Simulate app going to background
        document.dispatchEvent(new Event('visibilitychange'));
        document.hidden = true;
        
        // iOS reduces timer accuracy in background
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay) {
          return originalSetTimeout.call(this, callback, delay * 10); // Slow down timers
        };
        
        await this.sleep(100);
        
        // Simulate app coming to foreground
        document.hidden = false;
        document.dispatchEvent(new Event('visibilitychange'));
        
        await this.sleep(100);
      }

      // Test iOS-specific event handling issues
      document.addEventListener('touchstart', (e) => {
        // iOS 300ms touch delay simulation
        setTimeout(() => {
          e.target?.click();
        }, 300);
      });

      this.log('iOS Memory Pressure', 'complete', 'iOS memory pressure simulation completed', 'critical', 'ios');

    } catch (error) {
      this.log('iOS Memory Pressure', 'error', `iOS test failed: ${error.message}`, 'critical', 'ios');
    }
  }

  // 3. LOW-END DEVICE SIMULATION
  async simulateLowEndDevice() {
    this.log('Low-End Device Simulation', 'start', 'Simulating low-end Android/device conditions', 'high', 'mobile');
    
    try {
      // Override performance APIs to simulate slow device
      const originalNow = performance.now;
      performance.now = function() {
        return originalNow.call(this) * 3; // 3x slower
      };

      const originalGetEntriesByType = performance.getEntriesByType;
      performance.getEntriesByType = function(type) {
        const entries = originalGetEntriesByType.call(this, type);
        return entries.map(entry => ({
          ...entry,
          duration: entry.duration * 5, // 5x slower operations
          startTime: entry.startTime * 3
        }));
      };

      // Simulate slow CPU
      const originalRequestAnimationFrame = window.requestAnimationFrame;
      window.requestAnimationFrame = function(callback) {
        return originalRequestAnimationFrame.call(this, function(timestamp) {
          // Simulate dropped frames
          if (Math.random() > 0.7) {
            setTimeout(() => callback(timestamp), 16); // 60fps target
          } else {
            setTimeout(() => callback(timestamp), 100); // 10fps - dropped frames
          }
        });
      };

      // Simulate limited GPU
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(contextType) {
        const context = originalGetContext.call(this, contextType);
        if (contextType === 'webgl' || contextType === 'webgl2') {
          // Simulate WebGL context loss on low-end devices
          setTimeout(() => {
            const event = new WebGLContextEvent('webglcontextlost');
            this.dispatchEvent(event);
          }, Math.random() * 5000);
        }
        return context;
      };

      // Simulate network throttling
      const originalFetch = window.fetch;
      window.fetch = async function(url, options) {
        // Simulate slow 3G network
        await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 500));
        
        // Simulate packet loss
        if (Math.random() > 0.8) {
          throw new Error('NetworkError: Request failed');
        }
        
        return originalFetch.call(this, url, options);
      };

      // Simulate battery saver mode
      if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
          Object.defineProperty(battery, 'level', { value: 0.1 }); // 10% battery
          Object.defineProperty(battery, 'charging', { value: false });
          battery.dispatchEvent(new Event('levelchange'));
          battery.dispatchEvent(new Event('chargingchange'));
        });
      }

      // Test with reduced viewport (small screens)
      const originalInnerWidth = Object.getOwnPropertyDescriptor(window, 'innerWidth');
      const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
      
      Object.defineProperty(window, 'innerWidth', { value: 320 });
      Object.defineProperty(window, 'innerHeight', { value: 568 });
      
      // Trigger resize events
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('orientationchange'));

      this.log('Low-End Device Simulation', 'complete', 'Low-end device conditions simulated', 'high', 'mobile');

    } catch (error) {
      this.log('Low-End Device Simulation', 'error', `Low-end simulation failed: ${error.message}`, 'critical', 'mobile');
    }
  }

  // 4. TOUCH AND GESTURE CHAOS
  async simulateTouchGestureChaos() {
    this.log('Touch Gesture Chaos', 'start', 'Testing touch/gesture handling under stress', 'high', 'mobile');
    
    try {
      // Create chaotic touch events
      const touchElements = document.querySelectorAll('*');
      
      for (let i = 0; i < 500; i++) {
        const element = touchElements[Math.floor(Math.random() * touchElements.length)];
        
        // Simulate multi-touch chaos
        const touch1 = new Touch({
          identifier: 1,
          target: element,
          clientX: Math.random() * window.innerWidth,
          clientY: Math.random() * window.innerHeight,
          pageX: Math.random() * window.innerWidth,
          pageY: Math.random() * window.innerHeight,
          screenX: Math.random() * screen.width,
          screenY: Math.random() * screen.height
        });
        
        const touch2 = new Touch({
          identifier: 2,
          target: element,
          clientX: Math.random() * window.innerWidth,
          clientY: Math.random() * window.innerHeight,
          pageX: Math.random() * window.innerWidth,
          pageY: Math.random() * window.innerHeight,
          screenX: Math.random() * screen.width,
          screenY: Math.random() * screen.height
        });
        
        // Create touch events with multiple touches
        const touchStart = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [touch1, touch2],
          targetTouches: [touch1, touch2],
          changedTouches: [touch1]
        });
        
        const touchMove = new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: [touch1, touch2],
          targetTouches: [touch1, touch2],
          changedTouches: [touch1]
        });
        
        const touchEnd = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touch1]
        });
        
        element.dispatchEvent(touchStart);
        await this.sleep(Math.random() * 50);
        element.dispatchEvent(touchMove);
        await this.sleep(Math.random() * 50);
        element.dispatchEvent(touchEnd);
        
        // Simulate gesture events
        if (Math.random() > 0.8) {
          const gestureStart = new GestureEvent('gesturestart', {
            bubbles: true,
            cancelable: true,
            rotation: Math.random() * 360,
            scale: Math.random() * 2
          });
          element.dispatchEvent(gestureStart);
        }
      }

      // Test pinch zoom chaos
      for (let i = 0; i < 100; i++) {
        const wheelEvent = new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaX: (Math.random() - 0.5) * 100,
          deltaY: (Math.random() - 0.5) * 100,
          ctrlKey: Math.random() > 0.5 // Simulate pinch zoom
        });
        document.body.dispatchEvent(wheelEvent);
        await this.sleep(10);
      }

      this.log('Touch Gesture Chaos', 'complete', 'Touch/gesture stress testing completed', 'high', 'mobile');

    } catch (error) {
      this.log('Touch Gesture Chaos', 'error', `Touch test failed: ${error.message}`, 'high', 'mobile');
    }
  }

  // 5. BROWSER FEATURE DETECTION ATTACK
  async attackFeatureDetection() {
    this.log('Feature Detection Attack', 'start', 'Breaking feature detection and polyfills', 'medium', 'general');
    
    try {
      // Randomly remove browser features
      const features = [
        'fetch', 'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet',
        'IntersectionObserver', 'MutationObserver', 'ResizeObserver',
        'requestAnimationFrame', 'localStorage', 'sessionStorage'
      ];
      
      features.forEach(feature => {
        if (Math.random() > 0.7 && window[feature]) {
          const original = window[feature];
          window[feature] = undefined;
          
          // Restore after random delay
          setTimeout(() => {
            window[feature] = original;
          }, Math.random() * 5000);
        }
      });

      // Break CSS feature detection
      const originalMatches = Element.prototype.matches;
      Element.prototype.matches = function(selector) {
        // Randomly fail feature detection
        if (Math.random() > 0.8) {
          return false;
        }
        return originalMatches.call(this, selector);
      };

      // Attack viewport detection
      const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function() {
        const rect = originalGetBoundingClientRect.call(this);
        if (Math.random() > 0.8) {
          // Return corrupted viewport data
          return {
            ...rect,
            width: Math.random() * window.innerWidth,
            height: Math.random() * window.innerHeight,
            top: Math.random() * 1000,
            left: Math.random() * 1000
          };
        }
        return rect;
      };

      this.log('Feature Detection Attack', 'complete', 'Feature detection chaos completed', 'medium', 'general');

    } catch (error) {
      this.log('Feature Detection Attack', 'error', `Feature detection test failed: ${error.message}`, 'medium', 'general');
    }
  }

  // 6. BROWSER STORAGE ATTACK
  async attackBrowserStorage() {
    this.log('Browser Storage Attack', 'start', 'Testing storage limits and corruption', 'high', 'general');
    
    try {
      // Test localStorage quota
      try {
        const data = 'x'.repeat(10 * 1024 * 1024); // 10MB
        localStorage.setItem('quota-test', data);
      } catch (error) {
        this.log('Browser Storage Attack', 'info', `LocalStorage quota: ${error.message}`, 'medium', 'general');
      }

      // Test sessionStorage limits
      try {
        for (let i = 0; i < 1000; i++) {
          sessionStorage.setItem(`test-${i}`, 'x'.repeat(10000));
        }
      } catch (error) {
        this.log('Browser Storage Attack', 'info', `SessionStorage quota: ${error.message}`, 'medium', 'general');
      }

      // Test IndexedDB under stress
      if ('indexedDB' in window) {
        const request = indexedDB.open('stress-test-db', 1);
        request.onerror = () => {
          this.log('Browser Storage Attack', 'fail', 'IndexedDB failed to open', 'high', 'general');
        };
        
        request.onsuccess = (event) => {
          const db = event.target.result;
          
          // Create massive object store
          const store = db.createObjectStore('massive-store');
          
          // Add massive amounts of data
          for (let i = 0; i < 10000; i++) {
            const transaction = db.transaction(['massive-store'], 'readwrite');
            const objectStore = transaction.objectStore('massive-store');
            objectStore.add({
              id: i,
              data: new Array(1000).fill(Math.random()),
              blob: new Blob(['x'.repeat(10000)])
            });
          }
        };
      }

      // Simulate storage being cleared
      if (Math.random() > 0.8) {
        localStorage.clear();
        sessionStorage.clear();
        this.log('Browser Storage Attack', 'warning', 'Storage cleared randomly', 'high', 'general');
      }

      this.log('Browser Storage Attack', 'complete', 'Storage stress testing completed', 'high', 'general');

    } catch (error) {
      this.log('Browser Storage Attack', 'error', `Storage test failed: ${error.message}`, 'high', 'general');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAllTests() {
    console.log('Starting BROWSER DEGRADATION TEST SUITE');
    console.log('=======================================');
    
    const tests = [
      () => this.attackSafariQuirks(),
      () => this.simulateIOSMemoryPressure(),
      () => this.simulateLowEndDevice(),
      () => this.simulateTouchGestureChaos(),
      () => this.attackFeatureDetection(),
      () => this.attackBrowserStorage()
    ];
    
    for (const test of tests) {
      try {
        await test();
        await this.sleep(1000);
      } catch (error) {
        console.error('Browser degradation test failed:', error);
      }
    }
    
    this.generateBrowserReport();
  }

  generateBrowserReport() {
    console.log('\n\nBROWSER DEGRADATION REPORT');
    console.log('============================');
    
    console.log(`Total Browser Failures: ${this.browserFailures.length}`);
    console.log(`iOS-Specific Failures: ${this.iosFailures.length}`);
    console.log(`Mobile Device Failures: ${this.mobileFailures.length}`);
    
    const criticalFailures = this.testResults.filter(r => r.severity === 'critical' && (r.status === 'error' || r.status === 'fail'));
    
    console.log('\nCRITICAL BROWSER FAILURES:');
    criticalFailures.forEach(failure => {
      console.log(`- [${failure.category}] ${failure.testName}: ${failure.details}`);
    });
    
    console.log('\niOS-SPECIFIC ISSUES:');
    this.iosFailures.forEach(failure => {
      console.log(`- ${failure.testName}: ${failure.details}`);
    });
    
    console.log('\nMOBILE DEVICE ISSUES:');
    this.mobileFailures.forEach(failure => {
      console.log(`- ${failure.testName}: ${failure.details}`);
    });
    
    return {
      totalFailures: this.browserFailures.length,
      iosFailures: this.iosFailures.length,
      mobileFailures: this.mobileFailures.length,
      criticalFailures,
      allResults: this.testResults
    };
  }
}

// Auto-start browser degradation testing
window.browserDegradationTester = new BrowserDegradationTester();

// Run tests automatically after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.browserDegradationTester.runAllTests(), 4000);
  });
} else {
  setTimeout(() => window.browserDegradationTester.runAllTests(), 4000);
}

// Manual trigger
window.runBrowserDegradationTests = () => window.browserDegradationTester.runAllTests();
