import { app, PerWindowComponent } from "@ophidian/core";
import { parseLinktext } from "obsidian";

import type { HoverEditorParent } from "./popover";
import { isA } from "./utils/misc";

const chatView = '.workspace-leaf-content[data-type="yolo-chat-view"]';
const answerLink = ".yolo-chat-messages-assistant .yolo-markdown-rendered a.internal-link";

function isUnambiguousNote(linktext: string): boolean {
  const { path } = parseLinktext(linktext);
  if (!path || /^(?:[a-z][a-z\d+.-]*:|\/\/|\.{1,2}\/)/i.test(path)) return false;

  // YOLO 在两种渲染阶段取来源笔记的时机不同，只预览无需来源路径也能唯一定位的链接。
  const files = app.metadataCache.getLinkpathDest?.(path, "");
  return files?.length === 1 && files[0].extension === "md";
}

export class YoloLinkHover extends PerWindowComponent {
  private readonly parents = new WeakMap<HTMLElement, HoverEditorParent>();

  onload() {
    this.registerDomEvent(this.win.document, "mouseover", event => this.onMouseOver(event));
  }

  private onMouseOver(event: MouseEvent) {
    // YOLO 自己绑定悬停时会取消默认行为，此时由它发送事件。
    if (event.defaultPrevented || !isA(event.target, Element)) return;

    const targetEl = event.target.closest<HTMLAnchorElement>(answerLink);
    const view = targetEl?.closest<HTMLElement>(chatView);
    if (!targetEl || !view) return;
    if (targetEl.closest('.yolo-assistant-message-metadata, [aria-hidden="true"]')) return;
    if (isA(event.relatedTarget, Node) && targetEl.contains(event.relatedTarget)) return;

    const linktext = targetEl.getAttribute("href");
    if (!linktext || !isUnambiguousNote(linktext)) return;

    let hoverParent = this.parents.get(view);
    if (!hoverParent) {
      hoverParent = { hoverPopover: null, containerEl: view };
      this.parents.set(view, hoverParent);
    }
    app.workspace.trigger("hover-link", {
      event,
      source: "preview",
      hoverParent,
      targetEl,
      linktext,
      sourcePath: "",
    });
  }
}
