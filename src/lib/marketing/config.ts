export const siteConfig = {
  name: "Quire",
  description: "Write beautifully. Compile locally.",
  links: {
    github: "https://github.com/quire/quire",
    twitter: "https://twitter.com/quire_app",
  },
};

export const pricingTiers = [
  {
    name: "Local",
    price: "Free forever",
    description: "Everything you need to write and compile locally.",
    features: ["Local-first architecture", "Open source", "Unlimited builds", "Core LaTeX packages"],
    cta: "Download now",
    href: "/app",
  },
  {
    name: "Cloud",
    price: "Coming soon",
    description: "Cloud sync and collaboration features.",
    features: ["Everything in Local", "Cloud synchronization", "Web-based editor", "Version history"],
    cta: "Join waitlist",
    href: "#",
    disabled: true,
  },
  {
    name: "Team",
    price: "Coming soon",
    description: "For teams and organizations.",
    features: ["Everything in Cloud", "Real-time collaboration", "Custom templates", "Priority support"],
    cta: "Join waitlist",
    href: "#",
    disabled: true,
  },
];

export const faqs = [
  {
    question: "What is Quire?",
    answer: "Quire is a modern, local-first LaTeX editor that lets you write beautifully and compile locally without relying on cloud services.",
  },
  {
    question: "Is it really free?",
    answer: "The local version is free and open-source forever. We plan to offer paid cloud and team features in the future.",
  },
  {
    question: "Do I need an internet connection?",
    answer: "No, Quire compiles everything locally on your machine. You only need internet to download it initially or to use future cloud features.",
  },
];
