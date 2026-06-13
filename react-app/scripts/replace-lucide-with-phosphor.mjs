#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'fs';
import { glob } from 'glob';

const iconMappings = {
  'CheckCircle': 'CheckCircle',
  'CheckCircle2': 'CheckCircle',
  'XCircle': 'XCircle',
  'Info': 'Info',
  'X': 'X',
  'Settings': 'Gear',
  'Volume2': 'SpeakerHigh',
  'Video': 'Video',
  'VideoOff': 'VideoSlash',
  'Monitor': 'Monitor',
  'Bell': 'Bell',
  'Save': 'FloppyDisk',
  'Shield': 'Shield',
  'RotateCcw': 'ArrowCounterClockwise',
  'Check': 'Check',
  'RefreshCw': 'ArrowClockwise',
  'Mic': 'Microphone',
  'MicOff': 'MicrophoneSlash',
  'AlertCircle': 'WarningCircle',
  'Lock': 'Lock',
  'ChevronDown': 'CaretDown',
  'Upload': 'Upload',
  'User': 'User',
  'ArrowRight': 'ArrowRight',
  'Loader2': 'CircleNotch',
  'Radio': 'RadioButton',
  'GripVertical': 'DotsNine',
  'LogIn': 'SignIn',
  'Mail': 'Envelope',
  'Eye': 'Eye',
  'EyeOff': 'EyeSlash',
  'Minimize2': 'ArrowsIn',
  'Maximize2': 'ArrowsOut',
  'Copy': 'Copy',
  'ArrowLeft': 'ArrowLeft',
  'Files': 'Files',
  'AlertTriangle': 'Warning',
  'GripHorizontal': 'DotsNine',
  'Trash2': 'Trash',
  'Play': 'Play',
  'Clock': 'Clock',
  'Image': 'Image',
  'Blend': 'Gradient',
  'Type': 'TextT',
  'Palette': 'Palette',
  'Download': 'Download',
  'Edit': 'PencilSimple',
  'ExternalLink': 'ArrowSquareOut',
};

async function replaceInFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  let modified = false;

  // Replace import statement
  const lucideImportRegex = /import\s+(?:{([^}]+)}|\*\s+as\s+(\w+))\s+from\s+['"]lucide-react['"]/g;
  
  content = content.replace(lucideImportRegex, (match, namedImports, namespaceImport) => {
    modified = true;
    
    if (namespaceImport) {
      // Handle: import * as Icons from 'lucide-react'
      // We'll need to replace this with individual imports based on usage
      console.log(`⚠️  ${filePath}: Found namespace import, needs manual review`);
      return match; // Keep for now, will handle separately
    }
    
    if (namedImports) {
      // Handle: import { Icon1, Icon2 } from 'lucide-react'
      const icons = namedImports.split(',').map(i => i.trim());
      const mappedIcons = icons.map(icon => {
        const cleanIcon = icon.replace(/\s+as\s+\w+/, ''); // Remove aliases
        const mapped = iconMappings[cleanIcon] || cleanIcon;
        if (cleanIcon !== mapped) {
          console.log(`  ${cleanIcon} → ${mapped}`);
        }
        return icon.includes(' as ') ? icon.replace(cleanIcon, mapped) : mapped;
      });
      
      return `import { ${mappedIcons.join(', ')} } from '@phosphor-icons/react'`;
    }
    
    return match;
  });

  // Replace icon component usages (add weight prop)
  Object.entries(iconMappings).forEach(([lucide, phosphor]) => {
    if (lucide !== phosphor) {
      // Replace component usage with weight prop
      const componentRegex = new RegExp(`<${lucide}([\\s/>])`, 'g');
      content = content.replace(componentRegex, (match, after) => {
        if (!content.includes(`<${phosphor}`)) {
          modified = true;
        }
        return `<${phosphor}${after}`;
      });
    }
  });

  // Add default weight="regular" to Phosphor icons if not specified
  content = content.replace(/<(\w+)\s+([^>]*?)(\/>|>)/g, (match, iconName, props, closing) => {
    // Check if this is likely a Phosphor icon and doesn't have weight
    if (Object.values(iconMappings).includes(iconName) && !props.includes('weight=')) {
      const hasProps = props.trim().length > 0;
      return `<${iconName}${hasProps ? ' ' + props : ''}${hasProps && !props.endsWith(' ') ? ' ' : ''}weight="regular"${closing}`;
    }
    return match;
  });

  if (modified) {
    writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated: ${filePath}`);
    return true;
  }
  
  return false;
}

async function main() {
  const files = await glob('src/**/*.{ts,tsx}', { 
    cwd: '/Users/billyribeiro/Desktop/trading-room-app/wilbur',
    absolute: true 
  });
  
  let updatedCount = 0;
  
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    if (content.includes('lucide-react')) {
      console.log(`\n📝 Processing: ${file}`);
      const updated = await replaceInFile(file);
      if (updated) updatedCount++;
    }
  }
  
  console.log(`\n✨ Complete! Updated ${updatedCount} files.`);
}

main().catch(console.error);
