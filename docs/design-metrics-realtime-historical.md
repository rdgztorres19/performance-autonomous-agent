# Diseño: Centro de Métricas — Real-time e Histórico

**Documento de diseño** | Performance Agent  
**Versión:** 3.0  
**Fecha:** Marzo 2025

---

## 1. Visión

**Workspace** es donde se ejecutan los escaneos para encontrar problemas de performance.  
**Session History** es el historial de escaneos realizados.

Las **métricas** (CPU, memoria, disco, red, latencia de app, throughput, errores, etc.) son datos de observabilidad — como Datadog. Se pueden **ver siempre**, sin que el agente ejecute un escaneo. El usuario necesita un lugar dedicado para visualizar y explorar esas métricas en tiempo real e histórico.

Este documento define un **Centro de Métricas** como destino principal — independiente de Workspace y Session History — para ver datos de performance en vivo y por rango de tiempo.

---

## 2. Inventario de métricas (tools existentes)

Los tools exponen métricas con `VisualizationSpec`. La taxonomía real del backend:

### 2.1 Nivel sistema (SYSTEM)

| Categoría | Tools | Qué miden |
|-----------|-------|-----------|
| **CPU** | load_average, cpu_utilization, cpu_per_core, cpu_saturation, cpu_interrupts, cpu_scheduling | Carga, uso por núcleo, saturaciones, interrupciones |
| **Memory** | memory_utilization, memory_pressure, oom_kills | Uso RAM, presión, OOMs |
| **Disk** | disk_saturation, disk_throughput | Saturación, throughput |
| **Network** | network_connections, network_throughput, network_errors, network_interface_errors | Conexiones, throughput, errores |
| **Kernel** | kernel_metrics, system_limits | Métricas del kernel, límites |
| **File System** | filesystem | Uso por filesystem |
| **Virtualization** | virtualization_metrics | Métricas en entornos virtualizados |

### 2.2 Nivel aplicación (APPLICATION)

| Categoría | Tools | Qué miden |
|-----------|-------|-----------|
| **Latency** | application_latency | Latencia de la app |
| **Throughput** | application_throughput | Throughput de la app |
| **Errors** | application_errors | Errores de la app |
| **Threading** | threading_metrics, process_thread_cpu, process_thread_memory | Threads, CPU/memoria por thread |
| **CPU (app)** | process_cpu, process_cpu_affinity | CPU del proceso target |
| **Memory (app)** | process_memory, process_thread_memory | Memoria del proceso |
| **I/O (app)** | process_io, process_open_files | I/O y archivos abiertos |
| **Runtime** | runtime_specific | Métricas del runtime (JVM, Node, etc.) |

### 2.3 Tools sin visualización (no métricas)

- `readonly_command`, `report_problem`, `request_user_info`, `log_reasoning` — no producen gráficos.

---

## 3. Decisión de producto: Centro de Métricas

### 3.1 Destino principal: `/metrics`

Un **Centro de Métricas** como sección independiente en la navegación principal. No está dentro de Workspace ni de Session History.

**Flujo conceptual:**

Las métricas funcionan como en Datadog u otros APMs: **se pueden ver siempre**, sin que el agente ejecute un escaneo.

```
Usuario va a /metrics
         ↓
Ve métricas en tiempo real (CPU, memoria, disco, red, app, etc.)
         ↓
Puede explorar histórico (por rango de tiempo, comparativas, etc.)
```

No hay dependencia con sesiones ni escaneos del agente. Las métricas se recolectan de forma continua (o bajo demanda) y el Centro de Métricas las muestra — real-time e histórico — de forma independiente.

**Selección de vista:**

- **Live** / **Real-time**: métricas actuales, actualización continua.
- **Histórico**: selector de rango de tiempo (última hora, 24h, 7 días, rango custom). Los datos se consultan para ese periodo.

### 3.2 Dual lens: Sistema vs Aplicación

Separación clara según `MetricLevel`:

| Lens | Alcance | Usuario típico |
|------|---------|----------------|
| **Sistema** | CPU, Memory, Disk, Network, Kernel, File System, Virtualization | DevOps, SRE, diagnóstico de infra |
| **Aplicación** | Latency, Throughput, Errors, Threading, CPU/Memory/IO del proceso | Desarrolladores, performance engineers |

