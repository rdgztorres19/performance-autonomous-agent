# Métricas que Requieren Herramientas Externas

Los tools del Performance Autonomous Agent usan **solo comandos nativos de Linux** (`/proc`, `ps`, `ss`, `cat`, `grep`, `bash`, etc.) para no depender de paquetes adicionales.

---

## A. Métricas de Sistema (A.1–A.6) — Implementadas con herramientas nativas

Todas las métricas de sistema se implementan sin `mpstat`, `vmstat`, `iostat`, `iftop`, `vnstat`, `dstat` ni `journalctl`:

| Especificación | Herramienta original | Implementación nativa |
|----------------|----------------------|------------------------|
| A.1 CPU por core | mpstat -P ALL | `/proc/stat` (cpu0, cpu1...) — `cpu_per_core` |
| A.1 Run queue | vmstat (r) | `/proc/stat` procs_running — `cpu_saturation` |
| A.1 Load average | uptime, /proc/loadavg | `/proc/loadavg` — `load_average` |
| A.1 Context switches | vmstat (cs) | `/proc/stat` ctxt — `cpu_saturation` |
| A.1 Interrupciones por CPU | /proc/interrupts, mpstat | `/proc/interrupts` — `cpu_interrupts` |
| A.1 Softirq | /proc/softirqs | `/proc/softirqs` — `cpu_interrupts` |
| A.2 Memoria total/usa/libre | free, vmstat | `/proc/meminfo` — `memory_utilization` |
| A.2 Swap usado | free | `/proc/meminfo` — `memory_utilization` |
| A.2 OOM kills | dmesg, journalctl | `/proc/vmstat` + `dmesg` — `oom_kills` |
| A.2 Presión memoria (PSI) | /proc/pressure/memory | `/proc/pressure/memory` — `memory_pressure` |
| A.3 Throughput I/O por disco | iostat, dstat | `/proc/diskstats` — `disk_throughput` |
| A.3 IOPS por disco | iostat | `/proc/diskstats` — `disk_throughput` |
| A.3 Latencia I/O (await) | iostat | `/proc/diskstats` time_* — `disk_throughput` |
| A.3 Queue depth | iostat (avgqu-sz) | `/proc/diskstats` io_in_progress — `disk_throughput`, `disk_saturation` |
| A.3 I/O bloqueado (b) | vmstat (b) | `/proc/stat` procs_blocked — `cpu_saturation` |
| A.4 Conexiones por estado | ss -s, netstat | `ss -tan` — `network_connections` |
| A.4 Throughput por interfaz | iftop, vnstat | `/proc/net/dev` — `network_throughput` |
| A.4 Errores de red | ip -s link | `/proc/net/dev` — `network_interface_errors` |
| A.4 Retransmisiones TCP | netstat -s | `/proc/net/snmp` — `network_errors` |
| A.4 somaxconn | /proc/sys | `/proc/sys/net/core/somaxconn` — `kernel_metrics` |
| A.5 Run queue, Wait queue | vmstat | `cpu_saturation` |
| A.6 FD totales | /proc/sys/fs/file-nr | `kernel_metrics` |
| A.6 Límites kernel | sysctl -a | `/proc/sys/*` — `system_limits` |
| A.6 ulimit por proceso | ulimit -a | `bash -c 'ulimit -a'` — `system_limits` |

**No hay métricas de sistema que requieran herramientas externas.**

---

## B. Métricas por Proceso (B.1–B.6) — Las que sí requieren herramientas externas

### B.1 CPU (por proceso)

| Métrica | Herramienta requerida | Paquete típico | Nota |
|---------|----------------------|----------------|------|
| Branch mispredictions | `perf stat -e branches,branch-misses -p <pid>` | linux-tools, linux-tools-generic | No estándar |
| Instruction cache misses | `perf stat -e L1-icache-load-misses,L1-icache-loads -p <pid>` | linux-tools | No estándar |
| Cycles, instructions, IPC | `perf stat -e cycles,instructions -p <pid>` | linux-tools | No estándar |
| Stalled cycles | `perf stat -e cycles,stalled-cycles-frontend,stalled-cycles-backend -p <pid>` | linux-tools | No estándar |
| Cache L1/L2/L3 misses | `perf stat -e L1-dcache-loads,L1-dcache-load-misses,LLC-loads,LLC-load-misses -p <pid>` | linux-tools | No estándar |
| Migraciones entre cores | `perf stat -e migrations -p <pid>` | linux-tools | No estándar |

