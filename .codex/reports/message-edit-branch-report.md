# 消息编辑与分支功能实现变更说明

> 说明：此文档记录我在本仓库中做的具体改动、改动位置、以及背后的理由。

## 变更总览
本次改动围绕“消息树 + 编辑/重试 + 分支导航 + 新对话分支”实现，核心目标是：
- 把线性消息列表升级为树形结构，支持同一父节点的多分支。
- 在 UI 中提供编辑、重试、分支切换的操作入口。
- 允许消息编辑后重新发送，截断后续消息，形成新分支。
- **新增“分支为新对话”按钮**，可把当前消息为止的历史另存为新会话。
- 保证 IndexedDB 持久化与旧数据迁移。

以下按文件列出详细变更。

---

## 1) `src/features/chat/store/useChatStore.ts`

### 主要改动
- **新增状态**：`messageTree`、`editingState`。
- **新增 actions**：
  - `startEditing`, `updateEditContent`, `updateEditAttachments`, `cancelEditing`, `submitEdit`
  - `retryFromMessage`
  - `branchToNewConversation`（新对话分支）
  - `getBranchInfo`, `navigateBranch`
  - `initializeTree`, `getMessagesFromPath`
- **改造**：`sendMessage` 不再直接追加到线性 `messages`，而是插入到 `messageTree`，再由 `messageTree.currentPath` 计算当前展示路径。
- **改造**：`appendToAssistant` 直接更新树中当前末尾助手节点。
- **新增工具函数**：
  - `createEmptyMessageTree`, `ensureTreePath`
  - `cloneBlocks`, `cloneResearchItem`
  - `buildUserBlocks`, `insertNode`, `followFirstChildPath`
  - `applyAssistantAddition` 统一处理 research/tool streaming 逻辑
- **请求发送逻辑抽取**：新增 `startChatRequest` 统一处理 SSE、持久化、标题生成。
- **清理逻辑**：`clear` / `setMessages` / `initializeTree` 时释放树内附件的 Blob URL。

### 为什么这么改
- **树结构是分支的基础**：线性数组无法表达多分支，因此 store 改为树结构存储。
- **编辑/重试都需要“截断后续消息并重新发送”**：用 `messageTree.currentPath` 精确控制当前展示路径。
- **新对话分支需要复制当前路径**：`branchToNewConversation` 直接从树路径构造新消息序列。
- **避免逻辑重复**：`startChatRequest` 统一处理 API 调用、SSE 事件、持久化，避免 edit/retry/send 各自复制逻辑。
- **附件内存释放**：树结构比线性多节点，必须在切换会话/清理时统一 revoke。

---

## 2) `src/features/chat/components/message/MessageEditor.tsx`（新增）

### 主要改动
- 新增消息编辑 UI，结构与 Composer 类似：
  - 自动高度 Textarea
  - 附件预览（图片/文件）
  - 添加附件按钮
  - 右上角取消 X
  - 发送按钮（ArrowUp）
- 支持粘贴图片，支持本地上传附件。
- 使用 `useChatStore` 的 `editingState` 及编辑相关 actions。

### 为什么这么改
- **用户体验统一**：复用 Composer 的交互习惯，编辑更自然。
- **编辑必须包含附件**：需要支持新增/删除附件，因此单独组件更清晰。

---

## 3) `src/features/chat/components/message/BranchNavigator.tsx`（新增）

### 主要改动
- 新增 `< 1/3 >` 分支导航组件。
- 接收 `BranchInfo` 和 `onNavigate` 回调。
- `disabled` 状态用于 pending 或不可切换时禁用左右按钮。

### 为什么这么改
- 分支导航是独立 UI 逻辑，组件化便于复用和维护。

---

## 4) `src/features/chat/components/message/MessageItem.tsx`

### 主要改动
- 新增 props：`messageId`, `branchInfo`。
- 新增 UI：
  - 用户消息显示“编辑”按钮（Pencil）
  - 所有消息显示“重试”按钮（RotateCcw）
  - 助手消息显示“分支对话”按钮（GitBranch + 弹确认框）
  - 分支导航显示在消息底部
- 编辑状态下渲染 `MessageEditor` 替代原内容显示。
- 去掉旧的 `BranchButton`/分支对话框逻辑，改为新的 `BranchConversationButton`。

### 为什么这么改
- **编辑/重试是核心交互**，必须紧贴消息本体。
- **“分支对话”保留**，但作为明确的“新会话”操作，避免与树内分支混淆。
- **分支导航与消息节点绑定**，只在有兄弟分支时显示。
- **编辑模式下隐藏工具栏**，避免用户误操作。

---

## 5) `src/features/chat/components/MessageList.tsx`

### 主要改动
- 从 `messageTree.currentPath` 计算 `messageId`。
- 调用 `getBranchInfo(messageId)` 传入 `MessageItem`。
- `key` 使用稳定的 `messageId`。

### 为什么这么改
- 消息显示顺序由树路径控制，必须用树中的 ID 进行定位与分支计算。

---

## 6) `src/features/chat/hooks/useConversationLoader.ts`

### 主要改动
- 加载时优先恢复 `messageTree`。
- 新增树和消息的 hydrate：
  - `hydrateBlocks` / `hydrateMessage`
  - `hydrateTree`
- 旧数据（只有 messages）时：
  - 自动 `migrateMessagesToTree`
  - 同步保存到 IndexedDB
- `initializeTree` 替代 `setMessages`。

### 为什么这么改
- **兼容旧数据**：用户已有对话需要自动迁移。
- **附件恢复**：恢复 `displayUrl`，保证预览正常。

---

## 7) `src/shared/lib/indexed-db/conversations.ts`

### 主要改动
- `LocalConversation` 新增 `messageTree?: MessageTree`。
- `messages` 改为可选（兼容旧数据）。
- `getStats()` 改为统计树节点数优先。

### 为什么这么改
- **持久化树结构**：分支功能必须保存。
- **兼容旧数据**：避免破坏已有 IndexedDB。

---

## 新增/修改的核心逻辑摘要

### 编辑流程（submitEdit）
1. 进入编辑时从目标节点拷贝 blocks。
2. 用户修改内容/附件。
3. 发送后：
   - 新建同级用户节点（同 parent）
   - `currentPath` 截断到新节点
   - 调用 `startChatRequest` 重新生成回复

### 重试流程（retryFromMessage）
1. 确定目标节点在当前路径位置。
2. 若为 assistant，回退到对应的 user 节点。
3. 截断路径后重新请求。

### 树内分支切换（navigateBranch）
1. 获取当前节点的兄弟列表。
2. 切换到目标兄弟。
3. 递归跟随该分支的第一个子节点直到末尾。
4. 更新 `currentPath` 并刷新消息列表。

### 新对话分支（branchToNewConversation）
1. 取当前路径中指定消息及其之前的节点。
2. 生成新的 `conversationId` 与新 `messageTree`。
3. 保存到 IndexedDB 并写入会话列表。
4. 跳转到新对话页面。

---

## 文件清单（快速索引）

- `src/features/chat/store/useChatStore.ts`
- `src/features/chat/components/message/MessageEditor.tsx` (新增)
- `src/features/chat/components/message/BranchNavigator.tsx` (新增)
- `src/features/chat/components/message/MessageItem.tsx`
- `src/features/chat/components/MessageList.tsx`
- `src/features/chat/hooks/useConversationLoader.ts`
- `src/shared/lib/indexed-db/conversations.ts`

---

如需更细的行级 diff 或操作截图，我可以继续补充。
