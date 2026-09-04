import re

with open('src/app/project/[projectId]/page.tsx', 'r') as f:
    content = f.read()

content = content.replace('onCollapse={() => {\\n              setIsExplorerCollapsed(true);\\n              localStorage.setItem(\\'quire:sidebar-collapsed\\', \\'true\\');\\n            }}\\n            onExpand={() => {\\n              setIsExplorerCollapsed(false);\\n              localStorage.setItem(\\'quire:sidebar-collapsed\\', \\'false\\');\\n            }}', 
'''onResize={(size) => {
              const collapsed = size === 0;
              if (collapsed !== isExplorerCollapsed) {
                setIsExplorerCollapsed(collapsed);
                localStorage.setItem('quire:sidebar-collapsed', collapsed.toString());
              }
            }}''')

with open('src/app/project/[projectId]/page.tsx', 'w') as f:
    f.write(content)
