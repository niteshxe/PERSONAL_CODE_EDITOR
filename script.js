 
      // Add these variables at the top of your script section
      let editor;
      let monacoLoaded = false;
      let currentLanguage = "javascript"; // Default to JavaScript

      // Add these constants at the top of your script section
      const DB_NAME = "code_editor_db";
      const DB_VERSION = 1;
      const STORE_NAME = "files";

      // Add the database initialization functions
      function initDB() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.open(DB_NAME, DB_VERSION);

          request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject(event.target.error);
          };

          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME);
            }
          };

          request.onsuccess = (event) => {
            const db = event.target.result;
            resolve(db);
          };
        });
      }

      function saveToDB() {
        return new Promise(async (resolve, reject) => {
          try {
            const db = await initDB();
            const transaction = db.transaction([STORE_NAME], "readwrite");
            const store = transaction.objectStore(STORE_NAME);

            const request = store.put(fileTree, "fileTree");

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);

            transaction.oncomplete = () => db.close();
          } catch (error) {
            console.error("Save to DB error:", error);
            reject(error);
          }
        });
      }

      function loadFromDB() {
        return new Promise(async (resolve, reject) => {
          try {
            const db = await initDB();
            const transaction = db.transaction([STORE_NAME], "readonly");
            const store = transaction.objectStore(STORE_NAME);

            const request = store.get("fileTree");

            request.onsuccess = () => {
              resolve(request.result || {});
              db.close();
            };

            request.onerror = () => {
              reject(request.error);
              db.close();
            };
          } catch (error) {
            console.error("Load from DB error:", error);
            reject(error);
          }
        });
      }

      // Add this function to reset the database if needed
      function resetDB() {
        return new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(DB_NAME);

          request.onsuccess = () => {
            console.log("Database successfully deleted");
            resolve();
          };

          request.onerror = () => {
            console.error("Error deleting database");
            reject(request.error);
          };
        });
      }

      // Replace the Monaco Editor initialization code
      function initMonaco() {
        return new Promise((resolve, reject) => {
          if (monacoLoaded) {
            resolve(editor);
            return;
          }

          // Load Monaco Editor
          require(["vs/editor/editor.main"], function () {
            try {
              monacoLoaded = true;
              editor = monaco.editor.create(document.getElementById("editor"), {
                value: "",
                language: "javascript",
                theme: "vs-dark",
                automaticLayout: true,
                fontSize: 24,
                minimap: { enabled: true },
                scrollbar: {
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10,
                },
              });

              // Add change listener
              if (editor && editor.getModel()) {
                editor.getModel().onDidChangeContent(() => {
                  if (activeFilePath) {
                    fileTree[activeFilePath] = editor.getValue();
                    saveToDB();
                  }
                });
              }

              resolve(editor);
            } catch (error) {
              console.error("Error creating editor:", error);
              reject(error);
            }
          });
        });
      }

      // File and Editor Management
      const languageMap = {
        js: "javascript",
        html: "html",
        css: "css",
        py: "python",
        json: "json",
        md: "markdown",
      };

      function getLanguage(fileName) {
        const extension = fileName.split(".").pop().toLowerCase();
        return languageMap[extension] || "plaintext";
      }

      function loadFileContent(path) {
        if (!path || path.endsWith("/")) {
          editor.setValue(
            `// Folder: ${path.replace(
              "/",
              ""
            )}\n// This is a placeholder. Click on a file to edit.`
          );
          document
            .querySelectorAll(".file-item")
            .forEach((item) => item.classList.remove("active"));
          activeFilePath = path;
          return;
        }
        if (fileTree.hasOwnProperty(path)) {
          editor.setValue(fileTree[path] || "");
          activeFilePath = path;
          const language = getLanguage(path);
          monaco.editor.setModelLanguage(editor.getModel(), language);

          document.querySelectorAll(".file-item").forEach((item) => {
            item.classList.remove("active");
          });

          const activeEl = document.querySelector(`[data-path='${path}']`);
          if (activeEl) {
            activeEl.classList.add("active");
          }
        }
      }

      function updateFileExplorer() {
        const explorer = document.getElementById("file-tree-container");
        if (!explorer) return;
        explorer.innerHTML = "";

        const filePaths = Object.keys(fileTree).sort();

        function buildTree(paths) {
          const tree = {};
          paths.forEach((path) => {
            const parts = path.split("/").filter((p) => p.length > 0);
            let currentNode = tree;

            parts.forEach((part, index) => {
              const isFolder = index < parts.length - 1 || path.endsWith("/");
              const name = part + (isFolder ? "/" : "");

              if (!currentNode[name]) {
                currentNode[name] = {
                  type: isFolder ? "folder" : "file",
                  name: part,
                  fullPath:
                    parts.slice(0, index + 1).join("/") + (isFolder ? "/" : ""),
                  children: isFolder ? {} : null,
                };
              }

              if (isFolder) {
                currentNode = currentNode[name].children;
              }
            });
          });
          return tree;
        }

        function renderTree(node, parentEl, depth = 0) {
          const indent = depth * 20 + "px";

          for (const key in node) {
            const item = node[key];
            const itemEl = document.createElement("div");
            itemEl.className =
              "file-item " +
              (item.type === "folder" ? "folder-item" : "file-item");
            itemEl.dataset.path = item.fullPath;
            itemEl.style.setProperty("--indent", indent);

            const icon =
              item.type === "folder"
                ? "ri-folder-line"
                : getFileIcon(item.name);
            itemEl.innerHTML = `<span class="file-name"><i class="${icon}"></i>${item.name}</span>`;

            if (item.type === "folder") {
              itemEl.onclick = (e) => {
                e.stopPropagation();
                itemEl.classList.toggle("open");
                const childrenContainer = itemEl.nextElementSibling;
                if (childrenContainer) {
                  childrenContainer.style.display = itemEl.classList.contains(
                    "open"
                  )
                    ? "block"
                    : "none";
                }
              };
              itemEl.oncontextmenu = (e) =>
                showContextMenu(e, "folder", item.fullPath);

              const childrenContainer = document.createElement("div");
              childrenContainer.className = "folder-children";
              parentEl.appendChild(itemEl);
              parentEl.appendChild(childrenContainer);
              renderTree(item.children, childrenContainer, depth + 1);
            } else {
              itemEl.onclick = (e) => {
                e.stopPropagation();
                loadFileContent(item.fullPath);
              };
              itemEl.oncontextmenu = (e) =>
                showContextMenu(e, "file", item.fullPath);
              parentEl.appendChild(itemEl);
            }
          }
        }

        const hierarchicalTree = buildTree(filePaths);
        renderTree(hierarchicalTree, explorer);

        if (activeFilePath) {
          const activeEl = explorer.querySelector(
            `[data-path='${activeFilePath}']`
          );
          if (activeEl) {
            activeEl.classList.add("active");
            let currentPath = activeFilePath;
            while (currentPath.includes("/")) {
              const lastSlashIndex = currentPath.lastIndexOf("/");
              const parentPath = currentPath.substring(0, lastSlashIndex);
              const parentEl = explorer.querySelector(
                `[data-path='${parentPath}/']`
              );
              if (parentEl) {
                parentEl.classList.add("open");
                parentEl.nextElementSibling.style.display = "block";
              }
              currentPath = parentPath;
            }
          }
        }
      }

      function getFileIcon(fileName) {
        const extension = fileName.split(".").pop().toLowerCase();
        switch (extension) {
          case "js":
            return "ri-javascript-fill";
          case "html":
            return "ri-html5-fill";
          case "css":
            return "ri-css3-fill";
          case "json":
            return "ri-json-fill";
          case "py":
            return "ri-file-code-fill";
          case "md":
            return "ri-markdown-fill";
          default:
            return "ri-file-line";
        }
      }

      function addFile(folderPath = "") {
        const fileName = prompt("Enter a filename:", "newFile.js");
        if (fileName) {
          let parentPath = folderPath;
          if (!parentPath) {
            const activeEl = document.querySelector(".file-item.active");
            if (activeEl) {
              const activePath = activeEl.dataset.path;
              if (activePath.endsWith("/")) {
                parentPath = activePath;
              } else {
                parentPath = activePath.substring(
                  0,
                  activePath.lastIndexOf("/") + 1
                );
              }
            }
          }
          const path = parentPath
            ? `${parentPath.replace(/\/$/, "")}/${fileName}`
            : fileName;
          if (fileTree.hasOwnProperty(path)) {
            alert("A file with this name already exists.");
            return;
          }
          fileTree[path] = "";
          activeFilePath = path;
          updateFileExplorer();
          loadFileContent(activeFilePath);
          saveToDB();
        }
      }

      function addFolder(parentPath = "") {
        const folderName = prompt("Enter a folder name:", "newFolder");
        if (folderName) {
          let fullPath = parentPath
            ? `${parentPath.replace(/\/$/, "")}/${folderName}/`
            : `${folderName}/`;
          const folderExists = Object.keys(fileTree).some((key) =>
            key.startsWith(fullPath)
          );
          if (folderExists) {
            alert("A folder with this name already exists.");
            return;
          }
          fileTree[fullPath] = "";
          updateFileExplorer();
          saveToDB();
        }
      }

      function deleteFile(path) {
        if (confirm(`Are you sure you want to delete '${path}'?`)) {
          delete fileTree[path];
          if (activeFilePath === path) {
            activeFilePath = "";
            editor.setValue("");
          }
          updateFileExplorer();
          saveToDB();
        }
      }

      function deleteFolder(path) {
        if (
          confirm(
            `Are you sure you want to delete the folder '${path}' and all its contents?`
          )
        ) {
          const filesToDelete = Object.keys(fileTree).filter((filePath) =>
            filePath.startsWith(path)
          );
          filesToDelete.forEach((filePath) => delete fileTree[filePath]);

          if (activeFilePath.startsWith(path)) {
            activeFilePath = "";
            editor.setValue("");
          }
          updateFileExplorer();
          saveToDB();
        }
      }

      function renameItem(oldPath) {
        const parts = oldPath.split("/");
        const isFolder = oldPath.endsWith("/");
        const oldName = parts[isFolder ? parts.length - 2 : parts.length - 1];
        const parentPath =
          parts
            .slice(0, isFolder ? parts.length - 2 : parts.length - 1)
            .join("/") + (isFolder && parts.length > 2 ? "/" : "");

        const newName = prompt(`Enter new name for '${oldName}':`, oldName);

        if (newName && newName !== oldName) {
          let newPath = parentPath ? `${parentPath}${newName}` : newName;
          if (isFolder) newPath += "/";

          if (fileTree.hasOwnProperty(newPath) && newPath !== oldPath) {
            alert("A file or folder with this name already exists.");
            return;
          }

          const renamedFileTree = {};
          Object.keys(fileTree).forEach((filePath) => {
            if (filePath.startsWith(oldPath)) {
              const newFilePath = newPath + filePath.substring(oldPath.length);
              renamedFileTree[newFilePath] = fileTree[filePath];
            } else {
              renamedFileTree[filePath] = fileTree[filePath];
            }
          });

          fileTree = renamedFileTree;

          if (activeFilePath.startsWith(oldPath)) {
            activeFilePath = newPath + activeFilePath.substring(oldPath.length);
          }
          updateFileExplorer();
          loadFileContent(activeFilePath);
          saveToDB();
        }
      }

      // Context Menu
      const contextMenu = document.getElementById("contextMenu");
      document.addEventListener("click", () => {
        contextMenu.style.display = "none";
      });

      function showContextMenu(e, type, path) {
        e.preventDefault();
        e.stopPropagation();
        contextMenu.innerHTML = "";
        contextMenu.style.display = "block";
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.top = `${e.clientY}px`;

        if (type === "file") {
          contextMenu.innerHTML = `
                    <div class="context-menu-item" onclick="renameItem('${path}')"><i class="ri-edit-line"></i>Rename</div>
                    <div class="context-menu-item" onclick="deleteFile('${path}')"><i class="ri-delete-bin-line"></i>Delete File</div>
                `;
        } else if (type === "folder") {
          contextMenu.innerHTML = `
                    <div class="context-menu-item" onclick="addFile('${path}')"><i class="ri-file-add-line"></i>Add File</div>
                    <div class="context-menu-item" onclick="addFolder('${path}')"><i class="ri-folder-add-line"></i>Add Folder</div>
                    <hr>
                    <div class="context-menu-item" onclick="renameItem('${path}')"><i class="ri-edit-line"></i>Rename Folder</div>
                    <div class="context-menu-item" onclick="deleteFolder('${path}')"><i class="ri-delete-bin-line"></i>Delete Folder</div>
                `;
        }
      }

      // UI Interactions
      function changeLanguage() {
        currentLanguage = document.getElementById("languageSelector").value;
        if (editor) {
          monaco.editor.setModelLanguage(editor.getModel(), currentLanguage);
        }
      }

      function displayOutput(output, type = "log") {
        const consoleDiv = document.getElementById("console");
        if (!consoleDiv) return;

        let outputElement;
        const lineBreak = document.createTextNode("\n");

        if (typeof output === "object" && output !== null) {
          try {
            output = JSON.stringify(output, null, 2);
          } catch (e) {
            output = String(output);
          }
        } else {
          output = String(output);
        }

        if (type === "error") {
          outputElement = document.createElement("span");
          outputElement.className = "error";
          outputElement.textContent = output;
        } else if (type === "warn") {
          outputElement = document.createElement("span");
          outputElement.className = "warning";
          outputElement.textContent = output;
        } else {
          outputElement = document.createTextNode(output);
        }

        consoleDiv.appendChild(outputElement);
        consoleDiv.appendChild(lineBreak);
        consoleDiv.scrollTop = consoleDiv.scrollHeight;
      }

      // Add the console output helper function
      function appendToConsole(type, args) {
        const consoleOutput = document.getElementById("console-output");
        if (!consoleOutput) return;

        const output = document.createElement("div");
        output.className = "console-item";

        let icon = "";
        switch (type) {
          case "error":
            icon = "❌";
            output.classList.add("error");
            break;
          case "warn":
            icon = "⚠️";
            output.classList.add("warning");
            break;
          case "info":
            icon = "ℹ️";
            output.classList.add("info");
            break;
          default:
            icon = "📋";
            break;
        }

        const message = args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
          )
          .join(" ");

        output.innerHTML = `<span class="console-icon">${icon}</span><span class="console-text">${message}</span>`;
        consoleOutput.appendChild(output);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
      }

      (function () {
        const originalConsoleLog = console.log;
        const originalConsoleError = console.error;
        const originalConsoleWarn = console.warn;
        const originalConsoleClear = console.clear;

        console.log = function (...args) {
          const message = args
            .map((arg) =>
              typeof arg === "object"
                ? JSON.stringify(arg, null, 2)
                : String(arg)
            )
            .join(" ");
          displayOutput(message, "log");
          originalConsoleLog.apply(console, args);
        };

        console.error = function (...args) {
          const message = args
            .map((arg) =>
              arg instanceof Error ? arg.stack || arg.message : String(arg)
            )
            .join(" ");
          displayOutput(message, "error");
          originalConsoleError.apply(console, args);
        };

        console.warn = function (...args) {
          const message = args.map((arg) => String(arg)).join(" ");
          displayOutput(message, "warn");
          originalConsoleWarn.apply(console, args);
        };

        console.clear = function () {
          clearConsole();
          originalConsoleClear.apply(console);
        };
      })();

      // Replace or add the runCode function
      function runCode() {
        try {
          // Get the code from editor
          const code = editor.getValue();

          // Clear previous console output
          const consoleOutput = document.getElementById("console-output");
          if (consoleOutput) {
            consoleOutput.innerHTML = "";
          }

          // Override console methods to capture output
          const originalLog = console.log;
          const originalError = console.error;
          const originalWarn = console.warn;
          const originalInfo = console.info;

          console.log = (...args) => {
            originalLog.apply(console, args);
            appendToConsole("log", args);
          };
          console.error = (...args) => {
            originalError.apply(console, args);
            appendToConsole("error", args);
          };
          console.warn = (...args) => {
            originalWarn.apply(console, args);
            appendToConsole("warn", args);
          };
          console.info = (...args) => {
            originalInfo.apply(console, args);
            appendToConsole("info", args);
          };

          // Execute the code
          eval(code);

          // Restore console methods
          console.log = originalLog;
          console.error = originalError;
          console.warn = originalWarn;
          console.info = originalInfo;
        } catch (error) {
          // Handle errors
          appendToConsole("error", [error.message]);
          console.error("Execution error:", error);
        }
      }

      function updateFontSize() {
        fontSize = parseInt(document.getElementById("fontSize").value);
        if (editor) {
          editor.updateOptions({ fontSize: fontSize });
        }
      }

      function importFolder() {
        const input = document.getElementById("folderInput");
        input.click();

        input.onchange = (e) => {
          const files = e.target.files;
          if (!files || files.length === 0) return;

          const newFileTree = {};
          const promises = [];

          fileTree = {};
          activeFilePath = "";

          for (const file of files) {
            const promise = new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = (event) => {
                newFileTree[file.webkitRelativePath] = event.target.result;
                resolve();
              };
              reader.onerror = reject;
              reader.readAsText(file);
            });
            promises.push(promise);
          }

          Promise.all(promises)
            .then(() => {
              fileTree = newFileTree;
              const firstFilePath = Object.keys(fileTree).sort()[0];
              if (firstFilePath) {
                activeFilePath = firstFilePath;
              }
              updateFileExplorer();
              loadFileContent(activeFilePath);
              saveToDB();
            })
            .finally(() => {
              input.value = null;
            });
        };
      }

      // Replace the export folder function
      async function exportFolder() {
        try {
          // Check if there are files to export
          if (Object.keys(fileTree).length === 0) {
            alert("No files to export.");
            return;
          }

          // Verify JSZip is loaded
          if (typeof JSZip === "undefined") {
            throw new Error("JSZip library not loaded");
          }

          const zip = new JSZip();

          // Add files to zip
          Object.entries(fileTree).forEach(([path, content]) => {
            if (path.endsWith("/")) {
              zip.folder(path.slice(0, -1));
            } else {
              const parts = path.split("/");
              const fileName = parts.pop();
              const folderPath = parts.join("/");

              if (folderPath) {
                zip.folder(folderPath).file(fileName, content);
              } else {
                zip.file(fileName, content);
              }
            }
          });

          // Generate zip file
          const content = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 },
          });

          // Download the zip file
          const link = document.createElement("a");
          link.href = URL.createObjectURL(content);
          link.download = `project-${new Date()
            .toISOString()
            .slice(0, 10)}.zip`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(link.href);
        } catch (error) {
          console.error("Export error:", error);
          alert(`Failed to export: ${error.message}`);
        }
      }

      function clearConsole() {
        const consoleDiv = document.getElementById("console");
        if (consoleDiv) {
          consoleDiv.innerHTML = "";
        }
      }

      function toggleConsole() {
        const consoleWrapper = document.getElementById("console-wrapper");
        const divider = document.getElementById("divider");
        const editorContainer = document.getElementById("editor-container");
        const toggleBtn = document.getElementById("toggleConsoleBtn");
        const isCurrentlyResponsive = window.innerWidth <= 900;

        isConsoleVisible = !isConsoleVisible;

        if (isConsoleVisible) {
          consoleWrapper.style.display = "flex";
          divider.style.display = "block";
          toggleBtn.innerHTML = '<i class="ri-eye-off-line"></i> Hide Console';

          if (isCurrentlyResponsive) {
            editorContainer.style.flexBasis = "50%";
            consoleWrapper.style.flexBasis = "50%";
            editorContainer.style.height = "auto";
          } else {
            editorContainer.style.flex = "2";
            consoleWrapper.style.flex = "1";
            editorContainer.style.width = "";
          }
        } else {
          consoleWrapper.style.display = "none";
          divider.style.display = "none";
          toggleBtn.innerHTML = '<i class="ri-eye-line"></i> Show Console';

          if (isCurrentlyResponsive) {
            editorContainer.style.flexBasis = "100%";
            editorContainer.style.height = "calc(100% - 0px)";
          } else {
            editorContainer.style.flex = "1";
            editorContainer.style.width = "100%";
          }
        }
        if (editor) {
          setTimeout(() => editor.layout(), 0);
        }
      }

      const divider = document.getElementById("divider");
      const container = document.querySelector(".container");
      const editorContainer = document.getElementById("editor-container");
      const consoleWrapper = document.getElementById("console-wrapper");
      const fileExplorer = document.getElementById("file-explorer");
      let isDragging = false;
      let activePanel = null;

      const explorerDivider = document.createElement("div");
      explorerDivider.id = "explorer-divider";
      explorerDivider.style.cssText = `
            width: 8px;
            background: #444;
            cursor: col-resize;
            flex-shrink: 0;
            position: relative;
            z-index: 10;
        `;
      if (window.innerWidth > 900) {
        container.insertBefore(explorerDivider, editorContainer);
      }

      divider.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isDragging = true;
        activePanel = "editor";
        const isResponsive = window.innerWidth <= 900;
        document.body.style.cursor = isResponsive ? "row-resize" : "col-resize";
      });

      explorerDivider.addEventListener("mousedown", (e) => {
        e.preventDefault();
        isDragging = true;
        activePanel = "explorer";
        document.body.style.cursor = "col-resize";
      });

      document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const isResponsive = window.innerWidth <= 900;
        const containerRect = container.getBoundingClientRect();

        if (isResponsive) {
          if (activePanel === "editor") {
            let newEditorHeight =
              e.clientY - containerRect.top - fileExplorer.offsetHeight;
            if (newEditorHeight < 50) newEditorHeight = 50;
            editorContainer.style.height = newEditorHeight + "px";
            consoleWrapper.style.height =
              containerRect.height -
              newEditorHeight -
              divider.offsetHeight -
              fileExplorer.offsetHeight +
              "px";
          }
        } else {
          if (activePanel === "explorer") {
            let newExplorerWidth = e.clientX - containerRect.left;
            if (newExplorerWidth < 50) newExplorerWidth = 50;
            if (newExplorerWidth > containerRect.width - 200)
              newExplorerWidth = containerRect.width - 200;
            fileExplorer.style.flex = "none";
            fileExplorer.style.width = newExplorerWidth + "px";
            editorContainer.style.width =
              containerRect.width -
              newExplorerWidth -
              divider.offsetWidth -
              explorerDivider.offsetWidth -
              consoleWrapper.offsetWidth +
              "px";
          } else if (activePanel === "editor") {
            let newEditorWidth =
              e.clientX -
              containerRect.left -
              fileExplorer.offsetWidth -
              explorerDivider.offsetWidth;
            if (newEditorWidth < 100) newEditorWidth = 100;
            if (
              newEditorWidth >
              containerRect.width - 100 - divider.offsetWidth
            ) {
              newEditorWidth = containerRect.width - 100 - divider.offsetWidth;
            }
            editorContainer.style.flex = "none";
            editorContainer.style.width = newEditorWidth + "px";
            consoleWrapper.style.width =
              containerRect.width -
              newEditorWidth -
              divider.offsetWidth -
              fileExplorer.offsetWidth -
              explorerDivider.offsetWidth +
              "px";
          }
        }
        if (editor) {
          editor.layout();
        }
      });

      document.addEventListener("mouseup", () => {
        isDragging = false;
        document.body.style.cursor = "default";
        activePanel = null;
      });

      window.addEventListener("resize", () => {
        if (editor) {
          editor.layout();
        }

        const isCurrentlyResponsive = window.innerWidth <= 900;
        const explorerDividerExists =
          document.getElementById("explorer-divider");

        if (isCurrentlyResponsive) {
          if (explorerDividerExists) {
            explorerDivider.remove();
          }
          editorContainer.style.flex = "";
          editorContainer.style.width = "100%";
          editorContainer.style.height = "auto";
          consoleWrapper.style.flex = "";
          consoleWrapper.style.width = "100%";
          consoleWrapper.style.height = "auto";
          fileExplorer.style.flex = "";
          fileExplorer.style.width = "100%";
          fileExplorer.style.height = "auto";
        } else {
          if (!explorerDividerExists) {
            container.insertBefore(explorerDivider, editorContainer);
          }
          editorContainer.style.flex = "2";
          editorContainer.style.width = "";
          editorContainer.style.height = "100%";
          consoleWrapper.style.flex = "1";
          consoleWrapper.style.width = "";
          consoleWrapper.style.height = "100%";
          fileExplorer.style.flex = "0 0 250px";
          fileExplorer.style.width = "250px";
          fileExplorer.style.height = "100%";
        }
      });

      window.addEventListener("load", async () => {
        try {
          await initDB();
          await loadFromDB().then((data) => {
            if (data) {
              fileTree = data;
              const firstFile = Object.keys(fileTree).find(
                (path) => !path.endsWith("/")
              );
              activeFilePath = firstFile || "";
            } else {
              const initialCode = `// Your initial code here`;
              fileTree = { "main.js": initialCode };
              activeFilePath = "main.js";
              saveToDB();
            }
          });
          await initMonaco();
          updateFileExplorer();
          loadFileContent(activeFilePath);

          // Add the clear database button
          addClearDBButton();
        } catch (error) {
          console.error("Failed to initialize:", error);
        }
      });

      // Add this button in your file controls section
      function addClearDBButton() {
        const fileControls = document.querySelector(".file-controls");
        if (!fileControls) return;

        const clearDBButton = document.createElement("button");
        clearDBButton.innerHTML =
          '<i class="ri-delete-bin-7-line"></i> Clear All';
        clearDBButton.title = "Clear all files and reset database";
        clearDBButton.onclick = clearDatabase;
        fileControls.appendChild(clearDBButton);
      }

      // Add this function to handle database clearing
      async function clearDatabase() {
        if (
          !confirm(
            "Are you sure you want to clear all files? This cannot be undone."
          )
        ) {
          return;
        }

        try {
          // Reset the editor
          editor.setValue("");
          fileTree = {};
          activeFilePath = "";

          // Clear the database
          await resetDB();
          await initDB();
          await saveToDB();

          // Update UI
          updateFileExplorer();

          // Show success message
          const consoleOutput = document.getElementById("console-output");
          if (consoleOutput) {
            consoleOutput.innerHTML +=
              '<div class="console-item"><span class="success">Database cleared successfully!</span></div>';
            consoleOutput.scrollTop = consoleOutput.scrollHeight;
          }
        } catch (error) {
          console.error("Failed to clear database:", error);
          alert("Failed to clear database. Please try again.");
        }
      }

      addClearDBButton();
    