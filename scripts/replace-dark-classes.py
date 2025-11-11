#!/usr/bin/env python3
"""
Script to replace all apple-dark-* classes with HEX values in SettingsPage.tsx
"""

import re
from pathlib import Path

# Mapowanie klas na wartości HEX
CLASS_TO_HEX = {
    # Background colors
    'dark:bg-apple-dark-bg-primary': 'dark:bg-[#1c1c1e]',
    'dark:bg-apple-dark-bg-secondary': 'dark:bg-[#2c2c2e]',
    'dark:bg-apple-dark-bg-tertiary': 'dark:bg-[#38383a]',
    
    # Text colors
    'dark:text-apple-dark-text-primary': 'dark:text-[#ffffff]',
    'dark:text-apple-dark-text-secondary': 'dark:text-[#98989d]',
    'dark:text-apple-dark-text-tertiary': 'dark:text-[#636366]',
    
    # Border colors
    'dark:border-apple-dark-border-default': 'dark:border-[#38383a]',
    
    # Accent colors
    'dark:text-apple-dark-accent-blue': 'dark:text-[#0a84ff]',
    'dark:bg-apple-dark-accent-blue': 'dark:bg-[#0a84ff]',
    'dark:focus:border-apple-dark-accent-blue': 'dark:focus:border-[#0a84ff]',
    'dark:focus:ring-apple-dark-accent-blue/20': 'dark:focus:ring-[#0a84ff]/20',
    
    'dark:text-apple-dark-accent-green': 'dark:text-[#30d158]',
    'dark:bg-apple-dark-accent-green': 'dark:bg-[#30d158]',
    
    'dark:text-apple-dark-accent-red': 'dark:text-[#ff453a]',
    'dark:bg-apple-dark-accent-red': 'dark:bg-[#ff453a]',
    
    'dark:text-apple-dark-accent-orange': 'dark:text-[#ff9f0a]',
    
    # Placeholder
    'dark:placeholder-apple-dark-text-tertiary': 'dark:placeholder-[#636366]',
    
    # Hover states
    'dark:hover:bg-apple-dark-bg-primary': 'dark:hover:bg-[#1c1c1e]',
    'dark:hover:bg-apple-dark-bg-tertiary': 'dark:hover:bg-[#38383a]',
}

def replace_classes(file_path: Path):
    """Replace all apple-dark-* classes with HEX values"""
    print(f"Processing {file_path}...")
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    replacements = 0
    
    # Replace each class
    for old_class, new_class in CLASS_TO_HEX.items():
        count = content.count(old_class)
        if count > 0:
            print(f"  Replacing '{old_class}' ({count} occurrences)")
            content = content.replace(old_class, new_class)
            replacements += count
    
    if content != original_content:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"✅ Successfully replaced {replacements} class occurrences")
    else:
        print("⚠️ No apple-dark-* classes found")

def main():
    # Find all .tsx and .css files
    client_src = Path(__file__).parent.parent / 'client' / 'src'
    
    if not client_src.exists():
        print(f"❌ Directory not found: {client_src}")
        return
    
    # Process all .tsx files
    tsx_files = list(client_src.rglob('*.tsx'))
    css_files = list(client_src.rglob('*.css'))
    
    all_files = tsx_files + css_files
    
    if not all_files:
        print("❌ No .tsx or .css files found")
        return
    
    print(f"Found {len(all_files)} files to process\n")
    
    for file_path in all_files:
        replace_classes(file_path)
    
    print("\n✅ Done! All apple-dark-* classes replaced with HEX values.")

if __name__ == '__main__':
    main()
