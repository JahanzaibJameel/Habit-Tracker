/**
 * Offline queue for monitoring events
 * Handles event buffering and retry logic when network is unavailable
 * 
 * @fileoverview Offline event queue with persistence and retry capabilities
 * @version 1.0.0
 * @author Enterprise Frontend Team
 */

import { MonitoringEvent, MonitoringSeverity } from './types';

/**
 * Queue configuration options
 */
export interface OfflineQueueConfig {
  /**
   * Maximum number of events to keep in memory
   */
  maxMemoryEvents: number;
  
  /**
   * Maximum size of persistent storage (in bytes)
   */
  maxStorageSize: number;
  
  /**
   * Retry configuration
   */
  retry: {
    maxAttempts: number;
    baseDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    backoffFactor: number;
  };
  
  /**
   * Storage key prefix
   */
  storageKey: string;
  
  /**
   * Event retention policy
   */
  retention: {
    maxAge: number; // milliseconds
    maxCount: number;
  };
  
  /**
   * Compression settings
   */
  compression: {
    enabled: boolean;
    threshold: number; // bytes
  };
}

/**
 * Queue statistics
 */
export interface QueueStats {
  totalEvents: number;
  memoryEvents: number;
  storageEvents: number;
  failedEvents: number;
  retryAttempts: number;
  lastFlushTime: number;
  oldestEventAge: number;
  queueSize: number; // bytes
}

/**
 * Queue operation result
 */
export interface QueueResult {
  success: boolean;
  processed: number;
  failed: number;
  remaining: number;
  error?: string;
}

/**
 * Event processing function type
 */
export type EventProcessor = (events: MonitoringEvent[]) => Promise<QueueResult>;

/**
 * Offline event queue with persistence and retry logic
 * 
 * @example
 * const queue = new OfflineQueue({
 *   maxMemoryEvents: 1000,
 *   retry: { maxAttempts: 3, baseDelay: 1000, maxDelay: 30000, backoffFactor: 2 }
 * });
 * 
 * queue.addEvent(event);
 * await queue.flush(processor);
 */
export class OfflineQueue {
  private config: OfflineQueueConfig;
  private memoryQueue: MonitoringEvent[] = [];
  private isProcessing = false;
  private retryTimers = new Map<string, NodeJS.Timeout>();
  private eventProcessors: EventProcessor[] = [];
  private stats: QueueStats = {
    totalEvents: 0,
    memoryEvents: 0,
    storageEvents: 0,
    failedEvents: 0,
    retryAttempts: 0,
    lastFlushTime: 0,
    oldestEventAge: 0,
    queueSize: 0,
  };

  constructor(config: Partial<OfflineQueueConfig> = {}) {
    this.config = {
      maxMemoryEvents: 1000,
      maxStorageSize: 5 * 1024 * 1024, // 5MB
      retry: {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffFactor: 2,
      },
      storageKey: 'monitoring_offline_queue',
      retention: {
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        maxCount: 10000,
      },
      compression: {
        enabled: true,
        threshold: 1024, // 1KB
      },
      ...config,
    };

    this.loadFromStorage();
    this.startRetentionCleanup();
  }

  /**
   * Add an event to the queue
   */
  addEvent(event: MonitoringEvent): boolean {
    try {
      // Validate event
      if (!this.isValidEvent(event)) {
        console.warn('Invalid monitoring event rejected', event);
        return false;
      }

      // Add timestamp if missing
      if (!event.timestamp) {
        event.timestamp = Date.now();
      }

      // Add to memory queue
      this.memoryQueue.push(event);
      this.stats.totalEvents++;
      this.stats.memoryEvents = this.memoryQueue.length;

      // Check if we need to flush to storage
      if (this.memoryQueue.length > this.config.maxMemoryEvents) {
        this.flushToStorage();
      }

      return true;
    } catch (error) {
      console.error('Failed to add event to queue:', error);
      return false;
    }
  }

  /**
   * Add multiple events to the queue
   */
  addEvents(events: MonitoringEvent[]): number {
    let added = 0;
    for (const event of events) {
      if (this.addEvent(event)) {
        added++;
      }
    }
    return added;
  }

