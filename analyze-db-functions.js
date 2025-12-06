#!/usr/bin/env node

/**
 * Static Analysis of Database Functions
 * Analyzes code to identify potential issues without connecting to database
 */

import fs from 'fs';
import path from 'path';

console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║  STATIC DATABASE FUNCTIONS ANALYSIS              ║');
console.log('║  ByteClinic Application                          ║');
console.log('╚═══════════════════════════════════════════════════╝\n');

const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalComponents: 0,
    componentsWithDbAccess: 0,
    totalDbOperations: 0,
    potentialIssues: 0
  },
  components: [],
  tables: {},
  potentialIssues: []
};

// Database tables from migrations
const knownTables = [
  'bookings',
  'repairs',
  'reviews',
  'profiles',
  'notifications',
  'diagnoses',
  'central_requests',
  'customers'
];

// Analyze a file for database operations
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const componentName = path.basename(filePath, path.extname(filePath));
  
  const analysis = {
    file: filePath,
    component: componentName,
    dbOperations: [],
    tables: new Set(),
    issues: []
  };
  
  // Find all .from() calls
  const fromRegex = /\.from\(['"`](\w+)['"`]\)/g;
  let match;
  while ((match = fromRegex.exec(content)) !== null) {
    const tableName = match[1];
    analysis.tables.add(tableName);
    
    if (!knownTables.includes(tableName)) {
      analysis.issues.push({
        type: 'UNKNOWN_TABLE',
        table: tableName,
        message: `Reference to unknown table: ${tableName}`
      });
    }
  }
  
  // Find CRUD operations
  const operations = {
    select: /\.select\(/g,
    insert: /\.insert\(/g,
    update: /\.update\(/g,
    delete: /\.delete\(/g,
    upsert: /\.upsert\(/g
  };
  
  for (const [op, regex] of Object.entries(operations)) {
    const matches = content.match(regex);
    if (matches) {
      analysis.dbOperations.push({
        operation: op,
        count: matches.length
      });
      report.summary.totalDbOperations += matches.length;
    }
  }
  
  // Check for error handling
  const hasErrorHandling = content.includes('error') && (
    content.includes('catch') || 
    content.includes('if (error)') || 
    content.includes('if(error)')
  );
  
  if (analysis.dbOperations.length > 0 && !hasErrorHandling) {
    analysis.issues.push({
      type: 'MISSING_ERROR_HANDLING',
      message: 'Database operations without proper error handling'
    });
  }
  
  // Check for RLS considerations
  const hasAuthCheck = content.includes('auth.uid()') || content.includes('user_id');
  if (analysis.dbOperations.length > 0 && !hasAuthCheck && !content.includes('anon')) {
    analysis.issues.push({
      type: 'POTENTIAL_RLS_ISSUE',
      message: 'No authentication checks found for database operations'
    });
  }
  
  // Check for proper async/await usage
  const hasAsync = content.includes('async ') || content.includes('async(');
  const hasAwait = content.includes('await ');
  if (analysis.dbOperations.length > 0 && (!hasAsync || !hasAwait)) {
    analysis.issues.push({
      type: 'ASYNC_ISSUE',
      message: 'Database operations may not be using async/await properly'
    });
  }
  
  return analysis;
}

// Scan directory recursively
function scanDirectory(dir, extensions = ['.jsx', '.js', '.ts', '.tsx']) {
  const files = [];
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(item)) {
        files.push(...scanDirectory(fullPath, extensions));
      }
    } else if (extensions.includes(path.extname(item))) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Main analysis
console.log('📂 Scanning source files...\n');

const srcDir = path.join(process.cwd(), 'src');
const files = scanDirectory(srcDir);

console.log(`Found ${files.length} source files\n`);
console.log('─'.repeat(50));

for (const file of files) {
  const analysis = analyzeFile(file);
  
  if (analysis.dbOperations.length > 0 || analysis.tables.size > 0) {
    report.summary.componentsWithDbAccess++;
    report.components.push(analysis);
    
    console.log(`\n📄 ${analysis.component}`);
    console.log(`   File: ${path.relative(process.cwd(), file)}`);
    
    if (analysis.tables.size > 0) {
      console.log(`   Tables: ${Array.from(analysis.tables).join(', ')}`);
      
      // Track table usage
      for (const table of analysis.tables) {
        if (!report.tables[table]) {
          report.tables[table] = {
            components: [],
            operations: 0
          };
        }
        report.tables[table].components.push(analysis.component);
        report.tables[table].operations += analysis.dbOperations.reduce((sum, op) => sum + op.count, 0);
      }
    }
    
    if (analysis.dbOperations.length > 0) {
      console.log(`   Operations:`);
      for (const op of analysis.dbOperations) {
        console.log(`     - ${op.operation}: ${op.count}`);
      }
    }
    
    if (analysis.issues.length > 0) {
      report.summary.potentialIssues += analysis.issues.length;
      console.log(`   ⚠️  Issues:`);
      for (const issue of analysis.issues) {
        console.log(`     - ${issue.type}: ${issue.message}`);
        report.potentialIssues.push({
          component: analysis.component,
          file: file,
          ...issue
        });
      }
    } else {
      console.log(`   ✅ No issues detected`);
    }
  }
  
  report.summary.totalComponents++;
}

// Print table usage summary
console.log('\n\n╔═══════════════════════════════════════════════════╗');
console.log('║  TABLE USAGE SUMMARY                             ║');
console.log('╚═══════════════════════════════════════════════════╝\n');

for (const [table, info] of Object.entries(report.tables)) {
  const isKnown = knownTables.includes(table);
  const status = isKnown ? '✅' : '❌';
  console.log(`${status} ${table}`);
  console.log(`   Operations: ${info.operations}`);
  console.log(`   Used by: ${info.components.length} components`);
  if (!isKnown) {
    console.log(`   ⚠️  WARNING: Table not found in migrations!`);
  }
  console.log('');
}

// Check for tables in migrations but not used in code
console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║  UNUSED TABLES                                   ║');
console.log('╚═══════════════════════════════════════════════════╝\n');

const usedTables = Object.keys(report.tables);
const unusedTables = knownTables.filter(t => !usedTables.includes(t));

if (unusedTables.length > 0) {
  console.log('⚠️  The following tables are defined but not used in the code:');
  for (const table of unusedTables) {
    console.log(`   - ${table}`);
  }
} else {
  console.log('✅ All defined tables are being used');
}

// Print summary
console.log('\n\n╔═══════════════════════════════════════════════════╗');
console.log('║  SUMMARY                                         ║');
console.log('╚═══════════════════════════════════════════════════╝\n');

console.log(`📊 Total Components Analyzed: ${report.summary.totalComponents}`);
console.log(`💾 Components with DB Access: ${report.summary.componentsWithDbAccess}`);
console.log(`🔧 Total DB Operations: ${report.summary.totalDbOperations}`);
console.log(`⚠️  Potential Issues: ${report.summary.potentialIssues}`);
console.log(`📋 Tables Used: ${Object.keys(report.tables).length}`);

// Print critical issues
if (report.potentialIssues.length > 0) {
  console.log('\n\n╔═══════════════════════════════════════════════════╗');
  console.log('║  CRITICAL ISSUES                                 ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  const criticalIssues = report.potentialIssues.filter(i => 
    i.type === 'UNKNOWN_TABLE' || i.type === 'MISSING_ERROR_HANDLING'
  );
  
  if (criticalIssues.length > 0) {
    console.log(`Found ${criticalIssues.length} critical issues:\n`);
    for (const issue of criticalIssues) {
      console.log(`❌ ${issue.component}`);
      console.log(`   ${issue.type}: ${issue.message}`);
      console.log(`   File: ${path.relative(process.cwd(), issue.file)}\n`);
    }
  }
}

// Recommendations
console.log('\n╔═══════════════════════════════════════════════════╗');
console.log('║  RECOMMENDATIONS                                 ║');
console.log('╚═══════════════════════════════════════════════════╝\n');

const recommendations = [];

if (report.summary.potentialIssues > 0) {
  recommendations.push('⚠️  Fix identified issues in database operations');
}

if (unusedTables.length > 0) {
  recommendations.push('📋 Consider removing unused table definitions or implement features using them');
}

const missingErrorHandling = report.potentialIssues.filter(i => i.type === 'MISSING_ERROR_HANDLING');
if (missingErrorHandling.length > 0) {
  recommendations.push(`⚠️  Add proper error handling to ${missingErrorHandling.length} components`);
}

const unknownTables = report.potentialIssues.filter(i => i.type === 'UNKNOWN_TABLE');
if (unknownTables.length > 0) {
  recommendations.push(`❌ Fix references to ${unknownTables.length} unknown tables`);
}

if (recommendations.length === 0) {
  console.log('✅ No critical recommendations. Database functions appear well-structured!');
} else {
  recommendations.forEach((rec, i) => {
    console.log(`${i + 1}. ${rec}`);
  });
}

// Save report
const reportPath = '/tmp/db-analysis-report.json';
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(`\n💾 Detailed report saved to: ${reportPath}`);

// Exit with error code if critical issues found
const hasCriticalIssues = report.potentialIssues.some(i => 
  i.type === 'UNKNOWN_TABLE' || i.type === 'MISSING_ERROR_HANDLING'
);

process.exit(hasCriticalIssues ? 1 : 0);
