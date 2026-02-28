## ADDED Requirements

### Requirement: AI-powered form generation
The system SHALL use OpenAI API to dynamically generate Formly form schemas based on the agent's need for additional information during debugging.

#### Scenario: Generate form when agent needs information
- **WHEN** the agent determines it needs additional information from the user
- **THEN** the system SHALL use OpenAI API to generate a Formly-compatible form schema

#### Scenario: Form schema is context-aware
- **WHEN** a form is generated
- **THEN** the form schema SHALL be based on the current debugging context and what information would be most helpful

#### Scenario: Form includes appropriate field types
- **WHEN** a form is generated
- **THEN** it SHALL include appropriate Formly field types (text, number, select, checkbox, etc.) based on the information needed

### Requirement: Formly-compatible output
Generated form schemas SHALL be in valid Formly format that can be directly rendered by the Angular Formly integration.

#### Scenario: Generated schema is valid Formly format
- **WHEN** a form schema is generated
- **THEN** it SHALL be in valid Formly JSON format with fields, types, and validation rules

#### Scenario: Form includes labels and descriptions
- **WHEN** a form is generated
- **THEN** it SHALL include user-friendly labels and descriptions for each field

### Requirement: Form context and reasoning
The system SHALL include context about why the form is being requested and how the information will be used.

#### Scenario: Form includes explanation
- **WHEN** a form is generated
- **THEN** it SHALL include an explanation of why the agent needs this information

#### Scenario: Form context is sent with schema
- **WHEN** a form is sent to the frontend
- **THEN** it SHALL include the form schema along with context and reasoning
