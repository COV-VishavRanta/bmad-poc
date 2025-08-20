# Database Schema

## User Management Tables

### users
Primary table for system users with role-based access control.

```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('HR', 'PC', 'RM') NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_users_email (email),
    INDEX idx_users_role (role),
    INDEX idx_users_status (status)
);
```

### user_sessions
Session management for authentication tracking.

```sql
CREATE TABLE user_sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_expires (expires_at)
);
```

## Client Management Tables

### clients
Main client/organization table with relationship types.

```sql
CREATE TABLE clients (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    relation_type ENUM('Customer', 'Partner', 'Internal') NOT NULL,
    project_management_tool VARCHAR(100),
    comments TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_clients_status (status),
    INDEX idx_clients_relation_type (relation_type),
    UNIQUE KEY uk_clients_name (name)
);
```

### client_contacts
Contact information for client organizations.

```sql
CREATE TABLE client_contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    role VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    INDEX idx_contacts_client_id (client_id),
    INDEX idx_contacts_email (email)
);
```

### client_history
Audit trail for client changes.

```sql
CREATE TABLE client_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    client_id INT NOT NULL,
    action ENUM('created', 'updated', 'deleted', 'activated', 'deactivated') NOT NULL,
    changed_fields JSON,
    old_values JSON,
    new_values JSON,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_client_history_client_id (client_id),
    INDEX idx_client_history_action (action),
    INDEX idx_client_history_changed_at (changed_at)
);
```

## Project Management Tables

### groups
Project grouping for organizational purposes.

```sql
CREATE TABLE groups (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    client_id INT NOT NULL,
    sow_id INT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (sow_id) REFERENCES sows(id),
    INDEX idx_groups_client_id (client_id),
    INDEX idx_groups_dates (start_date, end_date),
    UNIQUE KEY uk_groups_name_client (name, client_id)
);
```

### projects
Main project tracking table.

```sql
CREATE TABLE projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    client_id INT NOT NULL,
    group_id INT,
    sow_id INT NOT NULL,
    project_type ENUM('Development', 'Maintenance', 'Consulting', 'Support') NOT NULL,
    status ENUM('planned', 'active', 'on_hold', 'completed', 'cancelled') DEFAULT 'planned',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (sow_id) REFERENCES sows(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_projects_client_id (client_id),
    INDEX idx_projects_group_id (group_id),
    INDEX idx_projects_status (status),
    INDEX idx_projects_dates (start_date, end_date)
);
```

### project_history
Audit trail for project changes.

```sql
CREATE TABLE project_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    action ENUM('created', 'updated', 'deleted', 'status_changed') NOT NULL,
    changed_fields JSON,
    old_values JSON,
    new_values JSON,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_project_history_project_id (project_id),
    INDEX idx_project_history_action (action),
    INDEX idx_project_history_changed_at (changed_at)
);
```

## Statement of Work Tables

### sows
Statement of Work definitions with role requirements.

```sql
CREATE TABLE sows (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    client_id INT NOT NULL,
    description TEXT,
    status ENUM('draft', 'active', 'completed', 'cancelled') DEFAULT 'draft',
    start_date DATE,
    end_date DATE,
    total_fte DECIMAL(4,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_sows_client_id (client_id),
    INDEX idx_sows_status (status),
    INDEX idx_sows_dates (start_date, end_date)
);
```

### sow_roles
Role definitions and FTE allocations within SOWs.

```sql
CREATE TABLE sow_roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sow_id INT NOT NULL,
    role_name ENUM('Backend Developer', 'Frontend Developer', 'Designer', 'Tester', 'Business Analyst', 'Architect', 'Project Manager') NOT NULL,
    fte_allocation DECIMAL(4,2) NOT NULL,
    hourly_rate DECIMAL(8,2),
    description TEXT,
    
    FOREIGN KEY (sow_id) REFERENCES sows(id) ON DELETE CASCADE,
    INDEX idx_sow_roles_sow_id (sow_id),
    UNIQUE KEY uk_sow_roles_sow_role (sow_id, role_name)
);
```

### sow_history
Versioned history of SOW changes.

```sql
CREATE TABLE sow_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sow_id INT NOT NULL,
    version_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    changes_description TEXT,
    roles_snapshot JSON,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sow_id) REFERENCES sows(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_sow_history_sow_id (sow_id),
    INDEX idx_sow_history_version (version_number),
    UNIQUE KEY uk_sow_history_sow_version (sow_id, version_number)
);
```

## Team Assignment Tables

### assignments
Team member assignments to projects with FTE tracking.

```sql
CREATE TABLE assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    project_id INT NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    fte_allocation DECIMAL(4,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('planned', 'active', 'completed', 'cancelled') DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_assignments_user_id (user_id),
    INDEX idx_assignments_project_id (project_id),
    INDEX idx_assignments_dates (start_date, end_date),
    INDEX idx_assignments_status (status),
    
    CONSTRAINT chk_fte_range CHECK (fte_allocation BETWEEN 0.1 AND 1.0),
    CONSTRAINT chk_date_order CHECK (start_date <= end_date)
);
```

### assignment_history
Audit trail for assignment changes.

```sql
CREATE TABLE assignment_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    assignment_id INT NOT NULL,
    action ENUM('created', 'updated', 'deleted', 'status_changed') NOT NULL,
    changed_fields JSON,
    old_values JSON,
    new_values JSON,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (assignment_id) REFERENCES assignments(id),
    FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_assignment_history_assignment_id (assignment_id),
    INDEX idx_assignment_history_action (action),
    INDEX idx_assignment_history_changed_at (changed_at)
);
```

## Database Constraints and Rules

### FTE Validation Rules
- Individual assignment FTE must be between 0.1 and 1.0
- Total FTE across all active assignments for a user cannot exceed 1.0 during overlapping periods
- SOW role allocations must match assignment role requirements

### Date Validation Rules
- Project start_date must be <= end_date
- Group date ranges must contain all associated project date ranges
- Assignment dates must fall within project date ranges
- SOW history records must have valid date ranges

### Business Logic Constraints
- Clients with active projects cannot be deleted (only deactivated)
- Only one active SOW per project at a time
- Group names must be unique within each client
- User email addresses must be unique across the system

### Audit Trail Requirements
- All changes to critical entities must be logged in history tables
- History records must include: who made the change, when, what changed, old/new values
- Soft deletes preferred over hard deletes where business continuity is important