### 3.3 Arquitectura de navegación: Sidebar + Tabs

**Decisión:** Sidebar izquierdo para el lens principal + tabs horizontales para categorías.

| Opción | Pros | Contras |
|--------|------|---------|
| **Solo tabs** | Simple | Con muchas categorías se satura; no escala |
| **Solo sidebar** | Jerarquía clara | Ocupa espacio vertical constante |
| **Sidebar + Tabs** ✓ | Lens fijo visible; categorías en una fila; escalable | Requiere dos niveles de nav |

**Estructura elegida:**

- **Sidebar (nivel 1):** `[Sistema]` | `[Aplicación]` — toggle o pills, siempre visible.
- **Tabs (nivel 2):** Categorías según el lens activo — horizontal, scroll si muchas.
- **Contenido principal:** Cards + gráficos; scroll vertical.

**Rationale:** Patrón estándar en Datadog, Grafana, AWS CloudWatch. El usuario cambia de lens con un clic; las categorías quedan a la vista sin profundizar en menús.

---

## 4. Selector de target: Procesos y aplicaciones

En el lens **Aplicación**, las métricas dependen de un **proceso target**. El usuario debe poder elegir qué proceso/aplicación observar.

### 4.1 Ubicación

- En la parte superior del contenido (debajo del banner de Live/Histórico), solo visible cuando lens = Aplicación.
- Componente: dropdown o combobox con búsqueda.

### 4.2 Flujo

```
Usuario selecciona lens [Aplicación]
         ↓
Aparece "Proceso target: [Seleccionar proceso ▼]"
         ↓
Usuario abre dropdown → lista de procesos corriendo (PID, nombre, usuario)
         ↓
Selecciona uno → se cargan métricas de ese proceso
         ↓
(Puede cambiar de proceso en cualquier momento)
```

### 4.3 Comportamiento

- **Por defecto:** Si hay un solo proceso monitoreado o uno reciente, pre-seleccionar.
- **Lista:** Nombre del proceso, PID, % CPU reciente (ordenado por uso).
- **Buscar:** Filtro por nombre (ej. "node", "java").
- **Estado vacío:** "No hay procesos monitoreados. Configura un target en Configuration."

### 4.4 Persistencia

- Recordar último proceso seleccionado por usuario (localStorage o preferencias).
- En URL: `/metrics?lens=app&process=12345` para deep-linking.

---

## 5. Clasificación de valores: Low / Medium / High

Cada métrica numérica se clasifica en un estado para feedback visual inmediato.

### 5.1 Estados

| Estado | Label | Color | Uso |
|--------|-------|-------|-----|
| **Low** | OK / Bajo | Verde (`#10b981`) | Dentro de lo esperado |
| **Medium** | Atención / Medio | Ámbar (`#f59e0b`) | Revisar, posible degradación |
| **High** | Crítico / Alto | Rojo (`#ef4444`) | Requiere acción |
| **Unknown** | — | Gris | Sin umbral definido o sin dato |

### 5.2 Umbrales por tipo de métrica (basados en SRE/DevOps)

| Métrica | Unidad | Low (OK) | Medium (Atención) | High (Crítico) |
|---------|--------|----------|-------------------|----------------|
| CPU utilization | % | &lt; 70 | 70–90 | &gt; 90 |
| Memory utilization | % | &lt; 70 | 70–85 | &gt; 85 |
| Load average (1m) | — | &lt; cores | cores – 2×cores | &gt; 2×cores |
| Disk utilization | % | &lt; 80 | 80–90 | &gt; 90 |
| Disk I/O wait | % | &lt; 10 | 10–30 | &gt; 30 |
| Network errors | count | 0 | 1–10 | &gt; 10 |
| Network throughput | % of capacity | &lt; 70 | 70–90 | &gt; 90 |
| Latency (p95) | ms | &lt; baseline×1.5 | 1.5–3× | &gt; 3× baseline |
| Error rate | % | &lt; 0.1 | 0.1–1 | &gt; 1 |
| OOM kills | count | 0 | — | ≥ 1 |

### 5.3 Representación visual

