with open('quire/src/components/workspace/SettingsModal.tsx', 'r') as f:
    content = f.read()

# Add useEffect for theme loading
content = content.replace(
    'import * as Select from "@radix-ui/react-select";',
    'import * as Select from "@radix-ui/react-select";\nimport { useEffect, useState } from "react";'
)

# Replace the component body
start_idx = content.find('export function SettingsModal')
# Just rewrite the whole file, it's easier and safer
