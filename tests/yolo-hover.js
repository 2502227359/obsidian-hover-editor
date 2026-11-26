// 在仓库根目录执行：
// $path = ((Resolve-Path tests/yolo-hover.js).Path -replace '\\', '/') | ConvertTo-Json -Compress
// obsidian vault=CMBK eval "code=await eval(require('fs').readFileSync($path, 'utf8'))"
(async () => {
  const { metadataCache, vault, workspace } = app;
  const files = vault.getMarkdownFiles();
  const safePath = file => !/[#?%]/.test(file.path);
  const note = files.find(safePath);
  const headingNote = files.find(file =>
    safePath(file) && metadataCache.getFileCache(file)?.headings?.some(item => !item.heading.includes("#"))
  );
  const heading = headingNote && metadataCache.getFileCache(headingNote)?.headings?.find(item => !item.heading.includes("#"));
  const blockNote = files.find(file =>
    safePath(file) && Object.keys(metadataCache.getFileCache(file)?.blocks ?? {}).length > 0
  );
  const block = blockNote && Object.keys(metadataCache.getFileCache(blockNote)?.blocks ?? {})[0];
  const duplicate = files.find(file =>
    metadataCache.getLinkpathDest(file.basename, "").filter(item => item.extension === "md").length > 1
  );
  if (!note || !heading || !block || !duplicate) throw Error("库内缺少验收用例所需的笔记");

  const root = document.createElement("div");
  root.className = "workspace-leaf-content";
  root.dataset.type = "yolo-chat-view";
  root.style.cssText = "position:fixed;top:100px;left:40px;z-index:-1";
  const assistant = root.appendChild(document.createElement("div"));
  assistant.className = "yolo-chat-messages-assistant";
  document.body.append(root);
  const received = [];
  const ref = workspace.on("hover-link", data => {
    if (root.contains(data.targetEl)) received.push(data);
  });
  const assert = (condition, name) => {
    if (!condition) throw Error(name);
  };

  function hover(linktext, options = {}) {
    const markdown = document.createElement("div");
    markdown.className = `yolo-markdown-rendered ${options.streaming ? "yolo-streaming-markdown" : ""}`;
    assistant.replaceChildren(markdown);
    if (options.reasoning) markdown.classList.add("yolo-assistant-message-metadata");
    const anchor = markdown.appendChild(document.createElement("a"));
    anchor.href = linktext;
    anchor.className = "internal-link";
    const label = anchor.appendChild(document.createElement("span"));
    label.textContent = "测试链接";
    const rect = label.getBoundingClientRect();
    if (options.handled) anchor.addEventListener("mouseover", event => event.preventDefault());
    received.length = 0;
    label.dispatchEvent(new MouseEvent("mouseover", {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + 2,
      clientY: rect.top + 2,
      ctrlKey: !/Mac/.test(navigator.platform),
      metaKey: /Mac/.test(navigator.platform),
      relatedTarget: options.inside ? anchor : null,
    }));
    return received[0];
  }

  try {
    for (const [name, link, options] of [
      ["流式回答", note.path, { streaming: true }],
      ["已完成回答", note.path, {}],
      ["标题", `${headingNote.path}#${heading.heading}`, {}],
      ["块", `${blockNote.path}#^${block}`, {}],
    ]) {
      const event = hover(link, options);
      assert(received.length === 1 && event.linktext === link, `${name}未发出唯一的 hover-link 事件`);
      assert(event.source === "preview" && event.sourcePath === "", `${name}的页面预览参数不正确`);
      const editor = event.hoverParent.hoverPopover;
      assert(typeof editor?.openLink === "function", `${name}未创建可编辑悬浮窗`);
      try {
        if (link === note.path && !options.streaming) {
          const timeout = Date.now() + 2500;
          while (editor.leaves().every(leaf => leaf.view?.file?.path !== note.path) && Date.now() < timeout) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          assert(editor.leaves().some(leaf => leaf.view?.file?.path === note.path), "悬浮窗未打开目标笔记");
        }
      } finally {
        editor.hide();
      }
    }

    for (const [name, link, options] of [
      ["网页", "https://example.com/", {}],
      ["引用编号", "yolo-cite:1", {}],
      ["相对路径", `./${note.path}`, {}],
      ["同名笔记", duplicate.basename, {}],
      ["已有悬浮处理", note.path, { handled: true }],
      ["链接子元素间移动", note.path, { inside: true }],
      ["思考内容", note.path, { reasoning: true }],
    ]) {
      hover(link, options);
      assert(received.length === 0, `${name}意外触发了悬浮`);
    }
    return "通过：流式和已完成回答、标题、块，以及 7 项排除条件";
  } finally {
    workspace.offref(ref);
    for (const event of received) event.hoverParent.hoverPopover?.hide?.();
    root.remove();
  }
})()
