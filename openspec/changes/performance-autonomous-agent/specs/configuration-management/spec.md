## ADDED Requirements

### Requirement: Configuration storage
The system SHALL store user configurations in SQLite database, including connection settings, OpenAI API keys, and scanning preferences.

#### Scenario: Save configuration
- **WHEN** a user updates their configuration
- **THEN** the system SHALL save it to the SQLite database

#### Scenario: Load configuration
- **WHEN** the application starts or user requests configuration
- **THEN** the system SHALL load the configuration from the SQLite database

### Requirement: Connection configuration
The system SHALL manage connection configurations including connection type (local, SSH), SSH credentials (host, port, username, password/key), and connection parameters.

#### Scenario: Save SSH configuration
- **WHEN** a user configures SSH connection
- **THEN** the system SHALL save SSH credentials and parameters securely

#### Scenario: Validate connection configuration
- **WHEN** a connection configuration is saved
- **THEN** the system SHALL validate that all required fields are present

### Requirement: OpenAI API key configuration
The system SHALL manage OpenAI API key configuration, storing it securely and using it for API calls.

#### Scenario: Save OpenAI API key
- **WHEN** a user provides their OpenAI API key
- **THEN** the system SHALL store it securely in the database

#### Scenario: Use OpenAI API key
- **WHEN** the agent needs to call OpenAI API
- **THEN** the system SHALL retrieve the API key from configuration and use it for authentication

### Requirement: Scanning preferences
The system SHALL manage scanning preferences including which metric categories to scan, target processes, and scanning depth.

#### Scenario: Save scanning preferences
- **WHEN** a user configures scanning preferences
- **THEN** the system SHALL save them to the database

#### Scenario: Apply scanning preferences
- **WHEN** a scanning session starts
- **THEN** the system SHALL apply the user's scanning preferences to guide tool selection

### Requirement: Configuration security
The system SHALL handle sensitive configuration data (API keys, passwords) securely.

#### Scenario: Encrypt sensitive data
- **WHEN** sensitive configuration data is stored
- **THEN** the system SHALL encrypt it or use secure storage mechanisms

#### Scenario: API keys not exposed in API responses
- **WHEN** configuration is retrieved via API
- **THEN** sensitive fields like API keys SHALL be excluded or masked
