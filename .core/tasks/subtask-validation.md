# Subtask Validation Task

This task provides instructions for validating user-provided subtasks to ensure they are technically feasible, logically sequenced, and complete before execution. Pika MUST follow these instructions to prevent execution of poor-quality or problematic subtasks.

## Purpose

To comprehensively validate user-provided subtasks for technical feasibility, logical sequence, completeness, and scope alignment to ensure successful execution and prevent hallucination or wasted effort.

## SEQUENTIAL Task Execution (Do not proceed until current Task is complete)

### 1. Initial Subtask Assessment

- **Format Recognition**: Identify subtask format provided by user
  - Checkbox format: `- [ ] Task description`
  - Numbered format: `1. Task description`  
  - Bullet format: `- Task description`
  - Mixed format: combination of above

- **Count and Complexity**: Evaluate subtask scope
  - Count total number of subtasks
  - Identify main tasks vs sub-subtasks
  - Assess complexity level of each subtask

### 2. Technical Feasibility Validation

- **File Path Verification**:
  - Check if referenced files actually exist in the codebase
  - Verify directory structures are valid
  - Ensure file extensions match project patterns
  - Flag any invented or incorrect paths

- **Dependency Availability**:
  - Verify imports/libraries referenced are available
  - Check if APIs/endpoints mentioned are accessible
  - Ensure database tables/models referenced exist
  - Validate external service integrations are possible

- **Technology Stack Alignment**:
  - Ensure subtasks use technologies present in the project
  - Flag any technology mismatches (e.g., jQuery in React project)
  - Verify framework-specific patterns are correctly referenced
  - Check version compatibility issues

- **Implementation Feasibility**:
  - Assess if each subtask is actually implementable
  - Identify overly vague or impossible requirements
  - Flag subtasks that require external approvals or resources
  - Check for security or permission issues

### 3. Logical Sequence Validation

- **Dependency Analysis**:
  - Map dependencies between subtasks
  - Identify prerequisite relationships
  - Flag circular dependencies
  - Ensure foundational tasks come first

- **Order Logic Check**:
  - Verify subtasks are in logical implementation order
  - Ensure setup tasks precede usage tasks
  - Check that testing tasks come after implementation
  - Validate that cleanup/deployment tasks are last

- **Blocking Issues**:
  - Identify subtasks that would block others if incomplete
  - Flag subtasks that can't be started until others finish
  - Ensure parallel-executable tasks are properly identified

### 4. Completeness Validation

- **Coverage Analysis**:
  - Check if subtasks actually achieve the stated main goal
  - Identify missing essential steps
  - Look for gaps in the workflow
  - Ensure error handling is addressed

- **Critical Step Detection**:
  - Verify all necessary setup steps are included
  - Check for missing testing requirements
  - Ensure validation steps are present
  - Look for missing documentation updates

- **Edge Case Consideration**:
  - Assess if error conditions are handled
  - Check for user input validation
  - Ensure accessibility considerations if applicable
  - Verify responsive design needs are addressed

### 5. Scope Alignment Validation

- **Goal Alignment**:
  - Verify all subtasks contribute to the main objective
  - Identify any out-of-scope items
  - Flag unnecessary or redundant subtasks
  - Ensure no feature creep

- **Complexity Assessment**:
  - Evaluate if subtask complexity matches the main goal
  - Flag overly simple or overly complex approaches
  - Assess realistic time/effort expectations
  - Check for appropriate granularity

### 6. Quality and Standards Check

- **Best Practices Alignment**:
  - Ensure subtasks follow detected coding standards
  - Check for security best practices inclusion
  - Verify testing standards are met
  - Assess documentation requirements

- **Code Quality Considerations**:
  - Look for linting and formatting requirements
  - Check for proper error handling inclusion
  - Ensure appropriate logging is considered
  - Verify maintainability factors

### 7. Validation Report Generation

Generate a comprehensive validation report:

#### ✅ VALID SUBTASKS (if no issues found)
```
Subtask validation complete! Your subtasks look solid:
✅ All file paths are valid
✅ Dependencies are available  
✅ Logical sequence is correct
✅ All necessary steps included
✅ Scope is well-defined

Ready to execute! Starting with discovery phase...
```

#### ⚠️ ISSUES FOUND (if problems detected)
```
I found some issues with your subtasks:

TECHNICAL ISSUES:
• File path './components/LoginForm.tsx' doesn't exist (should be './src/components/LoginForm.tsx')
• API endpoint '/api/user/login' not found in codebase
• Missing React import in component creation step

LOGICAL SEQUENCE ISSUES:
• Step 3 "Use validation function" comes before Step 5 "Create validation function"  
• Testing step should come after implementation steps
• Missing setup step for required dependencies

COMPLETENESS ISSUES:
• Missing error handling for API failures
• No form validation specified
• Missing accessibility considerations
• No responsive design requirements

SCOPE ISSUES:
• Step 2 "Redesign entire UI" is out of scope for login feature
• Missing: "Add loading states during authentication"

Choose your next step:
1️⃣ Update your task list and I'll re-validate
2️⃣ Let me create a proper plan based on your codebase (Hybrid Approach)

What would you prefer?
```

#### 🔄 RE-VALIDATION PROCESS (if user chooses Option 1)
- Accept updated subtasks from user
- Run validation again with same criteria
- If still issues, provide feedback again
- If valid, proceed to execution
- Maximum 3 validation rounds before suggesting Hybrid Approach

#### 🎯 HYBRID FALLBACK (if user chooses Option 2)
- Acknowledge user's main goal from original subtasks
- Use discovery findings to create proper subtask plan
- Present plan for approval before execution
- Incorporate any valid elements from original subtasks

### 8. Pre-Execution Checklist

Before proceeding to execution, confirm:
- [ ] All technical dependencies are available
- [ ] File paths and structures are valid
- [ ] Logical sequence is optimized
- [ ] All necessary steps are included
- [ ] Scope is clearly defined and achievable
- [ ] Quality standards will be maintained

## Validation Criteria Summary

**TECHNICAL FEASIBILITY**
- Files and paths exist or are logically placed
- Dependencies and libraries are available  
- APIs and services are accessible
- Technology stack is consistent

**LOGICAL SEQUENCE**
- Prerequisites come before dependents
- Setup before usage
- Implementation before testing
- No circular dependencies

**COMPLETENESS**
- All necessary steps included
- Error handling addressed
- Testing requirements covered
- Documentation needs met

**SCOPE ALIGNMENT**
- All subtasks support main goal
- No out-of-scope items
- Appropriate complexity level
- Realistic and achievable

This validation prevents poor execution and ensures high-quality results.
