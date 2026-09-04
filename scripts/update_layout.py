with open('quire/src/app/layout.tsx', 'r') as f:
    content = f.read()

script = """<script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('quire:theme');
                if (theme === 'dark' || theme === 'light') {
                  document.documentElement.setAttribute('data-theme', theme);
                } else {
                  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                }
              } catch (e) {}
            `,
          }}
        />"""

# Insert before closing head or after opening body
body_idx = content.find('<body')
if body_idx != -1:
    end_tag_idx = content.find('>', body_idx)
    content = content[:end_tag_idx+1] + '\n        ' + script + content[end_tag_idx+1:]
    
with open('quire/src/app/layout.tsx', 'w') as f:
    f.write(content)