  /**
   * Process events using registered processors
   */
  async flush(): Promise<QueueResult> {
    if (this.isProcessing) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        remaining: this.getTotalEventCount(),
        error: 'Queue is already processing',
      };
    }

    this.isProcessing = true;

    try {
      const allEvents = this.getAllEvents();
      
      if (allEvents.length === 0) {
        return {
          success: true,
          processed: 0,
          failed: 0,
          remaining: 0,
        };
      }

      let totalProcessed = 0;
      let totalFailed = 0;
      let lastError: string | undefined;

      // Process events with each registered processor
      for (const processor of this.eventProcessors) {
        try {
          const result = await processor(allEvents);
          totalProcessed += result.processed;
          totalFailed += result.failed;
          
          if (result.error) {
            lastError = result.error;
          }

          // Remove successfully processed events
          if (result.processed > 0) {
            this.removeProcessedEvents(result.processed);
          }
        } catch (error) {
          totalFailed += allEvents.length;
          lastError = error instanceof Error ? error.message : String(error);
        }
      }

      // Update stats
      this.stats.lastFlushTime = Date.now();
      this.stats.failedEvents += totalFailed;

      return {
        success: totalFailed === 0,
        processed: totalProcessed,
        failed: totalFailed,
        remaining: this.getTotalEventCount(),
        error: lastError,
      };
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Register an event processor
   */
  addProcessor(processor: EventProcessor): void {
    this.eventProcessors.push(processor);
  }

  /**
   * Remove an event processor
   */
  removeProcessor(processor: EventProcessor): boolean {
    const index = this.eventProcessors.indexOf(processor);
    if (index > -1) {
      this.eventProcessors.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get all events from memory and storage
   */
  getAllEvents(): MonitoringEvent[] {
    const storageEvents = this.getStorageEvents();
    const allEvents = [...storageEvents, ...this.memoryQueue];
    
    // Sort by timestamp
    return allEvents.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: MonitoringSeverity): MonitoringEvent[] {
    return this.getAllEvents().filter(event => event.severity === severity);
  }

  /**
   * Get events by category
   */
  getEventsByCategory(category: string): MonitoringEvent[] {
    return this.getAllEvents().filter(event => event.category === category);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.memoryQueue = [];
    this.clearStorage();
    this.resetStats();
  }

  /**
   * Clear events older than specified age
   */
  clearOldEvents(maxAge: number): number {
    const cutoff = Date.now() - maxAge;
    const allEvents = this.getAllEvents();
    const oldEvents = allEvents.filter(event => event.timestamp < cutoff);
    
    if (oldEvents.length > 0) {
      this.removeEventsByIds(oldEvents.map(e => e.id));
    }
    
    return oldEvents.length;
  }

  /**
   * Retry failed events with exponential backoff
   */
  async retryFailedEvents(): Promise<QueueResult> {
    const failedEvents = this.getEventsBySeverity(MonitoringSeverity.ERROR);
    
    if (failedEvents.length === 0) {
      return {
        success: true,
        processed: 0,
        failed: 0,
        remaining: 0,
      };
    }

    // Calculate delay based on retry count
    const retryCount = this.stats.retryAttempts;
    const delay = Math.min(
      this.config.retry.baseDelay * Math.pow(this.config.retry.backoffFactor, retryCount),
      this.config.retry.maxDelay
    );

    this.stats.retryAttempts++;

    // Wait for delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Attempt to flush
    return this.flush();
  }

  /**
   * Export events to JSON
   */
  exportEvents(): string {
    const events = this.getAllEvents();
    return JSON.stringify({
      exportTime: Date.now(),
      config: this.config,
      stats: this.stats,
      events,
    }, null, 2);
  }

  /**
   * Import events from JSON
   */
  importEvents(jsonData: string): number {
    try {
      const data = JSON.parse(jsonData);
      const events = data.events || [];
      return this.addEvents(events);
    } catch (error) {
      console.error('Failed to import events:', error);
      return 0;
    }
  }

  /**
   * Validate event structure
   */
  private isValidEvent(event: MonitoringEvent): boolean {
    return !!(
      event &&
      typeof event.id === 'string' &&
      typeof event.message === 'string' &&
      Object.values(MonitoringSeverity).includes(event.severity)
    );
  }

  /**
   * Flush memory events to persistent storage
   */
  private flushToStorage(): void {
    try {
      const eventsToStore = this.memoryQueue.splice(0, this.config.maxMemoryEvents);
      this.storeEvents(eventsToStore);
      this.stats.memoryEvents = this.memoryQueue.length;
    } catch (error) {
      console.error('Failed to flush to storage:', error);
    }
  }

  /**
   * Store events in persistent storage
   */
  private storeEvents(events: MonitoringEvent[]): void {
    try {
      const existingEvents = this.getStorageEvents();
      const allEvents = [...existingEvents, ...events];
      
      // Apply retention policy
      const filteredEvents = this.applyRetentionPolicy(allEvents);
      
      // Compress if enabled and large enough
      let dataToStore = JSON.stringify(filteredEvents);
      if (this.config.compression.enabled && dataToStore.length > this.config.compression.threshold) {
        // Simple compression - in a real implementation, use a proper compression library
        dataToStore = this.compressData(dataToStore);
      }
      
      // Check storage size limit
      if (dataToStore.length > this.config.maxStorageSize) {
        // Remove oldest events to fit
        const eventsToFit = this.fitToStorageSize(filteredEvents, dataToStore.length);
        dataToStore = JSON.stringify(eventsToFit);
      }
      
      localStorage.setItem(this.config.storageKey, dataToStore);
      this.stats.storageEvents = filteredEvents.length;
    } catch (error) {
      console.error('Failed to store events:', error);
    }
  }

  /**
   * Get events from persistent storage
   */
  private getStorageEvents(): MonitoringEvent[] {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) return [];

      let data = stored;
      
      // Decompress if needed
      if (this.config.compression.enabled && this.isCompressedData(stored)) {
        data = this.decompressData(stored);
      }
      
      const events = JSON.parse(data);
      return Array.isArray(events) ? events : [];
    } catch (error) {
      console.error('Failed to load events from storage:', error);
      return [];
    }
  }

  /**
   * Clear persistent storage
   */
  private clearStorage(): void {
    try {
      localStorage.removeItem(this.config.storageKey);
      this.stats.storageEvents = 0;
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }

  /**
   * Load events from storage on initialization
   */
  private loadFromStorage(): void {
    const storedEvents = this.getStorageEvents();
    if (storedEvents.length > 0) {
      this.memoryQueue = storedEvents.slice(-this.config.maxMemoryEvents);
      this.stats.memoryEvents = this.memoryQueue.length;
      this.stats.storageEvents = storedEvents.length - this.memoryQueue.length;
    }
  }

  /**
   * Apply retention policy to events
   */
  private applyRetentionPolicy(events: MonitoringEvent[]): MonitoringEvent[] {
    const now = Date.now();
    const cutoff = now - this.config.retention.maxAge;
    
    let filtered = events.filter(event => event.timestamp > cutoff);
    
    // Limit by count
    if (filtered.length > this.config.retention.maxCount) {
      filtered = filtered.slice(-this.config.retention.maxCount);
    }
    
    return filtered;
  }

  /**
   * Fit events to storage size limit
   */
  private fitToStorageSize(events: MonitoringEvent[], currentSize: number): MonitoringEvent[] {
    if (currentSize <= this.config.maxStorageSize) {
      return events;
    }
    
    // Remove oldest events until size fits
    let filtered = [...events];
    let size = currentSize;
    
    while (filtered.length > 0 && size > this.config.maxStorageSize) {
      filtered.shift();
      size = JSON.stringify(filtered).length;
    }
    
    return filtered;
  }

  /**
   * Remove processed events from queue
   */
  private removeProcessedEvents(count: number): void {
    // Remove from memory queue first
    const memoryRemoved = Math.min(count, this.memoryQueue.length);
    this.memoryQueue.splice(0, memoryRemoved);
    
    // Remove from storage if needed
    if (count > memoryRemoved) {
      const storageEvents = this.getStorageEvents();
      const storageRemoved = Math.min(count - memoryRemoved, storageEvents.length);
      const remainingStorage = storageEvents.slice(storageRemoved);
      this.storeEvents(remainingStorage);
    }
    
    this.updateStats();
  }

  /**
   * Remove events by their IDs
   */
  private removeEventsByIds(ids: string[]): void {
    // Remove from memory
    this.memoryQueue = this.memoryQueue.filter(event => !ids.includes(event.id));
    
    // Remove from storage
    const storageEvents = this.getStorageEvents();
    const remainingStorage = storageEvents.filter(event => !ids.includes(event.id));
    this.storeEvents(remainingStorage);
    
    this.updateStats();
  }

  /**
   * Get total event count
   */
  private getTotalEventCount(): number {
    return this.memoryQueue.length + this.stats.storageEvents;
  }

  /**
   * Update queue statistics
   */
  private updateStats(): void {
    this.stats.memoryEvents = this.memoryQueue.length;
    this.stats.storageEvents = this.getStorageEvents().length;
    
    const allEvents = this.getAllEvents();
    this.stats.queueSize = JSON.stringify(allEvents).length;
    
    if (allEvents.length > 0) {
      const oldestEvent = allEvents[0];
      if (oldestEvent) {
        this.stats.oldestEventAge = Date.now() - oldestEvent.timestamp;
      }
    } else {
      this.stats.oldestEventAge = 0;
    }
  }

  /**
   * Reset statistics
   */
  private resetStats(): void {
    this.stats = {
      totalEvents: 0,
      memoryEvents: 0,
      storageEvents: 0,
      failedEvents: 0,
      retryAttempts: 0,
      lastFlushTime: 0,
      oldestEventAge: 0,
      queueSize: 0,
    };
  }

  /**
   * Start periodic cleanup of old events
   */
  private startRetentionCleanup(): void {
    // Run cleanup every hour
    setInterval(() => {
      this.clearOldEvents(this.config.retention.maxAge);
    }, 60 * 60 * 1000);
  }

  /**
   * Simple compression (placeholder - use real compression in production)
   */
  private compressData(data: string): string {
    // In a real implementation, use libraries like pako or lz-string
    return btoa(data);
  }

  /**
   * Simple decompression (placeholder - use real compression in production)
   */
  private decompressData(data: string): string {
    // In a real implementation, use libraries like pako or lz-string
    try {
      return atob(data);
    } catch {
      return data; // Fallback if not base64 encoded
    }
  }

  /**
   * Check if data is compressed
   */
  private isCompressedData(data: string): boolean {
    try {
      // Try to decode as base64
      atob(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Purge user data for DSR compliance
   */
  async purgeUserData(userId?: string): Promise<{ purgedEvents: number }> {
    if (!userId) {
      return { purgedEvents: 0 };
    }

    let purgedCount = 0;

    // Purge from memory queue
    const initialMemoryCount = this.memoryQueue.length;
    this.memoryQueue = this.memoryQueue.filter(event => 
      !event.context?.userId || event.context.userId !== userId
    );
    purgedCount += initialMemoryCount - this.memoryQueue.length;

    // Purge from persistent storage
    try {
      const storedData = localStorage.getItem(this.config.storageKey);
      if (storedData) {
        const decompressed = this.isCompressedData(storedData) 
          ? this.decompressData(storedData) 
          : storedData;
        
        const allEvents: MonitoringEvent[] = JSON.parse(decompressed);
        const initialStoredCount = allEvents.length;
        
        const filteredEvents = allEvents.filter(event => 
          !event.context?.userId || event.context.userId !== userId
        );
        
        purgedCount += initialStoredCount - filteredEvents.length;
        
        // Save filtered events back to storage
        const serialized = JSON.stringify(filteredEvents);
        const compressed = this.compressData(serialized);
        localStorage.setItem(this.config.storageKey, compressed);
      }
    } catch (error) {
      console.warn('Failed to purge user data from persistent storage:', error);
    }

    return { purgedEvents: purgedCount };
  }
}

/**
 * Factory function for creating offline queues
 */
export function createOfflineQueue(config?: Partial<OfflineQueueConfig>): OfflineQueue {
  return new OfflineQueue(config);
}

/**
 * Default offline queue instance
 */
export const defaultOfflineQueue = createOfflineQueue();
