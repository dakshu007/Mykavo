import { Mail } from "lucide-react";
import {
  DiscordIcon,
  SlackIcon,
  WebhookIcon,
} from "@/components/brand/integration-icons";
import { LogoMark } from "@/components/brand/logo";
import { AlertChannelsAnimation } from "./alert-channels-animation";
import { eyebrow, fontDisplay } from "./style";

/**
 * Alert-channels showcase. From tablet width up it plays the delivery
 * animation (alert-channels-animation.tsx); small screens get the hub above
 * a 2x2 channel grid.
 */

interface Channel {
  key: string;
  name: string;
  desc: string;
  icon: (props: { className?: string }) => React.ReactElement;
}

const CHANNELS: Channel[] = [
  {
    key: "email",
    name: "Email",
    desc: "Grouped digests, gated by severity",
    icon: ({ className }: { className?: string }) => (
      <Mail className={className} strokeWidth={1.8} />
    ),
  },
  {
    key: "slack",
    name: "Slack",
    desc: "Straight into your #alerts channel",
    icon: SlackIcon,
  },
  {
    key: "discord",
    name: "Discord",
    desc: "Pings where your team hangs out",
    icon: DiscordIcon,
  },
  {
    key: "webhook",
    name: "Webhook",
    desc: "Signed JSON to any endpoint",
    icon: WebhookIcon,
  },
];

function ChannelCard({ channel, className = "" }: { channel: Channel; className?: string }) {
  return (
    <div
      className={`flex w-52 items-start gap-3 rounded-2xl border border-[#151515] bg-white p-4 shadow-[4px_4px_0_#151515] ${className}`}
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-black/12 bg-white">
        <channel.icon className="size-[18px] text-[#151515]" />
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold text-[#151515]">{channel.name}</p>
        <p className="mt-0.5 text-[12px] leading-5 text-[#6B6B60]">{channel.desc}</p>
      </div>
    </div>
  );
}

/** The central MyKavo hub node with a soft pulsing gold ring. */
function Hub({ size = "large" }: { size?: "large" | "small" }) {
  const outer = size === "large" ? "size-28" : "size-24";
  const mark = size === "large" ? 52 : 44;
  return (
    <div className={`relative ${outer}`}>
      <span
        aria-hidden
        className="ac-pulse absolute inset-0 rounded-full border-2 border-[#FFD400]"
      />
      <div className="relative flex size-full items-center justify-center rounded-full border border-[#151515] bg-white shadow-[5px_5px_0_#FFD400,5px_5px_0_1px_#151515]">
        <LogoMark size={mark} />
      </div>
    </div>
  );
}

export function AlertChannelsSection() {
  return (
    <section id="alert-channels" className="border-y border-black/10 bg-[#F3F1E6]">
      <style>{`
        @keyframes ac-ring {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.45); opacity: 0; }
        }
        .ac-pulse { animation: ac-ring 2.4s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ac-pulse { animation: none; }
          .ac-pulse { opacity: 0; }
        }
      `}</style>
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <p className={`${eyebrow} mb-4 text-center`}>{"// alert channels //"}</p>
        <h2
          className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl lg:text-[52px]`}
        >
          One alert,
          <br />
          <span className="relative inline-block">
            <span
              aria-hidden
              className="absolute inset-x-[-6px] bottom-[6%] top-[12%] -rotate-1 rounded-md bg-[#FFD400]"
            />
            <span className="relative">wherever you work.</span>
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#6B6B60]">
          When a scan finds something that matters, MyKavo delivers it where your team already
          lives - email, Slack, Discord, or a signed webhook into anything else. Grouped per
          scan, gated by severity, with a send-test button on every channel.
        </p>

        {/* Tablet and desktop: the delivery animation (scan, severity gate,
            grouping, fan-out to each channel). Phones keep the static grid. */}
        <div className="mx-auto mt-14 hidden max-w-5xl md:block">
          <AlertChannelsAnimation />
        </div>

        {/* Small screens: hub above a 2x2 grid */}
        <div className="mt-12 flex flex-col items-center gap-8 md:hidden">
          <Hub size="small" />
          <div className="grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
            {CHANNELS.map((c) => (
              <ChannelCard key={c.key} channel={c} className="w-full" />
            ))}
          </div>
          <p className="text-center font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]">
            critical · high · medium - you choose what gets through
          </p>
        </div>
      </div>
    </section>
  );
}
