# Debug Analysis Task

This task provides instructions for systematic debugging and issue resolution. Pika MUST follow these instructions to systematically identify, analyze, and resolve code bugs, system issues, and logic problems.

## Purpose

To systematically debug and resolve issues through methodical analysis, root cause identification, and direct implementation of fixes while maintaining comprehensive documentation of the resolution process.

## Scope Coverage

- **Code Bugs**: Syntax errors, logic issues, runtime errors, type mismatches
- **System Issues**: Build failures, dependency conflicts, configuration problems, environment issues  
- **Logic Problems**: Algorithm issues, performance problems, incorrect business logic implementation

## SEQUENTIAL Debug Execution (Do not proceed until current step is complete)

### 1. Issue Context Gathering

- **Problem Description Analysis**:
  - Parse user's description of the issue
  - Identify affected components/files mentioned
  - Note any error messages provided
  - Understand expected vs actual behavior

- **Error Information Collection**:
  - Look for stack traces or error logs
  - Identify browser console errors (if frontend)
  - Check terminal/build output for errors
  - Gather any relevant screenshots or error details provided

- **Environment Context**:
  - Determine which environment issue occurs in (dev, staging, prod)
  - Check browser/platform specificity (if applicable)
  - Identify recent changes that might be related
  - Note any relevant system/dependency versions

### 2. Codebase Investigation

- **Affected File Analysis**:
  - Examine the primary files mentioned in the issue
  - Check import/export statements for issues
  - Review recent commits affecting these files
  - Look for syntax or obvious logic errors

- **Related Code Analysis**:
  - Trace code execution path to identify all affected components
  - Check parent/child components or calling functions
  - Examine shared utilities or services involved
  - Review database queries or API calls if applicable

- **Pattern Analysis**:
  - Look for similar issues in the codebase
  - Check for recurring patterns that might indicate root cause
  - Examine how similar functionality works elsewhere
  - Identify any breaking changes in dependencies

### 3. Root Cause Identification

- **Systematic Hypothesis Testing**:
  - Generate 2-3 most likely causes based on analysis
  - Test each hypothesis systematically
  - Use process of elimination to narrow down
  - Consider both obvious and subtle potential causes

- **Common Issue Categories**:
  
  **Code Bugs**:
  - Syntax errors (missing semicolons, brackets, etc.)
  - Type mismatches or undefined variables
  - Incorrect function calls or parameter passing
  - Logic errors in conditionals or loops
  - Missing imports or incorrect paths
  
  **System Issues**:
  - Missing dependencies or version conflicts
  - Configuration file errors
  - Environment variable issues
  - Build tool configuration problems
  - Port conflicts or permission issues
  
  **Logic Problems**:
  - Incorrect algorithm implementation
  - Race conditions or timing issues
  - State management problems
  - Incorrect business logic implementation
  - Performance bottlenecks

### 4. Solution Design

- **Approach Selection**:
  - Choose most appropriate fix based on root cause
  - Consider impact on existing functionality
  - Ensure solution follows detected coding standards
  - Plan for minimal disruption to codebase

- **User Input Solicitation** (for complex cases):
  - Present multiple viable solutions if applicable
  - Ask for user preference on implementation approach
  - Confirm understanding of requirements
  - Get approval for significant changes

- **Solution Validation**:
  - Verify solution addresses root cause
  - Check for potential side effects
  - Ensure compatibility with existing code patterns
  - Confirm adherence to project standards

### 5. Fix Implementation

- **Direct Code Changes**:
  - Implement fix directly in affected files
  - Follow discovered coding standards and patterns
  - Maintain consistent code style
  - Add appropriate comments if needed

- **Configuration Updates** (if applicable):
  - Update configuration files as needed
  - Modify build scripts if necessary
  - Adjust environment variables if required
  - Update package dependencies if needed

- **Additional Safety Measures**:
  - Implement proper error handling
  - Add input validation if missing
  - Include logging for debugging future issues
  - Ensure graceful failure modes

