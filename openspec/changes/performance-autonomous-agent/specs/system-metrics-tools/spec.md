## ADDED Requirements

### Requirement: CPU metrics collection
The system SHALL provide tools to collect CPU performance metrics including utilization (user, system, idle, iowait, steal, nice, irq/softirq), saturation (load average, run queue, context switches, interrupts), microarchitecture metrics (IPC, CPI, cache hits/misses, branch mispredicts, TLB misses), and scheduling metrics (preemption rate, scheduler latency).

#### Scenario: Collect CPU utilization metrics
- **WHEN** the agent needs CPU utilization data
- **THEN** the system SHALL execute tools that collect CPU utilization percentages from /proc/stat or equivalent

#### Scenario: Collect load average
- **WHEN** the agent needs system load information
- **THEN** the system SHALL execute tools that collect load average (1m, 5m, 15m) from /proc/loadavg or uptime command

#### Scenario: Tools use OS utilities only
- **WHEN** CPU metric tools execute
- **THEN** they SHALL use only Linux OS utilities (/proc, sysfs, standard commands) without external dependencies

### Requirement: Memory metrics collection
The system SHALL provide tools to collect memory performance metrics including utilization (total, used, free, buffers, page cache, slab), pressure (swap usage, page faults, PSI, OOM events), and behavior (working set size, fragmentation, NUMA imbalance).

#### Scenario: Collect memory utilization
- **WHEN** the agent needs memory utilization data
- **THEN** the system SHALL execute tools that collect memory metrics from /proc/meminfo or free command

#### Scenario: Collect swap metrics
- **WHEN** the agent needs swap information
- **THEN** the system SHALL execute tools that collect swap usage and swap in/out rates

### Requirement: Disk and storage metrics collection
The system SHALL provide tools to collect disk performance metrics including throughput (read/write MB/s, IOPS), latency (average, percentiles), saturation (utilization, queue depth, I/O wait), and quality (retries, SMART errors).

#### Scenario: Collect disk I/O metrics
- **WHEN** the agent needs disk I/O information
- **THEN** the system SHALL execute tools that collect disk metrics from /proc/diskstats, iostat, or equivalent

#### Scenario: Collect file system metrics
- **WHEN** the agent needs file system information
- **THEN** the system SHALL execute tools that collect file system metrics (file open rate, fsync rate, cache hit ratio, etc.)

### Requirement: Network metrics collection
The system SHALL provide tools to collect network performance metrics including throughput (RX/TX bytes/sec, packets/sec), latency (RTT, TCP handshake time), errors (retransmissions, packet drops), and saturation (interface utilization, queue backlog).

#### Scenario: Collect network interface metrics
- **WHEN** the agent needs network information
- **THEN** the system SHALL execute tools that collect network metrics from /proc/net/dev, ifconfig, or ss/netstat commands

### Requirement: Kernel and OS metrics collection
The system SHALL provide tools to collect kernel-level metrics including syscall rate/latency, lock contention, kernel spin time, lockups, interrupt storms, and driver latency.

#### Scenario: Collect syscall metrics
- **WHEN** the agent needs kernel-level information
- **THEN** the system SHALL execute tools that collect kernel metrics from /proc, /sys, or system utilities

### Requirement: Virtualization metrics collection
The system SHALL provide tools to collect virtualization metrics including CPU steal time, noisy neighbor detection, throttling events, cgroup limits, and container metrics.

#### Scenario: Collect virtualization metrics
- **WHEN** the agent needs virtualization information
- **THEN** the system SHALL execute tools that collect virtualization metrics from /proc, cgroup filesystems, or container APIs
