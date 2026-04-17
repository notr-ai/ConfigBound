#!/usr/bin/env node

/**
 * Generates VitePress sidebar configuration from TypeDoc-generated API files.
 * 
 * Reads markdown files from apps/docs/reference/api/, categorizes them by package
 * and symbol type, and generates separate JSON sidebar files for each package.
 * 
 * - TypeDoc must be run first to generate the API markdown files
 * - Expects files at: apps/docs/reference/api/
 * 
 * OUTPUT:
 * - apps/docs/.vitepress/sidebar-{package}.json for each package
 * 
 * USAGE:
 * npm run docs:api # (automatically chains after TypeDoc)
 */

import { readdirSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_DIR = resolve(__dirname, '../apps/docs/reference/api');
const OUTPUT_DIR = resolve(__dirname, '../apps/docs/.vitepress');
const SCRIPT_NAME = 'generate-api-sidebar';

const CATEGORY_RULES = [
  { pattern: '@config-bound.schema-export', category: 'schema-export' },
  { pattern: '@config-bound.nestjs', category: 'nestjs' },
  { 
    pattern: '@config-bound.config-bound',
    subcategories: [
      { patterns: ['.bind.'], category: 'core', subcategory: 'Binds' },
      { patterns: ['.utilities.errors.'], category: 'core', subcategory: 'Errors' },
      { patterns: ['.configBound.', '.section.', '.element.'], category: 'core', subcategory: 'Core' }
    ]
  }
];

const PACKAGE_OVERVIEW_FILES = new Set([
  '@config-bound.config-bound.md',
  '@config-bound.schema-export.md', 
  '@config-bound.nestjs.md'
]);

function humanizeFilename(filename) {
  // Remove package prefix and extension
  const withoutExt = filename.replace(/\.md$/, '');
  const parts = withoutExt.split('.');
  
  // For files like "@config-bound.nestjs.Class.ConfigBoundModule"
  // Return "ConfigBoundModule"
  if (parts.length > 2) {
    return parts[parts.length - 1];
  }
  
  return withoutExt;
}

function categorizeFile(filename) {
  if (filename === 'index.md') return null;
  
  const withoutExt = filename.replace(/\.md$/, '');
  
  for (const rule of CATEGORY_RULES) {
    if (withoutExt.startsWith(rule.pattern)) {
      if (rule.subcategories) {
        for (const sub of rule.subcategories) {
          if (sub.patterns.some(p => withoutExt.includes(p))) {
            return { category: sub.category, subcategory: sub.subcategory };
          }
        }
      } else {
        return { category: rule.category, subcategory: null };
      }
    }
  }
  
  return null;
}

function getItemType(item) {
  if (item.text.includes('Package Overview')) return 'Package Overview';
  
  const match = item.link.match(/\.(Class|Interface|Function|TypeAlias)\./);
  return match ? match[1] : 'Other';
}

function sortApiItems(items) {
  const order = ['Package Overview', 'Class', 'Interface', 'Function', 'TypeAlias'];
  return items.sort((a, b) => {
    const aType = getItemType(a);
    const bType = getItemType(b);
    
    const aIndex = order.indexOf(aType);
    const bIndex = order.indexOf(bType);
    
    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }
    
    return a.text.localeCompare(b.text);
  });
}

function main() {
  let files;
  try {
    files = readdirSync(API_DIR).filter(f => f.endsWith('.md'));
  } catch (error) {
    console.error(`[${SCRIPT_NAME}] Error: Cannot read API directory at ${API_DIR}`);
    console.error('Make sure TypeDoc has been run first: npm run docs:api');
    process.exit(1);
  }
  
  // Structure: { category: { subcategory: [items] } }
  const categories = {
    core: { Core: [], Binds: [], Errors: [] },
    'schema-export': { null: [] },
    nestjs: { null: [] }
  };
  
  for (const file of files) {
    const result = categorizeFile(file);
    if (!result) continue;
    
    const { category, subcategory } = result;
    const isPackageOverview = file.includes('Package Overview') || PACKAGE_OVERVIEW_FILES.has(file);
    const title = isPackageOverview ? 'Package Overview' : humanizeFilename(file);
    
    const item = {
      text: title,
      link: `/reference/api/${file.replace(/\.md$/, '')}`
    };
    
    // Ensure category and subcategory exist
    if (!categories[category]) {
      categories[category] = {};
    }
    if (!categories[category][subcategory]) {
      categories[category][subcategory] = [];
    }
    
    categories[category][subcategory].push(item);
  }
  
  // Write separate sidebar file for each package
  const packagesWritten = [];
  for (const [packageName, subcategories] of Object.entries(categories)) {
    // Sort items within each subcategory
    for (const subcatKey in subcategories) {
      subcategories[subcatKey] = sortApiItems(subcategories[subcatKey]);
    }
    
    // Build sidebar config based on whether there are subcategories
    let sidebarConfig;
    const hasSubcategories = Object.keys(subcategories).length > 1 || 
                              (Object.keys(subcategories).length === 1 && Object.keys(subcategories)[0] !== 'null');
    
    if (hasSubcategories) {
      // Multiple subcategories - create sections
      const actualPackageName = getActualPackageName(packageName);
      sidebarConfig = Object.entries(subcategories)
        .filter(([_, items]) => items.length > 0)
        .map(([subcatName, items], index) => ({
          text: index === 0 ? `@config-bound/${actualPackageName}` : subcatName,
          items: items
        }));
    } else {
      // Single category without subcategories
      const items = subcategories[null] || [];
      if (items.length === 0) continue;
      
      sidebarConfig = [
        {
          text: getPackageTitle(packageName),
          items: items
        }
      ];
    }
    
    if (sidebarConfig.length === 0) continue;
    
    const outputFile = resolve(OUTPUT_DIR, `sidebar-${packageName}.json`);
    const totalItems = Object.values(subcategories).reduce((sum, items) => sum + items.length, 0);
    
    try {
      writeFileSync(outputFile, JSON.stringify(sidebarConfig, null, 2) + '\n', 'utf-8');
      packagesWritten.push({ name: packageName, count: totalItems, file: outputFile });
    } catch (error) {
      console.error(`[${SCRIPT_NAME}] Error: Cannot write output file at ${outputFile}`);
      console.error(error.message);
      process.exit(1);
    }
  }
  
  console.log(`[${SCRIPT_NAME}] Generated ${packagesWritten.length} sidebar files:`);
  for (const pkg of packagesWritten) {
    console.log(`  ${pkg.name}: ${pkg.count} items`);
  }
}

function getActualPackageName(internalName) {
  const packageNames = {
    'core': 'config-bound',
    'schema-export': 'schema-export',
    'nestjs': 'nestjs'
  };
  return packageNames[internalName] || internalName;
}

function getPackageTitle(packageName) {
  const titles = {
    'core': '@config-bound/config-bound',
    'schema-export': '@config-bound/schema-export',
    'nestjs': '@config-bound/nestjs'
  };
  return titles[packageName] || packageName;
}

try {
  main();
} catch (error) {
  console.error(`[${SCRIPT_NAME}] Unexpected error:`, error);
  process.exit(1);
}
