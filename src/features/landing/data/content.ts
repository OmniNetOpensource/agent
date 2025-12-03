import {
  Brain,
  Search,
  Link,
  Paperclip,
  Eye,
  Cloud,
  type LucideIcon,
} from "lucide-react";

export type Feature = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const features: Feature[] = [
  {
    icon: Brain,
    title: "Multi-Model AI",
    description: "Access multiple LLM models through OpenRouter integration",
  },
  {
    icon: Search,
    title: "Web Search",
    description: "Real-time web search powered by Brave Search API",
  },
  {
    icon: Link,
    title: "URL Fetching",
    description: "Parse and analyze web content from any URL",
  },
  {
    icon: Paperclip,
    title: "Attachments",
    description: "Upload images, videos, audio, and documents",
  },
  {
    icon: Eye,
    title: "Research Tracking",
    description: "Visible thinking process and tool execution",
  },
  {
    icon: Cloud,
    title: "Cloud Sync",
    description: "Persistent conversation history with cloud storage",
  },
];

export type Step = {
  step: number;
  title: string;
  description: string;
};

export const howItWorks: Step[] = [
  {
    step: 1,
    title: "Start a Conversation",
    description: "Begin by typing your question or request",
  },
  {
    step: 2,
    title: "AI Researches",
    description: "Watch as AI searches the web and analyzes content",
  },
  {
    step: 3,
    title: "See the Process",
    description: "View thinking steps and tool executions in real-time",
  },
  {
    step: 4,
    title: "Get Answers",
    description: "Receive comprehensive, well-researched responses",
  },
];

export type DemoMessage = {
  role: "user" | "assistant";
  content: string;
  thinking?: string;
  toolCall?: {
    name: string;
    status: "searching" | "complete";
  };
};

export const demoMessages: DemoMessage[] = [
  {
    role: "user",
    content: "What are the latest developments in AI?",
  },
  {
    role: "assistant",
    content: "",
    thinking: "Let me search for the latest AI news...",
    toolCall: {
      name: "brave_search",
      status: "searching",
    },
  },
  {
    role: "assistant",
    content:
      "Based on my research, here are the key developments in AI:\n\n1. **Large Language Models** continue to advance with improved reasoning\n2. **Multimodal AI** can now process text, images, and audio together\n3. **AI Agents** are becoming more capable of autonomous tasks",
  },
];

export const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Demo", href: "#demo" },
];
