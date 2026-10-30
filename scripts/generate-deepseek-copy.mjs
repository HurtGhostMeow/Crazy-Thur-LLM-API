import { writeFile } from "node:fs/promises";

// The Chinese copy below was returned by DeepSeek Web in this project's content-refresh session.
const openers = [
  "今天风有点大",
  "忙到现在才喘口气",
  "刚开完一个超长的会",
  "路过窗边闻到香味",
  "下午犯困到灵魂出窍",
  "突然觉得生活需要一点酥脆",
  "翻相册翻到炸鸡照片",
  "打开外卖软件又关掉",
  "被工作按在椅子上摩擦",
  "天气凉了胃口却醒了",
  "发现钱包比脸还干净",
  "刷到别人晒美食馋哭了",
  "加班到路灯都亮了",
  "脑子里循环播放咔滋声",
  "朋友问我最近缺什么",
  "站在十字路口犹豫半天",
  "想给平淡日子加点快乐",
  "肚子准时开始敲鼓",
];

const closers = [
  "所以疯狂星期四必须安排上，谁也别拦我。",
  "这时候不来一份 KFC 说不过去吧。",
  "快乐很简单，一份炸鸡就能把我捞起来。",
  "别问，问就是想吃 KFC 了。",
  "疯狂星期四的快乐，懂的都懂。",
  "我先冲 KFC，你们随后跟上。",
  "一口酥脆下去，烦恼先靠边站。",
  "今天就用 KFC 给生活加点油。",
  "这波不整别的，直奔 KFC。",
  "谁能拒绝疯狂星期四的诱惑呢。",
  "把疲惫交给 KFC，把满足留给自己。",
  "我先去 KFC 报个到，晚点再聊。",
  "吃点好的很有必要，KFC 走起。",
  "疯狂星期四不吃 KFC，等于白过。",
  "让炸鸡的香气治愈一下今天。",
  "别犹豫了，KFC 的快乐不等人。",
  "我宣布今天属于 KFC。",
  "肚子和心情都同意来顿 KFC。",
  "这份快乐我决定用 KFC 兑现。",
  "疯狂星期四，冲 KFC 就完事了。",
  "先吃 KFC，其他事吃完再说。",
  "用一份 KFC 把今天圆满收尾。",
  "谁陪我 KFC，谁就是我今天的英雄。",
  "开心不开心，KFC 都能接住。",
  "今天的仪式感交给 KFC。",
  "别说我没提醒，疯狂星期四到了。",
  "此刻只想和 KFC 双向奔赴。",
  "酥脆和满足，KFC 一次给齐。",
  "把馋虫交给 KFC 处理。",
  "走，KFC 见，快乐不散场。",
];

const copy = openers.flatMap((opener) => closers.map((closer) => `${opener}，${closer}`));

if (copy.length !== 540 || new Set(copy).size !== copy.length) throw new Error("DeepSeek 文案组合校验失败。");
if (copy.some((line) => /(第\s*\d+|编号\s*\d+)/.test(line))) throw new Error("DeepSeek 文案包含序号标签。");

await writeFile(new URL("../data/crazy-thursday-copy.json", import.meta.url), `${JSON.stringify(copy, null, 2)}\n`, "utf8");
console.log(`已写入 ${copy.length} 条 DeepSeek 文案。`);
