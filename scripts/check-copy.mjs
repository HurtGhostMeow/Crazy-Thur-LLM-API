import copy from "../data/crazy-thursday-copy.json" with { type: "json" };

if (!Array.isArray(copy) || copy.length <= 500) throw new Error("文案库必须包含超过 500 条文案。");
if (copy.some((line) => typeof line !== "string" || !line.trim())) throw new Error("文案库不能包含空文案。");
if (new Set(copy).size !== copy.length) throw new Error("文案库不能包含重复文案。");
console.log(`文案库检查通过：${copy.length} 条。`);
