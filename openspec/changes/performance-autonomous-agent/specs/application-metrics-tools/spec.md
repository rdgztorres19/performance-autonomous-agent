## ADDED Requirements

### Requirement: Application latency metrics collection
The system SHALL provide tools to collect application-level latency metrics including response time, percentiles (p50, p90, p99, p999), tail latency, service time, queue wait time, and end-to-end latency.

#### Scenario: Collect application response times
- **WHEN** the agent needs application latency information
- **THEN** the system SHALL execute tools that collect response time metrics from application logs, monitoring endpoints, or process tracing

#### Scenario: Tools target specific processes
- **WHEN** application metrics are collected
- **THEN** tools SHALL be able to target specific processes or applications based on configuration

### Requirement: Application throughput metrics collection
The system SHALL provide tools to collect application throughput metrics including requests/sec, transactions/sec, messages/sec, and batch jobs/sec.

#### Scenario: Collect application throughput
- **WHEN** the agent needs application throughput information
- **THEN** the system SHALL execute tools that collect throughput metrics from application monitoring or logs

### Requirement: Application error metrics collection
The system SHALL provide tools to collect application error metrics including error rate, timeout rate, retry rate, failed requests, and circuit breaker trips.

#### Scenario: Collect application error rates
- **WHEN** the agent needs application error information
- **THEN** the system SHALL execute tools that collect error metrics from application logs or monitoring

### Requirement: Application threading and concurrency metrics
The system SHALL provide tools to collect threading metrics including thread count, active threads, thread states, lock contention, deadlocks, and event loop lag.

#### Scenario: Collect thread metrics
- **WHEN** the agent needs threading information
- **THEN** the system SHALL execute tools that collect thread metrics from /proc/<pid>/task or process inspection

### Requirement: Application CPU and memory metrics
The system SHALL provide tools to collect application-level CPU metrics (CPU per endpoint, hot functions, flame graphs) and memory metrics (heap usage, GC frequency, allocation rate, memory leaks).

#### Scenario: Collect application CPU usage
- **WHEN** the agent needs application CPU information
- **THEN** the system SHALL execute tools that collect CPU metrics from /proc/<pid>/stat or process monitoring

#### Scenario: Collect application memory usage
- **WHEN** the agent needs application memory information
- **THEN** the system SHALL execute tools that collect memory metrics from /proc/<pid>/status or process inspection

### Requirement: Runtime-specific metrics
The system SHALL provide tools to collect runtime-specific metrics for JVM (GC pauses, safepoints, JIT compilation), Node.js (event loop lag, blocking time, heap size), and Python (GIL contention, memory alloc spikes, blocking IO).

#### Scenario: Collect runtime-specific metrics
- **WHEN** the agent needs runtime-specific information
- **THEN** the system SHALL execute tools that collect metrics specific to the application's runtime environment
