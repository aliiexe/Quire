import path from "path";

export function getSafePath(baseDir: string, targetPath: string): string {
  // Prevent directory traversal
  const normalizedPath = path.normalize(targetPath).replace(/^(\.\.(\/|\\|$))+/, "");
  const resolvedPath = path.resolve(baseDir, normalizedPath);
  
  // Ensure the resolved path is within the base directory
  if (!resolvedPath.startsWith(path.resolve(baseDir))) {
    throw new Error("Invalid path: Path traversal detected");
  }
  
  return resolvedPath;
}
