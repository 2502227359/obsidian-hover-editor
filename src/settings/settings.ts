import { App, PluginSettingTab, Setting, requireApiVersion } from "obsidian";

import HoverEditorPlugin from "../main";
import { parseCssUnitValue } from "../utils/misc";

export interface HoverEditorSettings {
  defaultMode: string;
  autoPin: string;
  triggerDelay: number;
  closeDelay: number;
  autoFocus: boolean;
  rollDown: boolean;
  snapToEdges: boolean;
  initialHeight: string;
  initialWidth: string;
  contentFontSize: string;
  showViewHeader: boolean;
  imageZoom: boolean;
  hoverEmbeds: boolean;
  footnotes: "always" | "never";
  headings: "always" | "never";
  blocks: "always" | "never";
}

export const DEFAULT_SETTINGS: HoverEditorSettings = {
  defaultMode: "preview",
  autoPin: "onMove",
  triggerDelay: 300,
  closeDelay: 600,
  autoFocus: true,
  rollDown: false,
  snapToEdges: false,
  initialHeight: "340px",
  initialWidth: "400px",
  contentFontSize: "inherit",
  showViewHeader: false,
  imageZoom: true,
  hoverEmbeds: false,
  footnotes: requireApiVersion("1.6") ? "never" : "always",
  headings: "always",
  blocks: requireApiVersion("1.6") ? "never" : "always",
};

export const modeOptions = {
  preview: "阅读视图",
  source: "编辑视图",
  match: "跟随当前视图",
};

export const pinOptions = {
  onMove: "拖动或调整大小时",
  always: "始终置顶",
};

export class SettingTab extends PluginSettingTab {
  plugin: HoverEditorPlugin;

  constructor(app: App, plugin: HoverEditorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  hide() {}

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl).setName("默认视图模式").addDropdown(cb => {
      cb.addOptions(modeOptions);
      cb.setValue(this.plugin.settings.defaultMode);
      cb.onChange(async value => {
        this.plugin.settings.defaultMode = value;
        await this.plugin.saveSettings();
      });
    });

    new Setting(containerEl).setName("自动置顶").addDropdown(cb => {
      cb.addOptions(pinOptions);
      cb.setValue(this.plugin.settings.autoPin);
      cb.onChange(value => {
        this.plugin.settings.autoPin = value;
        this.plugin.saveSettings();
      });
    });

    new Setting(containerEl)
      .setName("在嵌入内容上触发悬浮预览")
      .setDesc(
        "鼠标悬停在图片、块引用等任意已渲染的嵌入内容上时，允许触发悬浮预览。",
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.hoverEmbeds).onChange(value => {
          this.plugin.settings.hoverEmbeds = value;
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("在子标题链接上触发悬浮预览")
      .setDesc(
        "打开指向子标题的链接时，使用悬浮编辑器而不是内置预览/编辑器。",
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.headings === "always").onChange(value => {
          this.plugin.settings.headings = value ? "always" : "never";
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("在块链接上触发悬浮预览")
      .setDesc(
        "打开指向块的链接时，使用悬浮编辑器而不是内置预览/编辑器。",
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.blocks === "always").onChange(value => {
          this.plugin.settings.blocks = value ? "always" : "never";
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("在脚注链接上触发悬浮预览")
      .setDesc(
        "打开脚注链接时，使用悬浮编辑器而不是内置预览/编辑器。",
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.footnotes === "always").onChange(value => {
          this.plugin.settings.footnotes = value ? "always" : "never";
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("自动聚焦")
      .setDesc("打开时将悬浮编辑器设为当前活动窗格。")
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.autoFocus).onChange(value => {
          this.plugin.settings.autoFocus = value;
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("向下最小化")
      .setDesc("双击最小化时，窗口向下收起，而不是向上收起。")
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.rollDown).onChange(value => {
          this.plugin.settings.rollDown = value;
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("吸附到屏幕边缘")
      .setDesc(
        `将悬浮窗拖到屏幕边缘可快速排列。拖到左右边缘会纵向最大化，拖到顶部会填满整个屏幕；
        再把悬浮窗拖离边缘即可恢复原始大小。`,
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.snapToEdges).onChange(value => {
          this.plugin.settings.snapToEdges = value;
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("默认显示视图标题栏")
      .setDesc(
        `打开悬浮编辑器时默认显示视图标题栏。
         关闭后，只有点击最小化按钮左侧的标题栏图标才会显示标题栏。`,
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.showViewHeader).onChange(value => {
          this.plugin.settings.showViewHeader = value;
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("点击放大图片")
      .setDesc(
        `在悬浮编辑器中按住图片，可临时将悬浮窗和图片最大化至整个视口。
        松开鼠标后，悬浮编辑器会恢复原始大小。`,
      )
      .addToggle(toggle =>
        toggle.setValue(this.plugin.settings.imageZoom).onChange(value => {
          this.plugin.settings.imageZoom = value;
          this.plugin.saveSettings();
        }),
      );

    new Setting(containerEl)
      .setName("悬浮窗初始宽度")
      .setDesc("可输入任意有效的 CSS 单位。")
      .addText(textfield => {
        textfield.setPlaceholder(this.plugin.settings.initialWidth);
        textfield.inputEl.type = "text";
        textfield.setValue(this.plugin.settings.initialWidth);
        textfield.onChange(async value => {
          value = parseCssUnitValue(value);
          if (!value) value = DEFAULT_SETTINGS.initialWidth;
          this.plugin.settings.initialWidth = value;
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("悬浮窗初始高度")
      .setDesc("可输入任意有效的 CSS 单位。")
      .addText(textfield => {
        textfield.setPlaceholder(String(this.plugin.settings.initialHeight));
        textfield.inputEl.type = "text";
        textfield.setValue(String(this.plugin.settings.initialHeight));
        textfield.onChange(async value => {
          value = parseCssUnitValue(value);
          if (!value) value = DEFAULT_SETTINGS.initialHeight;
          this.plugin.settings.initialHeight = value;
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("悬浮窗正文大小")
      .setDesc("仅影响阅读视图中的正文；留空则继承 Obsidian 或主题的全局字号。")
      .addText(textfield => {
        textfield.setPlaceholder("继承全局字号");
        textfield.inputEl.type = "text";
        textfield.setValue(this.plugin.settings.contentFontSize === "inherit" ? "" : this.plugin.settings.contentFontSize);
        textfield.onChange(value => {
          value = value.trim();
          const fontSize = value ? parseCssUnitValue(value) : "inherit";
          this.plugin.settings.contentFontSize = fontSize || DEFAULT_SETTINGS.contentFontSize;
          this.plugin.activePopovers.forEach(popover => popover.setContentFontSize());
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("悬浮触发延迟（毫秒）")
      .setDesc("鼠标悬停在链接上后，等待多久才显示悬浮编辑器。")
      .addText(textfield => {
        textfield.setPlaceholder(String(this.plugin.settings.triggerDelay));
        textfield.inputEl.type = "number";
        textfield.setValue(String(this.plugin.settings.triggerDelay));
        textfield.onChange(async value => {
          this.plugin.settings.triggerDelay = Number(value);
          this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName("悬浮关闭延迟（毫秒）")
      .setDesc("鼠标离开后，等待多久才关闭悬浮编辑器。")
      .addText(textfield => {
        textfield.setPlaceholder(String(this.plugin.settings.closeDelay));
        textfield.inputEl.type = "number";
        textfield.setValue(String(this.plugin.settings.closeDelay));
        textfield.onChange(async value => {
          this.plugin.settings.closeDelay = Number(value);
          this.plugin.saveSettings();
        });
      });
  }
}
