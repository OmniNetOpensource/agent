// 根路径通过 next.config.ts 的 rewrites 映射到 /app
// 保留此文件作为 fallback，以防 rewrite 未生效
export { default } from "./app/page";