- **MetricCard:** Borde o badge con el color del estado; valor en negrita.
- **Gauge / RadialBar:** Color del arco según valor (verde → ámbar → rojo).
- **Serie temporal:** Línea con color si se cruza umbral; o bandas de fondo (zona verde/ámbar/roja).
- **Tooltip:** Mostrar estado explícito: "CPU: 72% — Atención (umbral &gt; 70%)".

### 5.4 Configuración

- Umbrales configurables en Configuration (futuro).
- Valores por defecto según tabla anterior.

---

## 6. Análisis con IA (varita mágica)

Cada gráfico o card de métrica incluye un botón para que un agente analice los datos y sugiera mejoras.

### 6.1 Ubicación

- Icono discreto en la esquina superior derecha de cada card/gráfico: ✨ o `"Analizar"`.
- Tooltip: "Analizar con IA y obtener recomendaciones".

### 6.2 Flujo

```
Usuario ve un gráfico (ej. CPU % en el tiempo)
         ↓
Hace clic en [✨ Analizar]
         ↓
Se abre panel lateral o modal con estado "Analizando..."
         ↓
Agente recibe: nombre de métrica, valores actuales, tendencia, contexto (sistema vs app, proceso)
         ↓
Agente responde: diagnóstico breve + recomendaciones
         ↓
Usuario ve texto formateado; puede copiar o exportar
```

### 6.3 Prompt sugerido (contexto al agente)

```
Analiza esta métrica de performance:
- Métrica: {metricName}
- Categoría: {category} ({lens})
- Valores actuales: {currentValues}
- Tendencia (últimos puntos): {trendData}
- Target: {processName o "sistema"}

Proporciona:
1. Diagnóstico en 1-2 oraciones
2. Posibles causas si hay degradación
3. 2-4 recomendaciones concretas para mejorar
Formato conciso, bullets.
```

### 6.4 UI del panel de análisis

- Panel deslizante desde la derecha (400px) o modal centrado.
- Header: "Análisis: {nombre del gráfico}".
- Cuerpo: texto del agente con formato (bullets, negrita).
- Footer: "Cerrar" | "Copiar" | "Exportar a nota".

---

## 7. Estructura del Centro de Métricas

### 7.1 Información de contexto (siempre visible)

En la parte superior:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Centro de Métricas                                                   │
│                                                                      │
│ Vista: [Live ●] [Histórico]   |   Rango: [Últimas 24h ▼]   |   Actualizado: hace 5s │
│                                                                      │
│ (En Live: datos en tiempo real. En Histórico: selector de periodo.)  │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Vista por categoría

Tabs horizontales según el lens activo:

**Sistema:** `[CPU] [Memory] [Disk] [Network] [Kernel] [File System] [Virtualization]`  
**Aplicación:** `[Latency] [Throughput] [Errors] [Threading] [CPU] [Memory] [I/O] [Runtime]`

No todas las categorías tendrán datos siempre; las vacías se muestran deshabilitadas o colapsadas.

