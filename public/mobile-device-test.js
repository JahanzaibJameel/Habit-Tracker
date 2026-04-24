// MOBILE DEVICE FAILURE TEST - Simulate mobile-specific failures
// This script targets mobile device vulnerabilities and low-end conditions

class MobileDeviceFailureTester {
  constructor() {
    this.testResults = [];
    this.mobileFailures = [];
    this.touchFailures = [];
    this.orientationFailures = [];
    this.performanceFailures = [];
  }

  log(testName, status, details, severity = 'medium', category = 'mobile') {
    const result = {
      testName,
      status,
      details,
      severity,
      category,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 'N/A'
    };
    this.testResults.push(result);
    console.log(`[${status.toUpperCase()}] ${testName}: ${details}`);
    
    if (status === 'error' || status === 'fail') {
      if (category === 'touch') this.touchFailures.push(result);
      else if (category === 'orientation') this.orientationFailures.push(result);
      else if (category === 'performance') this.performanceFailures.push(result);
      else this.mobileFailures.push(result);
    }
  }

  // 1. TOUCH EVENT CHAOS
  async touchEventChaos() {
    this.log('Touch Event Chaos', 'start', 'Creating touch event storm', 'high', 'touch');
    
    try {
      const elements = document.querySelectorAll('*');
      let touchCount = 0;
      
      // Simulate chaotic multi-touch scenarios
      for (let i = 0; i < 500; i++) {
        const element = elements[Math.floor(Math.random() * elements.length)];
        
        // Create multiple simultaneous touch points
        const touches = [];
        for (let j = 0; j < 5; j++) {
          touches.push(new Touch({
            identifier: j,
            target: element,
            clientX: Math.random() * window.innerWidth,
            clientY: Math.random() * window.innerHeight,
            pageX: Math.random() * window.innerWidth,
            pageY: Math.random() * window.innerHeight,
            screenX: Math.random() * screen.width,
            screenY: Math.random() * screen.height,
            force: Math.random()
          }));
        }
        
        // Create touch events
        const touchStart = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: touches,
          targetTouches: touches,
          changedTouches: touches,
          shiftKey: Math.random() > 0.5,
          ctrlKey: Math.random() > 0.5,
          altKey: Math.random() > 0.5
        });
        
        const touchMove = new TouchEvent('touchmove', {
          bubbles: true,
          cancelable: true,
          touches: touches,
          targetTouches: touches,
          changedTouches: [touches[0]]
        });
        
        const touchEnd = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: [],
          targetTouches: [],
          changedTouches: [touches[0]]
        });
        
        element.dispatchEvent(touchStart);
        await this.sleep(Math.random() * 10);
        element.dispatchEvent(touchMove);
        await this.sleep(Math.random() * 10);
        element.dispatchEvent(touchEnd);
        
        touchCount++;
        
        // Simulate touch event conflicts
        if (Math.random() > 0.8) {
          const clickEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true,
            clientX: touches[0].clientX,
            clientY: touches[0].clientY
          });
          element.dispatchEvent(clickEvent);
        }
      }
      
      this.log('Touch Event Chaos', 'complete', 
        `Processed ${touchCount} touch events`, 
        touchCount > 400 ? 'critical' : 'high', 'touch');

    } catch (error) {
      this.log('Touch Event Chaos', 'error', `Touch chaos failed: ${error.message}`, 'critical', 'touch');
    }
  }

  // 2. ORIENTATION CHANGE STRESS
  async orientationChangeStress() {
    this.log('Orientation Change Stress', 'start', 'Rapid orientation changes', 'high', 'orientation');
    
    try {
      const orientations = ['portrait', 'landscape', 'portrait-primary', 'landscape-primary', 'portrait-secondary', 'landscape-secondary'];
      let orientationChanges = 0;
      
      // Rapid orientation switching
      for (let i = 0; i < 100; i++) {
        const orientation = orientations[Math.floor(Math.random() * orientations.length)];
        
        // Simulate orientation change
        if (screen && screen.orientation) {
          try {
            screen.orientation.lock?.(orientation);
          } catch (e) {
            // Lock might fail, that's expected
          }
        }
        
        // Trigger orientation change events
        window.dispatchEvent(new Event('orientationchange'));
        
        // Simulate viewport changes
        const isLandscape = orientation.includes('landscape');
        const newWidth = isLandscape ? 1024 : 768;
        const newHeight = isLandscape ? 768 : 1024;
        
        Object.defineProperty(window, 'innerWidth', { value: newWidth, configurable: true });
        Object.defineProperty(window, 'innerHeight', { value: newHeight, configurable: true });
        
        window.dispatchEvent(new Event('resize'));
        
        // Trigger device orientation events
        const deviceOrientation = new DeviceOrientationEvent('deviceorientation', {
          alpha: Math.random() * 360,
          beta: Math.random() * 180 - 90,
          gamma: Math.random() * 90 - 45
        });
        window.dispatchEvent(deviceOrientation);
        
        orientationChanges++;
        await this.sleep(50);
      }
      
      this.log('Orientation Change Stress', 'complete', 
        `Processed ${orientationChanges} orientation changes`, 
        orientationChanges > 80 ? 'critical' : 'high', 'orientation');

    } catch (error) {
      this.log('Orientation Change Stress', 'error', `Orientation stress failed: ${error.message}`, 'critical', 'orientation');
    }
  }

  // 3. LOW-END DEVICE SIMULATION
  async lowEndDeviceSimulation() {
    this.log('Low-End Device Simulation', 'start', 'Simulating low-end mobile conditions', 'critical', 'performance');
    
    try {
      // Override performance APIs to simulate slow device
      const originalNow = performance.now;
      performance.now = function() {
        return originalNow.call(this) * 5; // 5x slower
      };
      
      // Simulate slow requestAnimationFrame
      const originalRAF = window.requestAnimationFrame;
      window.requestAnimationFrame = function(callback) {
        return originalRAF.call(this, function(timestamp) {
          // Simulate frame drops
          if (Math.random() > 0.6) {
            setTimeout(() => callback(timestamp), 200); // 5fps
          } else {
            setTimeout(() => callback(timestamp), 100); // 10fps
          }
        });
      };
      
      // Simulate limited memory
      if (performance.memory) {
        const originalMemory = performance.memory;
        Object.defineProperty(performance, 'memory', {
          get: function() {
            return {
              ...originalMemory,
              usedJSHeapSize: originalMemory.usedJSHeapSize * 0.8, // Show less available memory
              totalJSHeapSize: 50 * 1024 * 1024, // 50MB total
              jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB limit
            };
          }
        });
      }
      
      // Simulate battery saver mode
      if ('getBattery' in navigator) {
        navigator.getBattery().then(battery => {
          Object.defineProperty(battery, 'level', { value: 0.05 }); // 5% battery
          Object.defineProperty(battery, 'charging', { value: false });
          battery.dispatchEvent(new Event('levelchange'));
          battery.dispatchEvent(new Event('chargingchange'));
        });
      }
      
      // Simulate network throttling (2G)
      const originalFetch = window.fetch;
      window.fetch = async function(url, options) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 8000 + 2000)); // 2-10s delay
        
        if (Math.random() > 0.7) {
          throw new Error('NetworkError: Request failed');
        }
        
        return originalFetch.call(this, url, options);
      };
      
      // Test with small viewport (feature phone)
      Object.defineProperty(window, 'innerWidth', { value: 320, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 480, configurable: true });
      
      window.dispatchEvent(new Event('resize'));
      
      this.log('Low-End Device Simulation', 'complete', 'Low-end device conditions applied', 'critical', 'performance');

    } catch (error) {
      this.log('Low-End Device Simulation', 'error', `Low-end simulation failed: ${error.message}`, 'critical', 'performance');
    }
  }

  // 4. MOBILE BROWSER QUIRKS
  async mobileBrowserQuirks() {
    this.log('Mobile Browser Quirks', 'start', 'Testing mobile browser-specific issues', 'high', 'mobile');
    
    try {
      // iOS Safari viewport height issues
      const originalInnerHeight = Object.getOwnPropertyDescriptor(window, 'innerHeight');
      Object.defineProperty(window, 'innerHeight', {
        get: function() {
          // Simulate viewport height changes on iOS
          const base = originalInnerHeight?.get.call(this) || 667;
          return Math.random() > 0.5 ? base : base - 100; // Simulate address bar
        },
        configurable: true
      });
      
      // Mobile viewport meta tag issues
      const viewportMeta = document.querySelector('meta[name="viewport"]');
      if (viewportMeta) {
        // Simulate incorrect viewport settings
        viewportMeta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=10.0, user-scalable=yes');
      }
      
      // Test mobile-specific CSS issues
      const mobileStyles = document.createElement('style');
      mobileStyles.textContent = `
        * {
          -webkit-tap-highlight-color: rgba(255, 0, 0, 0.5);
          -webkit-touch-callout: default;
          -webkit-user-select: none;
          touch-action: manipulation;
        }
        
        @media (max-width: 768px) {
          * {
            transform: scale(0.8);
            opacity: 0.9;
          }
        }
      `;
      document.head.appendChild(mobileStyles);
      
      // Simulate mobile scrolling issues
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      
      // Test mobile input issues
      const inputs = document.querySelectorAll('input');
      inputs.forEach(input => {
        input.setAttribute('inputmode', 'numeric');
        input.setAttribute('pattern', '[0-9]*');
        input.style.fontSize = '16px'; // Prevent zoom on iOS
      });
      
      this.log('Mobile Browser Quirks', 'complete', 'Mobile browser quirks applied', 'high', 'mobile');

    } catch (error) {
      this.log('Mobile Browser Quirks', 'error', `Mobile quirks failed: ${error.message}`, 'high', 'mobile');
    }
  }

  // 5. GESTURE RECOGNITION CHAOS
  async gestureRecognitionChaos() {
    this.log('Gesture Recognition Chaos', 'start', 'Testing gesture recognition under stress', 'high', 'touch');
    
    try {
      const elements = document.querySelectorAll('*');
      let gestureCount = 0;
      
      // Simulate complex gesture sequences
      for (let i = 0; i < 200; i++) {
        const element = elements[Math.floor(Math.random() * elements.length)];
        
        // Simulate swipe gestures
        const touchStart = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true,
          touches: [new Touch({
            identifier: 0,
            target: element,
            clientX: Math.random() * window.innerWidth,
            clientY: Math.random() * window.innerHeight
          })]
        });
        
        element.dispatchEvent(touchStart);
        
        // Simulate swipe motion
        for (let j = 0; j < 10; j++) {
          const touchMove = new TouchEvent('touchmove', {
            bubbles: true,
            cancelable: true,
            touches: [new Touch({
              identifier: 0,
              target: element,
              clientX: Math.random() * window.innerWidth,
              clientY: Math.random() * window.innerHeight
            })]
          });
          element.dispatchEvent(touchMove);
          await this.sleep(5);
        }
        
        const touchEnd = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true,
          touches: []
        });
        element.dispatchEvent(touchEnd);
        
        // Simulate pinch zoom
        if (Math.random() > 0.7) {
          const wheelEvent = new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaX: 0,
            deltaY: (Math.random() - 0.5) * 100,
            ctrlKey: true
          });
          element.dispatchEvent(wheelEvent);
        }
        
        gestureCount++;
      }
      
      this.log('Gesture Recognition Chaos', 'complete', 
        `Processed ${gestureCount} gesture sequences`, 
        gestureCount > 150 ? 'critical' : 'high', 'touch');

    } catch (error) {
      this.log('Gesture Recognition Chaos', 'error', `Gesture chaos failed: ${error.message}`, 'high', 'touch');
    }
  }

  // 6. MOBILE PERFORMANCE THROTTLING
  async mobilePerformanceThrottling() {
    this.log('Mobile Performance Throttling', 'start', 'Simulating mobile performance limits', 'critical', 'performance');
    
    try {
      // Simulate thermal throttling
      let thermalLevel = 0;
      const thermalInterval = setInterval(() => {
        thermalLevel = Math.min(thermalLevel + 10, 100);
        
        // Reduce performance as thermal level increases
        const slowdownFactor = 1 + (thermalLevel / 100) * 5;
        
        // Slow down timers
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay) {
          return originalSetTimeout.call(this, callback, delay * slowdownFactor);
        };
        
        if (thermalLevel >= 100) {
          clearInterval(thermalInterval);
        }
      }, 1000);
      
      // Simulate memory pressure
      for (let i = 0; i < 50; i++) {
        const memoryHog = new Array(100000).fill(0).map(() => ({
          data: new Array(100).fill(Math.random()),
          timestamp: Date.now()
        }));
        
        // Trigger memory pressure event
        if ('memory' in performance) {
          window.dispatchEvent(new Event('memorypressure'));
        }
        
        await this.sleep(100);
      }
      
      // Simulate background tab throttling
      document.hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
      
      await this.sleep(2000);
      
      // Simulate foreground tab
      document.hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
      
      clearInterval(thermalInterval);
      
      this.log('Mobile Performance Throttling', 'complete', 'Mobile performance throttling simulated', 'critical', 'performance');

    } catch (error) {
      this.log('Mobile Performance Throttling', 'error', `Performance throttling failed: ${error.message}`, 'critical', 'performance');
    }
  }

  // 7. MOBILE KEYBOARD ISSUES
  async mobileKeyboardIssues() {
    this.log('Mobile Keyboard Issues', 'start', 'Testing mobile keyboard interactions', 'medium', 'mobile');
    
    try {
      const inputs = document.querySelectorAll('input, textarea');
      
      // Simulate virtual keyboard appearance/disappearance
      for (let i = 0; i < 50; i++) {
        const input = inputs[Math.floor(Math.random() * inputs.length)];
        
        // Focus input (keyboard appears)
        input.focus();
        
        // Simulate viewport resize due to keyboard
        const originalHeight = window.innerHeight;
        Object.defineProperty(window, 'innerHeight', { 
          value: originalHeight * 0.5, 
          configurable: true 
        });
        window.dispatchEvent(new Event('resize'));
        
        // Simulate typing
        input.value = Math.random().toString(36).substring(7);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        
        await this.sleep(100);
        
        // Blur input (keyboard disappears)
        input.blur();
        
        // Restore viewport
        Object.defineProperty(window, 'innerHeight', { 
          value: originalHeight, 
          configurable: true 
        });
        window.dispatchEvent(new Event('resize'));
        
        await this.sleep(100);
      }
      
      this.log('Mobile Keyboard Issues', 'complete', 'Mobile keyboard interactions tested', 'medium', 'mobile');

    } catch (error) {
      this.log('Mobile Keyboard Issues', 'error', `Keyboard test failed: ${error.message}`, 'medium', 'mobile');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async runAllTests() {
    console.log('Starting MOBILE DEVICE FAILURE TEST SUITE');
    console.log('========================================');
    
    const tests = [
      () => this.touchEventChaos(),
      () => this.orientationChangeStress(),
      () => this.lowEndDeviceSimulation(),
      () => this.mobileBrowserQuirks(),
      () => this.gestureRecognitionChaos(),
      () => this.mobilePerformanceThrottling(),
      () => this.mobileKeyboardIssues()
    ];
    
    for (const test of tests) {
      try {
        await test();
        await this.sleep(1000);
      } catch (error) {
        console.error('Mobile device test failed:', error);
      }
    }
    
    this.generateMobileFailureReport();
  }

  generateMobileFailureReport() {
    console.log('\n\nMOBILE DEVICE FAILURE REPORT');
    console.log('===============================');
    
    console.log(`Total Mobile Failures: ${this.mobileFailures.length}`);
    console.log(`Touch Event Failures: ${this.touchFailures.length}`);
    console.log(`Orientation Failures: ${this.orientationFailures.length}`);
    console.log(`Performance Failures: ${this.performanceFailures.length}`);
    
    const criticalFailures = this.testResults.filter(r => r.severity === 'critical' && (r.status === 'error' || r.status === 'fail'));
    
    console.log('\nCRITICAL MOBILE FAILURES:');
    criticalFailures.forEach(failure => {
      console.log(`- [${failure.category}] ${failure.testName}: ${failure.details}`);
    });
    
    console.log('\nTOUCH-SPECIFIC ISSUES:');
    this.touchFailures.forEach(failure => {
      console.log(`- ${failure.testName}: ${failure.details}`);
    });
    
    console.log('\nPERFORMANCE ISSUES:');
    this.performanceFailures.forEach(failure => {
      console.log(`- ${failure.testName}: ${failure.details}`);
    });
    
    return {
      totalFailures: this.mobileFailures.length,
      touchFailures: this.touchFailures.length,
      orientationFailures: this.orientationFailures.length,
      performanceFailures: this.performanceFailures.length,
      criticalFailures,
      allResults: this.testResults
    };
  }
}

// Auto-start mobile device failure testing
window.mobileDeviceFailureTester = new MobileDeviceFailureTester();

// Run tests automatically after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.mobileDeviceFailureTester.runAllTests(), 7000);
  });
} else {
  setTimeout(() => window.mobileDeviceFailureTester.runAllTests(), 7000);
}

// Manual trigger
window.runMobileDeviceFailureTests = () => window.mobileDeviceFailureTester.runAllTests();
