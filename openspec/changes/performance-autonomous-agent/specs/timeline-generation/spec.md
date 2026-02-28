## ADDED Requirements

### Requirement: Real-time timeline tracking
The system SHALL generate and maintain a real-time timeline that tracks all agent activities, decisions, tool executions, and findings during a scanning session.

#### Scenario: Add timeline entry for tool execution
- **WHEN** the agent executes a tool
- **THEN** the system SHALL add a timeline entry describing what tool was executed and why

#### Scenario: Add timeline entry for problem detection
- **WHEN** the agent detects a performance problem
- **THEN** the system SHALL add a timeline entry describing the detected problem

#### Scenario: Add timeline entry for agent decisions
- **WHEN** the agent makes a decision about next actions
- **THEN** the system SHALL add a timeline entry explaining the decision and reasoning

#### Scenario: Timeline is sent via WebSocket
- **WHEN** a timeline entry is added
- **THEN** the system SHALL send the timeline update to the frontend via WebSocket in real-time

### Requirement: Timeline structure
Timeline entries SHALL include timestamp, activity type, description, relevant metrics (if applicable), and agent reasoning.

#### Scenario: Timeline entry contains required fields
- **WHEN** a timeline entry is created
- **THEN** it SHALL include timestamp, activity type, description, and any relevant context

#### Scenario: Timeline entries are ordered chronologically
- **WHEN** timeline entries are retrieved
- **THEN** they SHALL be ordered chronologically from oldest to newest

### Requirement: Timeline persistence
The system SHALL persist timeline entries to SQLite database for historical review.

#### Scenario: Save timeline to database
- **WHEN** a timeline entry is created
- **THEN** the system SHALL save it to the SQLite database associated with the scanning session

#### Scenario: Retrieve timeline history
- **WHEN** a user requests timeline history for a session
- **THEN** the system SHALL retrieve all timeline entries from the database for that session
