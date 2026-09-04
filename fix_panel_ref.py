import re

with open('src/app/project/[projectId]/page.tsx', 'r') as f:
    content = f.read()

content = content.replace('ImperativePanelHandle', 'PanelImperativeHandle')
content = content.replace('<Panel \n            ref={explorerPanelRef}', '<Panel \n            panelRef={explorerPanelRef}')

with open('src/app/project/[projectId]/page.tsx', 'w') as f:
    f.write(content)
