/**
 * Microservices Architecture Framework
 * Service communication, discovery, load balancing, and orchestration
 */

const Microservices = (function() {
  'use strict';

  // Configuration
  const config = {
    enabled: true,
    
    // Service Registry
    serviceRegistry: {
      enabled: true,
      heartbeatInterval: 30000, // 30 seconds
      serviceTimeout: 120000 // 2 minutes
    },
    
    // Load Balancing
    loadBalancing: {
      strategy: 'round-robin', // round-robin, least-connections, random
      healthCheckInterval: 15000
    },
    
    // Service Communication
    communication: {
      protocol: 'http', // http, grpc, message-queue
      timeout: 5000,
      retries: 3
    },
    
    // Circuit Breaker
    circuitBreaker: {
      enabled: true,
      failureThreshold: 5,
      recoveryTimeout: 60000,
      monitoring: true
    },
    
    // Message Queue (for async communication)
    messageQueue: {
      enabled: true,
      provider: 'redis', // redis, rabbitmq, kafka
      maxRetries: 3,
      deadLetterQueue: true
    }
  };

  // Service Registry
  const serviceRegistry = new Map();
  const serviceHealth = new Map();
  const circuitBreakers = new Map();

  /**
   * Register a service
   */
  function registerService(serviceName, serviceConfig) {
    const service = {
      id: `${serviceName}-${Date.now()}`,
      name: serviceName,
      host: serviceConfig.host || 'localhost',
      port: serviceConfig.port || 3000,
      protocol: serviceConfig.protocol || 'http',
      healthCheckUrl: serviceConfig.healthCheckUrl || '/health',
      metadata: serviceConfig.metadata || {},
      registeredAt: Date.now(),
      lastHeartbeat: Date.now(),
      status: 'healthy'
    };
    
    serviceRegistry.set(service.id, service);
    
    // Start heartbeat monitoring
    startHeartbeatMonitoring(service);
    
    console.log(`[Microservices] Service registered: ${serviceName} at ${service.host}:${service.port}`);
    
    return service;
  }

  /**
   * Unregister a service
   */
  function unregisterService(serviceId) {
    const service = serviceRegistry.get(serviceId);
    if (service) {
      serviceRegistry.delete(serviceId);
      serviceHealth.delete(serviceId);
      console.log(`[Microservices] Service unregistered: ${service.name}`);
      return { success: true };
    }
    return { success: false, error: 'Service not found' };
  }

  /**
   * Discover services by name
   */
  function discoverServices(serviceName) {
    const services = Array.from(serviceRegistry.values())
      .filter(s => s.name === serviceName && s.status === 'healthy');
    
    return services;
  }

  /**
   * Get service by ID
   */
  function getService(serviceId) {
    return serviceRegistry.get(serviceId);
  }

  /**
   * Start heartbeat monitoring for a service
   */
  function startHeartbeatMonitoring(service) {
    const interval = setInterval(async () => {
      try {
        const isHealthy = await performHealthCheck(service);
        
        if (isHealthy) {
          service.status = 'healthy';
          service.lastHeartbeat = Date.now();
          serviceHealth.set(service.id, { lastCheck: Date.now(), status: 'healthy' });
        } else {
          service.status = 'unhealthy';
          serviceHealth.set(service.id, { lastCheck: Date.now(), status: 'unhealthy' });
          console.warn(`[Microservices] Service unhealthy: ${service.name}`);
        }
      } catch (error) {
        service.status = 'unhealthy';
        console.error(`[Microservices] Health check failed for ${service.name}:`, error.message);
      }
    }, config.serviceRegistry.heartbeatInterval);
    
    // Store interval for cleanup
    service.heartbeatInterval = interval;
  }

  /**
   * Perform health check for a service
   */
  async function performHealthCheck(service) {
    try {
      const url = `${service.protocol}://${service.host}:${service.port}${service.healthCheckUrl}`;
      const response = await fetch(url, {
        method: 'GET',
        timeout: config.communication.timeout
      });
      
      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Load balancing - select service instance
   */
  function selectService(serviceName) {
    const services = discoverServices(serviceName);
    
    if (services.length === 0) {
      throw new Error(`No healthy instances found for service: ${serviceName}`);
    }
    
    switch (config.loadBalancing.strategy) {
      case 'round-robin':
        return roundRobinSelection(services);
      case 'least-connections':
        return leastConnectionsSelection(services);
      case 'random':
        return randomSelection(services);
      default:
        return roundRobinSelection(services);
    }
  }

  /**
   * Round-robin selection
   */
  let roundRobinIndex = 0;
  function roundRobinSelection(services) {
    const service = services[roundRobinIndex % services.length];
    roundRobinIndex++;
    return service;
  }

  /**
   * Least connections selection
   */
  function leastConnectionsSelection(services) {
    return services.reduce((min, current) => {
      const minConns = serviceHealth.get(min.id)?.connections || 0;
      const currConns = serviceHealth.get(current.id)?.connections || 0;
      return currConns < minConns ? current : min;
    });
  }

  /**
   * Random selection
   */
  function randomSelection(services) {
    return services[Math.floor(Math.random() * services.length)];
  }

  /**
   * Call service (with circuit breaker)
   */
  async function callService(serviceName, endpoint, options = {}) {
    try {
      // Check circuit breaker
      const circuitBreakerState = getCircuitBreakerState(serviceName);
      if (circuitBreakerState === 'open') {
        throw new Error(`Circuit breaker is open for service: ${serviceName}`);
      }
      
      // Select service instance
      const service = selectService(serviceName);
      
      // Update connection count
      const health = serviceHealth.get(service.id) || {};
      health.connections = (health.connections || 0) + 1;
      serviceHealth.set(service.id, health);
      
      // Make request
      const url = `${service.protocol}://${service.host}:${service.port}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        timeout: options.timeout || config.communication.timeout
      });
      
      // Update connection count
      health.connections = Math.max(0, (health.connections || 0) - 1);
      serviceHealth.set(service.id, health);
      
      // Record success for circuit breaker
      recordCircuitBreakerSuccess(serviceName);
      
      return response;
    } catch (error) {
      // Record failure for circuit breaker
      recordCircuitBreakerFailure(serviceName);
      throw error;
    }
  }

  /**
   * Circuit breaker state management
   */
  function getCircuitBreakerState(serviceName) {
    const breaker = circuitBreakers.get(serviceName);
    if (!breaker) return 'closed';
    
    if (breaker.state === 'open') {
      // Check if recovery timeout has passed
      if (Date.now() - breaker.openedAt > config.circuitBreaker.recoveryTimeout) {
        breaker.state = 'half-open';
        return 'half-open';
      }
      return 'open';
    }
    
    return breaker.state;
  }

  /**
   * Record circuit breaker success
   */
  function recordCircuitBreakerSuccess(serviceName) {
    const breaker = circuitBreakers.get(serviceName) || {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      openedAt: null
    };
    
    breaker.successes++;
    breaker.failures = 0;
    
    if (breaker.state === 'half-open') {
      breaker.state = 'closed';
    }
    
    circuitBreakers.set(serviceName, breaker);
  }

  /**
   * Record circuit breaker failure
   */
  function recordCircuitBreakerFailure(serviceName) {
    const breaker = circuitBreakers.get(serviceName) || {
      state: 'closed',
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      openedAt: null
    };
    
    breaker.failures++;
    breaker.lastFailureTime = Date.now();
    
    if (breaker.failures >= config.circuitBreaker.failureThreshold) {
      breaker.state = 'open';
      breaker.openedAt = Date.now();
      console.warn(`[Microservices] Circuit breaker opened for: ${serviceName}`);
    }
    
    circuitBreakers.set(serviceName, breaker);
  }

  /**
   * Reset circuit breaker
   */
  function resetCircuitBreaker(serviceName) {
    circuitBreakers.delete(serviceName);
    console.log(`[Microservices] Circuit breaker reset for: ${serviceName}`);
  }

  /**
   * Publish message to queue
   */
  async function publishMessage(queue, message) {
    if (!config.messageQueue.enabled) {
      console.log('[Microservices] Message queue disabled, message not published');
      return { success: false, message: 'Message queue disabled' };
    }
    
    // In production, this would use Redis Pub/Sub, RabbitMQ, or Kafka
    console.log(`[Microservices] Message published to queue: ${queue}`, message);
    
    return { success: true, queue, message };
  }

  /**
   * Subscribe to message queue
   */
  function subscribeToQueue(queue, callback) {
    if (!config.messageQueue.enabled) {
      console.log('[Microservices] Message queue disabled, subscription not created');
      return { success: false, message: 'Message queue disabled' };
    }
    
    // In production, this would use Redis Pub/Sub, RabbitMQ, or Kafka
    console.log(`[Microservices] Subscribed to queue: ${queue}`);
    
    return { success: true, queue };
  }

  /**
   * Get service registry status
   */
  function getRegistryStatus() {
    const services = Array.from(serviceRegistry.values());
    
    return {
      totalServices: services.length,
      healthyServices: services.filter(s => s.status === 'healthy').length,
      unhealthyServices: services.filter(s => s.status === 'unhealthy').length,
      services: services.map(s => ({
        id: s.id,
        name: s.name,
        host: s.host,
        port: s.port,
        status: s.status,
        lastHeartbeat: s.lastHeartbeat
      })),
      circuitBreakers: Array.from(circuitBreakers.entries()).map(([name, state]) => ({
        service: name,
        state: state.state,
        failures: state.failures,
        successes: state.successes
      }))
    };
  }

  /**
   * Get service health
   */
  function getServiceHealth(serviceId) {
    return serviceHealth.get(serviceId);
  }

  /**
   * Shutdown all services
   */
  function shutdown() {
    // Clear all heartbeat intervals
    serviceRegistry.forEach(service => {
      if (service.heartbeatInterval) {
        clearInterval(service.heartbeatInterval);
      }
    });
    
    // Clear registry
    serviceRegistry.clear();
    serviceHealth.clear();
    circuitBreakers.clear();
    
    console.log('[Microservices] All services shut down');
  }

  return {
    // Service Registry
    registerService,
    unregisterService,
    discoverServices,
    getService,
    
    // Service Communication
    callService,
    
    // Load Balancing
    selectService,
    
    // Circuit Breaker
    resetCircuitBreaker,
    
    // Message Queue
    publishMessage,
    subscribeToQueue,
    
    // Monitoring
    getRegistryStatus,
    getServiceHealth,
    
    // Lifecycle
    shutdown,
    config
  };
})();

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Microservices;
} else {
  window.Microservices = Microservices;
}
