# Exit Reason Field - Disabled for RPTDBUAT

## Summary
The "Exit Reason" field has been **commented out** (not deleted) in both frontend and backend since this data is not available in RPTDBUAT.

## Changes Made

### 1. Frontend Form (`components/verify/VerificationWizard.jsx`)
- **Line 25**: Commented out `exitReason: ''` in form initialization
- **Line 246**: Updated validation to not check for exitReason (added comment)
- **Lines 537-547**: Commented out the entire Exit Reason form field with JSX comment
- **Line 268**: Commented out `exitReason: formData.exitReason` in submission data
- **Line 298**: Commented out `exitReason: ''` in form reset

### 2. Backend API Routes

#### `app/api/verify/request/route.js`
- **Line 75**: Commented out `calculateFnFStatus()` call, defaulted to `'Pending'`
- **Line 105**: Commented out `exitReason: employee.exitReason` in response
- **Line 208**: Commented out `exitReason: employee.exitReason` in second response
- **Line 268**: Commented out `exitReason: 'Exit Reason'` in getFieldLabel

#### `app/api/reports/generate/route.js`
- **Line 83**: Commented out `exitReason: employee.exitReason` in employee data
- **Line 198**: Commented out `exitReason: employee.exitReason` in second employee data
- **Line 235**: Commented out `exitReason: 'Exit Reason'` in labels

### 3. Validation Schema (`lib/validation.js`)
- **Lines 106-110**: Commented out the entire exitReason validation rule

### 4. Employee Data Service (`lib/services/employeeDataService.js`)
- **Line 121**: `exitReason: row.STATUS_OF_RESIGNATION || ''` - Still mapped but not used

### 5. Comparison Service (`lib/services/comparisonService.js`)
- **Line 20**: Commented out `'exitReason'` in comparison fields array
- **Lines 94-98**: Commented out the entire `case 'exitReason':` block
- **Lines 171-173**: Commented out `case 'exitReason':` in formatValueForDisplay
- **Lines 227-236**: Commented out the entire `formatExitReason()` function
- **Lines 245-267**: Commented out the entire `calculateFnFStatus()` function

## Why Commented Out (Not Deleted)?
1. **Future use**: When RPTDBUAT provides exit reason data, you can uncomment
2. **Preserve logic**: All the validation, formatting, and comparison logic is kept intact
3. **Easy rollback**: Just uncomment the lines to re-enable

## How to Re-enable in Future
1. Search for `// Commented out - not used for RPTDBUAT` or `// Commented out for RPTDBUAT`
2. Remove the `//` comment markers
3. Update the field mapping in `employeeDataService.js` to use `STATUS_OF_RESIGNATION`
4. Test the functionality

## Current Behavior
- Exit Reason field is **hidden** in the frontend form
- API routes return `exitReason: undefined` or commented out
- Comparison service doesn't compare exitReason
- F&F status defaults to `'Pending'` (since exit reason not available)
- Form validation doesn't require exitReason

## Notes
- The field mapping in `employeeDataService.js` still maps `STATUS_OF_RESIGNATION` to `exitReason`
- This data is available in RPTDBUAT but intentionally not used in the UI/comparison
- When you want to use it, just uncomment the relevant sections
