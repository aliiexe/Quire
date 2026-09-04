import { NextResponse } from "next/server";
import { storage } from "@/lib/projects/local-storage";
import AdmZip from "adm-zip";
import path from "path";
import fs from "fs/promises";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    
    if (!file || !name) {
      return NextResponse.json({ error: "Missing file or name" }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Create the project entry first
    const project = await storage.createProject({ name });
    
    // Get the actual project path
    const DEFAULT_WORKSPACE = process.env.QUIRE_WORKSPACE || path.join(process.cwd(), "workspace");
    const projectPath = path.join(DEFAULT_WORKSPACE, project.id);
    
    // Clear the template files created by createProject (except .quire if we want to keep it)
    const existingFiles = await fs.readdir(projectPath);
    for (const f of existingFiles) {
      if (f !== ".quire") {
        await fs.rm(path.join(projectPath, f), { recursive: true, force: true });
      }
    }
    
    // Extract ZIP directly into the project path
    const zip = new AdmZip(buffer);
    
    // Some zips have a top-level directory. We should optionally flatten it if there's exactly one root folder.
    const zipEntries = zip.getEntries();
    
    // Check if there's a single top-level directory
    const topLevelDirs = new Set<string>();
    zipEntries.forEach(entry => {
      const parts = entry.entryName.split('/');
      if (parts.length > 0 && parts[0] !== '') {
        topLevelDirs.add(parts[0]);
      }
    });
    
    const hasSingleRoot = topLevelDirs.size === 1;
    const rootPrefix = hasSingleRoot ? Array.from(topLevelDirs)[0] + '/' : '';
    
    zipEntries.forEach((entry) => {
      // Skip Mac specific files
      if (entry.entryName.includes('__MACOSX') || entry.entryName.includes('.DS_Store')) return;
      
      let targetPath = entry.entryName;
      
      if (hasSingleRoot && targetPath.startsWith(rootPrefix)) {
        targetPath = targetPath.substring(rootPrefix.length);
      }
      
      if (!targetPath) return; // it was just the root dir itself
      
      const fullPath = path.join(projectPath, targetPath);
      
      if (entry.isDirectory) {
        // Handled recursively usually, but just in case
      } else {
        const dir = path.dirname(fullPath);
        // We use fs.mkdirSync via zip.extractAllTo but since we manually handle flattening, we'll do manual extraction
      }
    });

    // Actually it's easier to just extract everything, then check if we need to flatten.
    // For simplicity, let's just extract all, and if there's a single directory, move its contents up.
    
    const tempExtractPath = path.join(projectPath, ".quire", "temp_extract");
    await fs.mkdir(tempExtractPath, { recursive: true });
    
    zip.extractAllTo(tempExtractPath, true); // true = overwrite
    
    // Clean __MACOSX
    await fs.rm(path.join(tempExtractPath, '__MACOSX'), { recursive: true, force: true }).catch(() => {});
    
    // Check for single root folder
    const extractedContents = await fs.readdir(tempExtractPath);
    const validContents = extractedContents.filter(f => f !== '.DS_Store');
    
    let sourcePath = tempExtractPath;
    
    if (validContents.length === 1) {
      const singleItemPath = path.join(tempExtractPath, validContents[0]);
      const stat = await fs.stat(singleItemPath);
      if (stat.isDirectory()) {
        sourcePath = singleItemPath;
      }
    }
    
    // Move contents to projectPath
    const finalContents = await fs.readdir(sourcePath);
    for (const f of finalContents) {
      if (f === '.DS_Store') continue;
      await fs.rename(path.join(sourcePath, f), path.join(projectPath, f));
    }
    
    // Cleanup
    await fs.rm(tempExtractPath, { recursive: true, force: true });
    
    // Try to guess the root file (main.tex, paper.tex, or the first .tex file)
    let rootFile = project.rootFile;
    const allProjectFiles = await fs.readdir(projectPath);
    const texFiles = allProjectFiles.filter(f => f.endsWith('.tex'));
    if (texFiles.length > 0) {
      if (texFiles.includes('main.tex')) rootFile = 'main.tex';
      else if (texFiles.includes('paper.tex')) rootFile = 'paper.tex';
      else rootFile = texFiles[0];
      
      // Update project config
      project.rootFile = rootFile;
      
      const projectJsonPath = path.join(projectPath, ".quire", "project.json");
      await fs.writeFile(projectJsonPath, JSON.stringify(project, null, 2));
    }
    
    return NextResponse.json(project, { status: 201 });
  } catch (error: any) {
    console.error("Import error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
