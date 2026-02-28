## ADDED Requirements

### Requirement: JSON problem report generation
The system SHALL generate JSON output when performance problems are detected. The JSON SHALL include collected metrics, problem description, explanation, severity, and recommendations.

#### Scenario: Generate JSON report on problem detection
- **WHEN** the agent detects a performance problem
- **THEN** the system SHALL generate a JSON report containing the problem details

#### Scenario: JSON includes metrics
- **WHEN** a JSON report is generated
- **THEN** it SHALL include all relevant metrics that led to the problem detection

#### Scenario: JSON includes explanation
- **WHEN** a JSON report is generated
- **THEN** it SHALL include an AI-generated explanation of why the metrics indicate a problem

#### Scenario: JSON includes severity and category
- **WHEN** a JSON report is generated
- **THEN** it SHALL include the problem category and severity level

### Requirement: JSON report structure
JSON reports SHALL follow a consistent structure that includes metadata, metrics, problem description, explanation, and recommendations.

#### Scenario: JSON has consistent structure
- **WHEN** multiple JSON reports are generated
- **THEN** they SHALL all follow the same structure for consistency

#### Scenario: JSON is valid and parseable
- **WHEN** a JSON report is generated
- **THEN** it SHALL be valid JSON that can be parsed by standard JSON parsers

### Requirement: JSON report delivery
JSON reports SHALL be sent to the frontend via WebSocket and persisted to the database.

#### Scenario: Send JSON report via WebSocket
- **WHEN** a JSON report is generated
- **THEN** the system SHALL send it to the frontend via WebSocket in real-time

#### Scenario: Persist JSON report to database
- **WHEN** a JSON report is generated
- **THEN** the system SHALL save it to the SQLite database for historical review
