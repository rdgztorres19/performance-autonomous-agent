## ADDED Requirements

### Requirement: WebSocket gateway setup
The system SHALL provide a NestJS WebSocket gateway for real-time bidirectional communication between the Angular frontend and the backend.

#### Scenario: Establish WebSocket connection
- **WHEN** the Angular frontend connects to the WebSocket gateway
- **THEN** the gateway SHALL establish a WebSocket connection and associate it with a session

#### Scenario: Handle WebSocket disconnection
- **WHEN** a WebSocket client disconnects
- **THEN** the gateway SHALL clean up the connection and notify relevant services

### Requirement: Real-time timeline updates
The WebSocket gateway SHALL broadcast timeline updates to connected clients in real-time.

#### Scenario: Send timeline update
- **WHEN** a timeline entry is created
- **THEN** the gateway SHALL send the timeline update to all connected clients for that session

#### Scenario: Timeline updates are real-time
- **WHEN** timeline entries are created
- **THEN** they SHALL be sent to clients immediately without delay

### Requirement: Real-time problem reports
The WebSocket gateway SHALL broadcast JSON problem reports to connected clients when problems are detected.

#### Scenario: Send problem report
- **WHEN** a problem is detected and JSON report is generated
- **THEN** the gateway SHALL send the JSON report to all connected clients for that session

### Requirement: User interaction messages
The WebSocket gateway SHALL handle sending form requests to clients and receiving form responses from clients.

#### Scenario: Send form request to client
- **WHEN** the agent generates a form and needs user input
- **THEN** the gateway SHALL send the form schema to the client via WebSocket

#### Scenario: Receive form response from client
- **WHEN** a client submits a form response
- **THEN** the gateway SHALL receive the response and forward it to the agent for processing

### Requirement: Session-based messaging
The WebSocket gateway SHALL route messages based on session IDs, ensuring clients only receive messages for their active sessions.

#### Scenario: Messages are session-scoped
- **WHEN** a message is sent via WebSocket
- **THEN** it SHALL only be sent to clients connected to the relevant session

#### Scenario: Multiple clients per session
- **WHEN** multiple clients connect to the same session
- **THEN** all clients SHALL receive the same timeline updates and problem reports