### 7.3 Layout por categoría (ejemplo: CPU en Sistema)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Sistema]  [Aplicación]                                              │
│ [CPU] [Memory] [Disk] [Network] [Kernel] [File System] [Virtualization] │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│ Resumen rápido (KPIs extraídos del último snapshot)                  │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                  │
│ │ Load Avg     │ │ CPU %        │ │ Run queue    │                  │
│ │ 1.2 0.8 0.5  │ │    45%       │ │    2         │                  │
│ │ ▂▃▅▇▅▃▂     │ │ ▂▃▄▅▃▂     │ │ —            │  ← Valor + sparkline opcional
│ └──────────────┘ └──────────────┘ └──────────────┘                  │
│                                                                      │
│ Tendencias en el tiempo (si hay múltiples snapshots)                 │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ CPU % en el tiempo                                               │ │
│ │ [TimeSeriesChart — línea o área]                                 │ │
│ │ X: tiempo relativo, Y: valor                                     │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│ Snapshots detallados (por tool)                                      │
│ Cada tool con visualization muestra sus gráficos:                    │
│ • load_average       → bar                                          │
│ • cpu_utilization    → radialBar / donut                            │
│ • cpu_per_core       → bar horizontal por núcleo                    │
│ • cpu_saturation     → radialBar                                    │
│ • …                                                                  │
│ [DynamicMetricsChart reutilizado para donut, bar, radialBar]  [✨]   │  ← Botón Analizar con IA
└─────────────────────────────────────────────────────────────────────┘
```

---

## 8. Definición de pantallas y flujos

### 8.1 Pantalla 1: Centro de Métricas — Landing

**Ruta:** `/metrics`

**Layout:**
```
┌────────────────────────────────────────────────────────────────────────────┐
│ [Logo] Performance Agent                                                    │
├──────────┬─────────────────────────────────────────────────────────────────┤
│          │ Centro de Métricas                                               │
│ Sistema  │ Vista: [Live ●] [Histórico]   Rango: [24h ▼]   Actualizado: 5s   │
│ Aplicación├─────────────────────────────────────────────────────────────────┤
│          │ [CPU] [Memory] [Disk] [Network] [Kernel] [FS] [Virt]  ← Tabs     │
│          ├─────────────────────────────────────────────────────────────────┤
│          │ ┌─────────┐ ┌─────────┐ ┌─────────┐                             │
│          │ │ Load OK │ │ CPU Med │ │ Mem OK  │  ← Summary cards (con estado) │
│          │ │ 1.2 0.8 │ │  72%    │ │  58%    │     [✨] en cada card         │
│          │ └─────────┘ └─────────┘ └─────────┘                             │
│          │ ┌─────────────────────────────────────────────────────────────┐ │
│          │ │ CPU % en el tiempo                              [✨ Analizar]│ │
│          │ │ [TimeSeriesChart]                                            │ │
│          │ └─────────────────────────────────────────────────────────────┘ │
│          │ ┌──────────────────────┐ ┌──────────────────────┐  [✨]         │
│          │ │ load_average         │ │ cpu_utilization      │               │
│          │ │ [BarChart]           │ │ [RadialBar]          │               │
│          │ └──────────────────────┘ └──────────────────────┘               │
└──────────┴─────────────────────────────────────────────────────────────────┘
```

**Flujos:**
1. **Entrada:** Usuario hace clic en "Métricas" en nav → carga `/metrics` con Sistema + CPU por defecto.
2. **Cambiar lens:** Clic en "Aplicación" → aparece selector "Proceso target" + tabs de aplicación.
3. **Cambiar categoría:** Clic en tab (Memory, Disk, etc.) → contenido se actualiza.
4. **Cambiar vista:** Live ↔ Histórico → datos se recargan.
5. **Analizar:** Clic en ✨ → panel lateral con análisis del agente.

**Estados:**
- **Loading:** Skeletons en cards y gráficos.
- **Empty:** Mensaje "Sin datos para este periodo. Prueba otro rango o Live."
- **Error:** Banner "Error al cargar métricas" + botón Reintentar.

---

### 8.2 Pantalla 2: Centro de Métricas — Lens Aplicación

**Misma ruta:** `/metrics` con `lens=application`

**Layout:** Igual que Pantalla 1, con:
- Sidebar: "Aplicación" seleccionado.
- **Nuevo:** Barra "Proceso target: [node (PID 1234) ▼]" debajo del banner.
- Tabs: [Latency] [Throughput] [Errors] [Threading] [CPU] [Memory] [I/O] [Runtime].

**Flujos:**
1. **Seleccionar proceso:** Abrir dropdown → buscar o scroll → elegir proceso → métricas se cargan.
2. **Sin procesos:** Mensaje "No hay procesos monitoreados. Configura un target en Configuration."
3. **Resto:** Igual que Pantalla 1 (cambiar tabs, Live/Histórico, Analizar).

---

### 8.3 Pantalla 3: Panel de análisis con IA

**Contexto:** Se abre al hacer clic en ✨ en cualquier gráfico.

**Layout:**
```
┌─────────────────────────────────────────┐
│ Análisis: CPU % — Sistema        [×]    │
├─────────────────────────────────────────┤
│ Analizando...                           │
│ (o)                                     │
│ Diagnóstico: CPU en 72%, por encima     │
│ del umbral óptimo (70%).                │
│                                         │
│ Posibles causas:                        │
│ • Proceso intensivo en ejecución        │
│ • Falta de afinidad de CPU              │
│                                         │
│ Recomendaciones:                        │
│ • Revisar top procesos (process_cpu)    │
│ • Considerar escalar horizontalmente    │
│ • Ajustar límites de CPU si en K8s      │
├─────────────────────────────────────────┤
│ [Copiar] [Exportar]           [Cerrar]  │
└─────────────────────────────────────────┘
```

**Flujos:**
1. **Apertura:** Clic en ✨ → panel desliza desde la derecha.
2. **Carga:** Spinner "Analizando..." mientras el agente responde.
3. **Resultado:** Texto formateado; usuario lee, copia o exporta.
4. **Cierre:** Clic en × o fuera del panel.

---

### 8.4 Diagrama de flujo consolidado

```
                    ┌──────────────┐
                    │  /metrics    │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │ Lens: Sistema (default) │
              └────────────┬────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   [Tab CPU]         [Tab Memory]        [Tab Disk] ...
        │                  │                  │
        └──────────────────┴──────────────────┘
                           │
                    Contenido: cards + charts
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
  Cambiar a         Cambiar vista       Clic [✨]
  Lens App          Live/Histórico      Analizar
        │                  │                  │
        ▼                  │                  ▼
  Proceso target     Recarga datos     Panel IA
  [dropdown]                              
