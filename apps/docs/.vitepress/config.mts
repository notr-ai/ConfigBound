import { defineConfig } from "vitepress";

export default defineConfig({
  title: "ConfigBound",
  description: "Type-safe configuration management for TypeScript.",
  base: "/ConfigBound/",
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: "Tutorials", link: "/tutorials/" },
      { text: "How-to Guides", link: "/how-to/" },
      { text: "Reference", link: "/reference/" },
      { text: "Explanation", link: "/explanation/" }
    ],
    sidebar: {
      "/tutorials/": [
        {
          text: "Tutorials",
          items: [{ text: "Getting Started", link: "/tutorials/getting-started" }]
        }
      ],
      "/how-to/": [
        {
          text: "How-to Guides",
          items: [{ text: "Overview", link: "/how-to/" }]
        },
        {
          text: "Binds",
          items: [
            { text: "EnvVarBind", link: "/how-to/env-var-bind" },
            { text: "FileBind", link: "/how-to/file-bind" },
            { text: "StaticBind", link: "/how-to/static-bind" }
          ]
        },
        {
          text: "Schema",
          items: [
            { text: "Export your configuration schema", link: "/how-to/schema-export" }
          ]
        }
      ],
      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Overview", link: "/reference/" }
          ]
        },
        {
          text: "API: Core",
          items: [
            { text: "ConfigBound", link: "/reference/api/configBound.Class.ConfigBound" },
            { text: "TypedConfigBound", link: "/reference/api/configBound.Class.TypedConfigBound" },
            { text: "Section", link: "/reference/api/section.section.Class.Section" },
            { text: "Element", link: "/reference/api/element.element.Class.Element" }
          ]
        },
        {
          text: "API: Schema Helpers",
          items: [
            { text: "configItem()", link: "/reference/api/configBound.Function.configItem" },
            { text: "configEnum()", link: "/reference/api/configBound.Function.configEnum" },
            { text: "configSection()", link: "/reference/api/configBound.Function.configSection" },
            { text: "ConfigItem", link: "/reference/api/configBound.TypeAlias.ConfigItem" },
            { text: "ConfigSection", link: "/reference/api/configBound.TypeAlias.ConfigSection" },
            { text: "ConfigSchema", link: "/reference/api/configBound.TypeAlias.ConfigSchema" }
          ]
        },
        {
          text: "API: Binds",
          items: [
            { text: "Bind", link: "/reference/api/bind.bind.Class.Bind" },
            { text: "EnvVarBind", link: "/reference/api/bind.binds.envVar.Class.EnvVarBind" },
            { text: "FileBind", link: "/reference/api/bind.binds.file.Class.FileBind" },
            { text: "FileBindOptions", link: "/reference/api/bind.binds.file.Interface.FileBindOptions" },
            { text: "StaticBind", link: "/reference/api/bind.binds.static.Class.StaticBind" }
          ]
        },
        {
          text: "API: Errors",
          items: [
            { text: "ConfigLoaderException", link: "/reference/api/configBound.Class.ConfigLoaderException" },
            { text: "ConfigFileNotFoundException", link: "/reference/api/configBound.Class.ConfigFileNotFoundException" },
            { text: "ConfigFileIsDirectoryException", link: "/reference/api/configBound.Class.ConfigFileIsDirectoryException" },
            { text: "ConfigFileParseException", link: "/reference/api/configBound.Class.ConfigFileParseException" },
            { text: "ExportNotFoundException", link: "/reference/api/configBound.Class.ExportNotFoundException" },
            { text: "MissingDependencyException", link: "/reference/api/configBound.Class.MissingDependencyException" },
            { text: "NoConfigBoundInstancesException", link: "/reference/api/configBound.Class.NoConfigBoundInstancesException" },
            { text: "MultipleConfigBoundInstancesException", link: "/reference/api/configBound.Class.MultipleConfigBoundInstancesException" },
            { text: "InvalidConfigBoundInstanceException", link: "/reference/api/configBound.Class.InvalidConfigBoundInstanceException" }
          ]
        }
      ],
      "/explanation/": [
        {
          text: "Explanation",
          items: [
            { text: "Docs as Code", link: "/explanation/docs-as-code" }, 
            { text: "Schema as the Source of Truth", link: "/explanation/schema-source-of-truth" }
          ]
        }
      ]
    },
    search: {
      provider: "local"
    },
    socialLinks: [{ icon: "github", link: "https://github.com/notr-ai/ConfigBound" }],
    footer: {
      message: "",
      copyright: "Copyright © ConfigBound"
    }
  }
});
