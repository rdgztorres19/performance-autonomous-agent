## ADDED Requirements

### Requirement: Formly form rendering
The Angular frontend SHALL integrate Formly to dynamically render forms received from the backend.

#### Scenario: Render form from schema
- **WHEN** the frontend receives a Formly form schema via WebSocket
- **THEN** it SHALL render the form using Formly components

#### Scenario: Form supports all field types
- **WHEN** a form schema includes various field types
- **THEN** the frontend SHALL render all supported Formly field types (text, number, select, checkbox, etc.)

### Requirement: Form submission
The Angular frontend SHALL collect form data and submit it back to the backend via WebSocket.

#### Scenario: Submit form data
- **WHEN** a user completes and submits a form
- **THEN** the frontend SHALL collect the form data and send it to the backend via WebSocket

#### Scenario: Form validation
- **WHEN** a form is submitted
- **THEN** the frontend SHALL validate the form according to Formly validation rules before submission

### Requirement: Form display and UX
Forms SHALL be displayed in a user-friendly manner with Bootstrap styling and clear instructions.

#### Scenario: Form uses Bootstrap styling
- **WHEN** a form is rendered
- **THEN** it SHALL use Bootstrap styling for consistent UI appearance

#### Scenario: Form shows context and explanation
- **WHEN** a form is displayed
- **THEN** it SHALL show the agent's explanation of why the information is needed