```

---

## 9. Representación visual recomendada

### 9.1 Por tipo de dato

| Tipo de dato | Gráfico | Ejemplo de tool |
|--------------|---------|-----------------|
| Valor actual (%, MB, ms) | **RadialBar / Gauge** | cpu_utilization, memory_utilization |
| Distribución (partes de un todo) | **Donut** | memory (used/cached/free), disk por filesystem |
| Top-N (procesos, núcleos, interfaces) | **HorizontalBar** | process_cpu, cpu_per_core, filesystem |
| Serie temporal | **Area / Line** | Tendencia de CPU%, Memory%, etc. en el tiempo |
| Comparativa multi-periodo | **Multi-line** | Mismo métrico en distintos rangos o hosts |

### 9.2 Cards de resumen

- Valor actual grande y legible.
- Unidad explícita (%, MB, ms).
- Sparkline pequeño con los últimos N puntos cuando exista serie temporal.
- Color por umbral (verde / ámbar / rojo) si aplica (ej. CPU > 80%).

### 9.3 Snapshots detallados

- Cada tool con `VisualizationSpec` se muestra en un card con título (nombre del tool legible).
- Se reutiliza `DynamicMetricsChart` (donut, bar, radialBar).
- Orden lógico: primero overview (utilization, load), luego desgloses (per-core, per-process).

---

## 10. Real-time vs Histórico

### 10.1 Mismo UI, diferente fuente de datos

| Aspecto | Live / Real-time | Histórico |
|---------|------------------|-----------|
| Origen | Streaming continuo o polling | API por rango de tiempo |
| Actualización | Continua | Datos fijos para el periodo seleccionado |
| Indicador | Badge "Live" + última actualización | Rango de tiempo visible |
| Interacción | Solo lectura | Zoom, comparativas (futuro) |

### 10.2 Cambio de vista

- El usuario alterna entre **Live** y **Histórico** según necesite.
- En Histórico, cambia el rango de tiempo (1h, 24h, 7d, custom) para ver distintos periodos.

---

## 11. Acceso al Centro de Métricas

- **Navegación principal**: entrada directa en el menú lateral, p. ej. "Métricas" o "Metrics".
- El Centro de Métricas es **independiente**: el usuario puede ir cuando quiera para ver métricas Live o Histórico, sin pasar por Workspace ni Session History.

---

## 12. Librerías y componentes

### 12.1 Mantener

- **ApexCharts** para donut, bar, radialBar — ya integrado en `DynamicMetricsChart`.
- **Recharts** para series temporales (AreaChart, LineChart) — ideal para time-series.

### 12.2 Agregar

- Tipo `area` en `DynamicMetricsChart` (o componente separado `TimeSeriesChart` con Recharts) para tendencias.
- Componente `MetricCard` reutilizable: valor, unidad, sparkline opcional, color por umbral.

---

## 13. Árbol de componentes propuesto

```
MetricsPage (/metrics)
├── MetricsContextBanner (Live/Histórico, rango de tiempo, última actualización)
├── MetricsLensTabs [Sistema | Aplicación]
├── ProcessTargetSelector (solo si lens = Aplicación)
├── CategoryTabs (CPU, Memory, Disk, … según lens)
├── MetricsCategoryView
│   ├── SummaryCards (MetricCard × N)
│   ├── TimeSeriesChart (tendencia agregada cuando hay serie)
│   └── ToolSnapshots (por cada tool con visualization)
│       └── DynamicMetricsChart (donut, bar, radialBar) + [✨ Analizar]
└── TimeRangeSelector (Live / Histórico + rango de tiempo)
└── MetricsAnalysisPanel (slide-over: análisis IA por gráfico)
```

Componentes compartidos:

- `MetricCard`: valor, unidad, sparkline, umbral.
- `TimeSeriesChart`: AreaChart/LineChart con Recharts.
- `DynamicMetricsChart`: existente.

---

## 14. Flujo de datos

### 14.1 Live / Real-time

```
Recolector de métricas (continuo o polling)
  → Almacenamiento / API
    → Frontend consulta o recibe stream
      → Agrupa por categoría (CPU, Memory, etc.)
        → Renderiza SummaryCards, TimeSeriesChart, DynamicMetricsChart