---

## B.2 Context switching (por proceso)

| Métrica | Herramienta requerida | Paquete típico | Nota |
|---------|----------------------|----------------|------|
| Context switches por hilo (tasa en tiempo real) | `pidstat -wt -p <pid> 1` | sysstat | No viene en imágenes minimales |

**Implementado con /proc:** `voluntary_ctxt_switches` y `nonvoluntary_ctxt_switches` acumulados (ApplicationLatencyTool, RuntimeSpecificTool).

---

## B.3 Syscalls (por proceso)

| Métrica | Herramienta requerida | Paquete típico | Nota |
|---------|----------------------|----------------|------|
| Syscalls por tipo | `strace -c -p <pid>` | strace | Invasivo, requiere Ctrl+C para resumen |
| Syscalls en tiempo real | `strace -p <pid>`, `strace -f -p <pid>` | strace | Invasivo |
| Syscalls agregados | `perf trace -p <pid>` | linux-tools | No estándar |
| Syscalls de archivos | `strace -c -e trace=open,openat,read,write,close,fsync -p <pid>` | strace | Invasivo |
| fsync / fdatasync frecuencia | `strace -e trace=fsync,fdatasync,sync -f -p <pid>` | strace | Invasivo |

---

## B.4 Memoria (por proceso)

| Métrica | Herramienta requerida | Paquete típico | Nota |
|---------|----------------------|----------------|------|
| Page faults en tiempo real (minflt, majflt/seg) | `pidstat -r -p <pid> 1` | sysstat | No estándar |
| Page faults con perf | `perf stat -e page-faults,minor-faults,major-faults -p <pid>` | linux-tools | No estándar |
| pmap detallado | `pmap -x <pid>` | procps | Suele estar; no implementado |
| smem (shared/private) | `smem -p <pid>` | smem (Python) | No estándar |

**Implementado con /proc:** minflt, majflt acumulados (ProcessMemoryTool), RSS, VSS, Swap (ProcessMemoryTool, ProcessThreadMemoryTool).

---

## B.5 I/O (por proceso)

| Métrica | Herramienta requerida | Paquete típico | Nota |
|---------|----------------------|----------------|------|
| I/O KB/s en tiempo real | `iotop -o`, `pidstat -d -p <pid> 1` | iotop, sysstat | No estándar |
| I/O por archivo (operaciones) | `strace -e trace=open,read,write -p <pid>` | strace | Invasivo |

**Implementado con /proc:** read_bytes, write_bytes, syscr, syscw de `/proc/pid/io` (ProcessIoTool, ApplicationThroughputTool).

---

## B.6 Red (por proceso)

| Métrica | Herramienta requerida | Paquete típico | Nota |
|---------|----------------------|----------------|------|
| Tráfico por proceso (estilo nethogs) | `nethogs` | nethogs | No estándar, requiere root |

**Implementado con /proc:** RX/TX bytes por proceso vía `/proc/pid/net/dev` (ApplicationThroughputTool), conexiones y puertos vía `ss` (ApplicationLatencyTool).

---

## Resumen

| Categoría | Implementado (solo /proc + base) | Requiere herramienta externa |
|-----------|----------------------------------|------------------------------|
| CPU | % proceso, % por thread, user/system, PSR, affinity | perf (branches, IPC, cache, migrations) |
| Context switches | Acumulado proceso | pidstat (por thread, tasa) |
| Syscalls | — | strace, perf trace |
| Memoria | RSS, VSS, swap, minflt, majflt, por thread | pidstat -r, perf, pmap, smem |
| I/O | read/write bytes, FD count, open files | iotop, pidstat -d, strace |
| Red | Conexiones, RX/TX, puertos | nethogs |

---

## Resumen: herramientas externas que NO se usan

| Herramienta | Paquete | Sustituida por |
|-------------|---------|----------------|
| mpstat | sysstat | /proc/stat, cpu_per_core |
| vmstat | procps | /proc/stat, /proc/vmstat |
| iostat | sysstat | /proc/diskstats |
| iftop | iftop | /proc/net/dev |
| vnstat | vnstat | /proc/net/dev |
| dstat | dstat | /proc (varios) |
| pidstat | sysstat | /proc/pid/* |
| perf | linux-tools | — (no sustituible) |
| strace | strace | — (no sustituible) |
| iotop | iotop | /proc/pid/io (bytes, no tasa real) |
| nethogs | nethogs | — (no sustituible) |
| journalctl | systemd | dmesg |
