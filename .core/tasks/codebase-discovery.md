# Codebase Discovery Task

This task provides instructions for systematic codebase analysis and standards detection. Pika MUST follow these instructions to understand the project context before any code generation.

## Purpose

To comprehensively analyze the existing codebase, detect technology stack, identify coding patterns, and understand project structure to ensure generated code follows existing conventions and maintains consistency.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Project Structure Analysis

- **Root Analysis**: Examine root directory files for project type indicators
  - `package.json` → Node.js/JavaScript project
  - `requirements.txt` or `pyproject.toml` → Python project
  - `composer.json` → PHP project
  - `Gemfile` → Ruby project
  - `pom.xml` or `build.gradle` → Java project
  - `Cargo.toml` → Rust project
  - `.csproj` or `*.sln` → .NET project

- **Framework Detection**: Look for framework-specific files and directories
  - `next.config.js`, `pages/` → Next.js
  - `nuxt.config.js` → Nuxt.js
  - `angular.json` → Angular
  - `vue.config.js` → Vue.js
  - `src/App.js`, `public/index.html` → Create React App
  - `manage.py` → Django
  - `app.py` → Flask
  - `config/application.rb` → Rails

- **Source Code Organization**: Identify directory structure patterns
  - `/src`, `/lib`, `/app` directories
  - Component organization patterns
  - Test file locations and naming
  - Asset and static file locations

### 2. Technology Stack Detection

- **Frontend Technologies**: 
  - JavaScript/TypeScript detection
  - CSS framework identification (Tailwind, Bootstrap, Material-UI, etc.)
  - State management (Redux, Zustand, Context API, etc.)
  - Build tools (Webpack, Vite, Parcel, etc.)

- **Backend Technologies**:
  - Server framework identification
  - Database connections and ORMs
  - API patterns (REST, GraphQL, etc.)
  - Authentication methods

- **Development Tools**:
  - Linting configurations (ESLint, Prettier, TSLint, etc.)
  - Testing frameworks (Jest, Mocha, Pytest, etc.)
  - Version control patterns

### 3. Coding Standards Detection

- **Configuration Files Analysis**:
  - `.eslintrc.*` → JavaScript/TypeScript linting rules
  - `.prettierrc.*` → Code formatting standards
  - `tsconfig.json` → TypeScript configuration
  - `pyproject.toml` or `setup.cfg` → Python standards
  - `editorconfig` → General formatting rules

- **Existing Code Pattern Analysis**:
  - Examine 2-3 representative files from each major directory
  - Identify naming conventions (camelCase, snake_case, PascalCase, etc.)
  - Function/class organization patterns
  - Import/export patterns
  - Comment and documentation styles
  - Error handling patterns

- **File Naming Conventions**:
  - Component file naming patterns
  - Test file naming conventions  
  - Asset file organization
  - Configuration file patterns

### 4. Architecture Pattern Recognition

- **Component Architecture** (Frontend):
  - Atomic design patterns
  - Container/Presentational component separation
  - Custom hooks usage patterns
  - State management patterns

- **Service Architecture** (Backend):
  - Layer separation patterns
  - Repository patterns
  - Service layer organization
  - API endpoint organization

- **Testing Patterns**:
  - Test file organization
  - Testing utility patterns
  - Mock and fixture patterns

### 5. Standards Documentation Loading

- **Project Documentation**:
  - Look for `CONTRIBUTING.md`, `README.md`
  - Search for `docs/` directory with coding standards
  - Check for custom coding guidelines

- **Load Pika Standards** (if available):
  - Load relevant standards from `.core/standards/`
  - Match detected tech stack with available standard files
  - Merge project-specific and Pika general standards

### 6. Discovery Report Generation

Generate a comprehensive discovery report including:

#### Technology Stack Summary
- **Primary Language**: [detected language and version]
- **Framework**: [detected framework and version]  
- **Build Tools**: [build system and tools]
- **Package Manager**: [npm, yarn, pip, etc.]

#### Coding Standards Detected
- **Naming Conventions**: [patterns found]
- **Code Organization**: [directory and file patterns]
- **Linting Rules**: [active linting configurations]
- **Formatting Standards**: [prettier, autopep8, etc.]

#### Architecture Patterns
- **Component Patterns**: [how components are structured]
- **State Management**: [detected patterns]
- **Testing Approach**: [testing framework and patterns]
- **API Patterns**: [REST, GraphQL, etc.]

#### File Organization
- **Source Structure**: [how source code is organized]
- **Test Structure**: [how tests are organized]  
- **Asset Organization**: [static files, images, etc.]

#### Recommendations for Code Generation
- **File Placement**: Where new files should be created
- **Naming Patterns**: How to name new files and functions
- **Import Patterns**: How to structure imports/requires
- **Code Style**: Specific style guidelines to follow

#### Confidence Level
- **High**: Clear patterns detected, consistent codebase
- **Medium**: Some patterns detected, minor inconsistencies  
- **Low**: Minimal codebase or inconsistent patterns

### 7. Context Preparation

- **Template Preparation**: Identify which code templates from `.core/templates/` are applicable
- **Standards Preparation**: Prepare relevant standards for quick reference during code generation
- **Pattern Examples**: Extract 1-2 good examples of existing code to use as reference

## Execution Notes

- **Be Thorough**: Better to over-analyze than miss important patterns
- **Document Uncertainty**: If patterns are unclear, note this for user confirmation
- **Ask When Unsure**: If critical patterns are ambiguous, ask user for clarification
- **Save Context**: Keep discovery findings available for entire session

This discovery phase ensures all generated code will be consistent with existing project patterns and maintains high quality standards.
