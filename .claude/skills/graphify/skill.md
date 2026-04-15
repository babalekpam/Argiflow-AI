Build or refresh the codebase dependency graph for this project and save it to `.claude/graph.json`.

## Steps

1. Use `Glob("**/*.{ts,tsx,js,jsx,mjs,cjs,py,go,rs,java,rb,php,cs}")` to collect all source files (exclude `node_modules`, `dist`, `.git`).
2. For each file, use `Grep` to extract local import/require/from lines (lines containing `import` or `require` or `from`), keeping only paths that start with `.` or `..` (i.e. relative imports — skip package imports).
3. Build a graph object:
   ```json
   {
     "generated": "<ISO timestamp>",
     "root": "<basename of cwd>",
     "structure": ["top-level dirs and files from Glob('*')"],
     "files": {
       "relative/path/to/file.ts": {
         "imports": ["./sibling", "../shared/utils"]
       }
     }
   }
   ```
4. Write the result to `.claude/graph.json` using the Write tool.
5. Confirm with a one-line summary:
   > ✓ Graph saved to `.claude/graph.json` — **N files** indexed, **M import edges**.

> Run `/graphify` again whenever the project structure changes significantly (new directories, big refactors).  
> The PreToolUse hook on Glob/Grep will automatically surface this graph to Claude before every file search.