### 6. Fix Verification

- **Immediate Testing**:
  - Test the specific issue that was reported
  - Verify error messages are resolved
  - Check that functionality works as expected
  - Test edge cases related to the fix

- **Regression Testing** (basic):
  - Verify related functionality still works
  - Test common user workflows
  - Check that no new errors are introduced
  - Validate performance hasn't degraded

- **Build Verification**:
  - Ensure project still builds successfully
  - Check for any new linting errors
  - Verify all imports/exports work correctly
  - Confirm no breaking changes introduced

### 7. Comprehensive Resolution Report

Generate detailed resolution documentation:

```markdown
⚡ ISSUE RESOLVED

## Problem Identified
[Clear description of the exact issue found]

## Root Cause Analysis
[Detailed explanation of why the issue occurred]
- Primary cause: [main reason]  
- Contributing factors: [additional factors if any]
- Why it wasn't caught: [if applicable]

## Investigation Process
[Brief summary of how the issue was identified]
- Files analyzed: [list of files examined]
- Debugging steps taken: [key investigation steps]
- Hypotheses tested: [approaches tried]

## Solution Applied
[Detailed explanation of the fix implemented]
- Approach chosen: [why this solution was selected]
- Files modified: [list with brief description of changes]
- Code changes summary: [high-level overview of modifications]

## Technical Details
[Specific technical information about the fix]
- Before: [how code worked before]
- After: [how code works now]
- Key changes: [most important modifications]

## Verification Results
[How the fix was confirmed to work]
- Issue reproduction test: [✅ Pass/❌ Fail]
- Functionality test: [✅ Pass/❌ Fail]
- Regression test: [✅ Pass/❌ Fail]
- Build verification: [✅ Pass/❌ Fail]

## Why This Approach
[Reasoning behind technical decisions made]
- Alternative solutions considered: [if any]
- Benefits of chosen approach: [advantages]
- Long-term maintainability: [sustainability considerations]

## Prevention Recommendations
[Suggestions to prevent similar issues]
- Code review focus areas: [what to watch for]
- Testing improvements: [additional test coverage needed]
- Development practices: [process improvements]

---

📝 Document this solution?
   Default: docs/debug-logs/
   Or specify location (or 'no' to skip):
```

### 8. Documentation Handling

- **User Response Processing**:
  - If "yes" or "docs/debug-logs/": Create file in docs/debug-logs/
  - If custom location specified: Create file at specified location
  - If "no": Skip documentation

- **Documentation File Creation**:
  - Generate filename: `debug-YYYY-MM-DD-brief-description.md`
  - Include full resolution report content
  - Add searchable tags or categories
  - Create directory structure if it doesn't exist

- **Documentation Organization**:
  - Maintain consistent naming convention
  - Include metadata for future searching
  - Link related debug sessions if applicable
  - Update index file if it exists

### 9. Post-Resolution Follow-up

- **User Satisfaction Check**:
  - Confirm issue is fully resolved
  - Ask if additional explanation is needed
  - Check if user wants to review the changes made
  - Offer to explain any complex technical decisions

- **Knowledge Transfer**:
  - Explain any new patterns or techniques used
  - Share debugging methodology if user is interested
  - Provide tips for preventing similar issues
  - Offer to document any reusable solutions

## Debug Quality Standards

**THOROUGHNESS**
- Complete root cause identification
- Comprehensive solution testing
- Full impact assessment
- Detailed documentation

**ACCURACY**  
- Correct problem diagnosis
- Appropriate solution selection
- Minimal side effects
- Verified resolution

**MAINTAINABILITY**
- Clean, readable code changes
- Consistent with project patterns
- Well-documented complex changes
- Future-proof solutions

**COMMUNICATION**
- Clear explanation of findings
- Comprehensive resolution report
- User-friendly technical details
- Actionable prevention recommendations

This systematic approach ensures reliable issue resolution while building knowledge for future debugging scenarios.