```

*Nota: La implementación concreta dependerá del backend — si existe un metrics collector independiente o se reutiliza la infraestructura actual de tools. El modelo UX es: métricas siempre disponibles, sin depender de sesiones/escaneos.*

### 14.2 Histórico

```
Usuario selecciona rango de tiempo
  → GET /metrics?from=...&to=...
    → Datos agregados por periodo
      → Misma lógica de render que Live
```

### 14.3 Agregación para series temporales

- Agrupar por `toolName` / categoría.
- Extraer `(timestamp, value)` para cada métrica.
- Para comparativas: normalizar por tiempo o por host/target.

---

## 15. Fases de implementación sugeridas

### Fase 1 — Base

- Ruta `/metrics` y página `MetricsPage`.
- `TimeRangeSelector` (Live / Histórico + rango) + carga de datos.
- `MetricsLensTabs` (Sistema | Aplicación) y `CategoryTabs` básicos.
- Mapeo `ToolCategory` → pestaña de categoría.
- Render de snapshots con `DynamicMetricsChart` por tool.

### Fase 2 — Resumen y tendencias

- `MetricCard` con valor y unidad.
- `TimeSeriesChart` para tendencias (Recharts).
- Lógica de agregación `(timestamp, value)` por tool/field.
- Sparklines en cards (opcional).

### Fase 3 — Integración

- Entrada "Métricas" en navegación principal.
- Estados vacíos, loading, error.

### Fase 4 — Refinamientos

- Clasificación Low/Medium/High por umbral (tabla sección 5).
- Botón "Analizar con IA" (✨) en cada gráfico + panel de análisis.
- Selector de proceso target en lens Aplicación.
- Export CSV/JSON.

---

## 16. Checklist de calidad

- [ ] Accesibilidad: etiquetas en ejes, aria-labels, contraste.
- [ ] Responsive: gráficos adaptativos.
- [ ] Estados: loading, vacío, error.
- [ ] Dark mode: paleta coherente con el tema.
- [ ] Performance: memoización, throttle en actualizaciones real-time.
- [ ] Tests: agregación de datos; E2E para flujos principales.

---

## Anexo — Mapeo ToolCategory → UI

| ToolCategory | Lens | Tab |
|--------------|------|-----|
| CPU | Sistema | CPU |
| MEMORY | Sistema | Memory |
| DISK | Sistema | Disk |
| NETWORK | Sistema | Network |
| KERNEL | Sistema | Kernel |
| FILE_SYSTEM | Sistema | File System |
| VIRTUALIZATION | Sistema | Virtualization |
| APPLICATION_CPU | Aplicación | CPU |
| APPLICATION_MEMORY | Aplicación | Memory |
| APPLICATION_IO | Aplicación | I/O |
| APPLICATION_LATENCY | Aplicación | Latency |
| APPLICATION_THROUGHPUT | Aplicación | Throughput |
| APPLICATION_ERRORS | Aplicación | Errors |
| APPLICATION_THREADING | Aplicación | Threading |
| RUNTIME_SPECIFIC | Aplicación | Runtime |
